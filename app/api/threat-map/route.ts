export const revalidate = 86400;
export const dynamic = "force-dynamic";

type Observation = {
  ip: string; attacks: number; reports: number; firstSeen: string; lastSeen: string;
  daysSeen: number; providers: string[]; categories: string[];
};
type ProviderResult = {
  name: string; url: string; observations: Observation[]; dates: string[];
  status: "available" | "unavailable"; message: string;
};
type GeoIpResponse = {
  success: boolean; country?: string; country_code?: string; city?: string;
  latitude?: number; longitude?: number;
  connection?: { asn?: number; org?: string; isp?: string };
};
type EnrichedSource = Observation & {
  country: string; countryCode: string; city: string; latitude: number; longitude: number;
  asn: number | null; organization: string;
};

const DAY_SECONDS = 86400;
const FETCH_TIMEOUT_MS = 8000;
const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function dateDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function isPublicIpv4(value: string) {
  if (!IPV4_RE.test(value)) return false;
  const p = value.split(".").map(Number);
  if (p.some((part) => part < 0 || part > 255)) return false;
  return !(p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 ||
    (p[0] === 169 && p[1] === 254) || (p[0] === 192 && p[1] === 168) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31));
}

async function fetchTimed(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    next: { revalidate: DAY_SECONDS },
  });
}

function observation(ip: string, provider: string, category: string, firstSeen = dateDaysAgo(0), lastSeen = firstSeen,
  attacks = 1, reports = 1): Observation {
  return { ip, attacks, reports, firstSeen, lastSeen, daysSeen: 1, providers: [provider], categories: [category] };
}

async function fetchDShieldDay(date: string) {
  const response = await fetchTimed(`https://isc.sans.edu/api/sources/attacks/75/${date}?json`, {
    headers: { "User-Agent": "MalSight threat map contact: github.com/maljk-prog/MalSight" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : payload?.value;
  if (!Array.isArray(rows)) throw new Error("Malformed response");
  return rows.filter((row) => isPublicIpv4(String(row.ip || ""))).map((row) =>
    observation(String(row.ip), "SANS ISC DShield", "Scanning", String(row.firstseen || date),
      String(row.lastseen || date), Number(String(row.attacks || 0).replace(/,/g, "")) || 0,
      Number(String(row.count || 0).replace(/,/g, "")) || 0));
}

async function fetchDShield(requestedDays: number): Promise<ProviderResult> {
  const dates = Array.from({ length: requestedDays }, (_, index) => dateDaysAgo(index));
  const settled = await Promise.allSettled(dates.map(async (date) => ({ date, rows: await fetchDShieldDay(date) })));
  const days = settled.flatMap((result) => result.status === "fulfilled" && result.value.rows.length ? [result.value] : []);
  return {
    name: "SANS ISC DShield", url: "https://isc.sans.edu/api/", dates: days.map((day) => day.date),
    observations: days.flatMap((day) => day.rows), status: days.length ? "available" : "unavailable",
    message: days.length ? `${days.length} of ${dates.length} daily snapshots loaded` : "No daily snapshots reachable",
  };
}

async function fetchPlainFeed(name: string, category: string, url: string): Promise<ProviderResult> {
  try {
    const response = await fetchTimed(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const observations = (await response.text()).split(/\r?\n/).map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && isPublicIpv4(line)).slice(0, 5000)
      .map((ip) => observation(ip, name, category));
    if (!observations.length) throw new Error("Empty or malformed response");
    return { name, url, observations, dates: [dateDaysAgo(0)], status: "available",
      message: `${observations.length} current IP observations loaded` };
  } catch (error) {
    return { name, url, observations: [], dates: [], status: "unavailable",
      message: error instanceof Error ? error.message : "Request failed" };
  }
}

async function fetchFeodo(): Promise<ProviderResult> {
  const name = "abuse.ch Feodo Tracker";
  const url = "https://feodotracker.abuse.ch/downloads/ipblocklist.csv";
  try {
    const response = await fetchTimed(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const observations = (await response.text()).split(/\r?\n/).map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#")).flatMap((line) => {
        const cells = line.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim());
        const ip = cells.find(isPublicIpv4);
        if (!ip) return [];
        const dates = cells.filter((cell) => /^\d{4}-\d{2}-\d{2}/.test(cell));
        return [observation(ip, name, "Botnet C2", dates[0], dates.at(-1) || dates[0])];
      });
    if (!observations.length) throw new Error("Empty or malformed response");
    return { name, url, observations, dates: [dateDaysAgo(0)], status: "available",
      message: `${observations.length} current botnet C2 observations loaded` };
  } catch (error) {
    return { name, url, observations: [], dates: [], status: "unavailable",
      message: error instanceof Error ? error.message : "Request failed" };
  }
}

function merge(results: ProviderResult[]) {
  const byIp = new Map<string, Observation>();
  results.flatMap((result) => result.observations).forEach((item) => {
    const current = byIp.get(item.ip);
    if (!current) return void byIp.set(item.ip, { ...item });
    current.attacks += item.attacks; current.reports += item.reports;
    current.firstSeen = item.firstSeen < current.firstSeen ? item.firstSeen : current.firstSeen;
    current.lastSeen = item.lastSeen > current.lastSeen ? item.lastSeen : current.lastSeen;
    if (!current.providers.includes(item.providers[0])) current.providers.push(item.providers[0]);
    item.categories.forEach((category) => {
      if (!current.categories.includes(category)) current.categories.push(category);
    });
    if (item.providers[0] === "SANS ISC DShield") current.daysSeen += 1;
  });
  return byIp;
}

function selectBalanced(results: ProviderResult[], limit = 100) {
  const byIp = merge(results);
  const selected = new Set<string>();
  const quota = Math.max(15, Math.floor(limit / results.length));
  results.forEach((result) => result.observations.sort((a, b) => b.attacks - a.attacks)
    .slice(0, quota).forEach((item) => selected.add(item.ip)));
  Array.from(byIp.values()).sort((a, b) => b.providers.length - a.providers.length || b.attacks - a.attacks)
    .forEach((item) => { if (selected.size < limit) selected.add(item.ip); });
  return Array.from(selected).slice(0, limit).flatMap((ip) => byIp.get(ip) || []);
}

async function geolocate(source: Observation): Promise<EnrichedSource | null> {
  try {
    const response = await fetchTimed(`https://ipwho.is/${source.ip}`);
    if (!response.ok) return null;
    const geo = await response.json() as GeoIpResponse;
    if (!geo.success || typeof geo.latitude !== "number" || typeof geo.longitude !== "number") return null;
    return { ...source, country: geo.country || "Unknown", countryCode: geo.country_code || "??",
      city: geo.city || "Unknown city", latitude: geo.latitude, longitude: geo.longitude,
      asn: geo.connection?.asn || null, organization: geo.connection?.org || geo.connection?.isp || "Unknown" };
  } catch { return null; }
}

function aggregateCountries(sources: EnrichedSource[]) {
  const map = new Map<string, { country: string; countryCode: string; attacks: number; reports: number;
    ipCount: number; daysSeen: number; latitude: number; longitude: number }>();
  sources.forEach((source) => {
    const item = map.get(source.countryCode) || { country: source.country, countryCode: source.countryCode,
      attacks: 0, reports: 0, ipCount: 0, daysSeen: 0, latitude: 0, longitude: 0 };
    item.attacks += source.attacks; item.reports += source.reports; item.ipCount += 1;
    item.daysSeen += source.daysSeen; item.latitude += source.latitude; item.longitude += source.longitude;
    map.set(source.countryCode, item);
  });
  return Array.from(map.values()).map((item) => ({ ...item, latitude: item.latitude / item.ipCount,
    longitude: item.longitude / item.ipCount })).sort((a, b) => b.attacks - a.attacks);
}

function aggregateAsns(sources: EnrichedSource[]) {
  const map = new Map<string, { asn: number | null; organization: string; attacks: number; reports: number;
    ipCount: number; countryCount: number; countries: string[]; daysSeen: number }>();
  sources.forEach((source) => {
    const key = source.asn ? `AS${source.asn}` : source.organization;
    const item = map.get(key) || { asn: source.asn, organization: source.organization, attacks: 0,
      reports: 0, ipCount: 0, countryCount: 0, countries: [], daysSeen: 0 };
    item.attacks += source.attacks; item.reports += source.reports; item.ipCount += 1; item.daysSeen += source.daysSeen;
    if (!item.countries.includes(source.country)) item.countries.push(source.country);
    item.countryCount = item.countries.length; map.set(key, item);
  });
  return Array.from(map.values()).sort((a, b) => b.attacks - a.attacks);
}

export async function GET(request: Request) {
  const timeframe = new URL(request.url).searchParams.get("timeframe") || "3d";
  const requestedDays = ({ "24h": 1, "3d": 3, "7d": 7, "30d": 30 } as Record<string, number>)[timeframe] || 3;
  const providers = await Promise.all([
    fetchDShield(requestedDays),
    fetchPlainFeed("Emerging Threats", "Compromised Host", "https://rules.emergingthreats.net/blockrules/compromised-ips.txt"),
    fetchPlainFeed("blocklist.de", "Abuse Activity", "https://lists.blocklist.de/lists/all.txt"),
    fetchFeodo(),
  ]);
  const enriched = (await Promise.all(selectBalanced(providers).map(geolocate)))
    .filter((item): item is EnrichedSource => Boolean(item))
    .sort((a, b) => b.providers.length - a.providers.length || b.attacks - a.attacks);
  const dshieldDates = providers[0].dates;
  return Response.json({
    updatedAt: new Date().toISOString(), requestedDays,
    source: `${providers.filter((item) => item.status === "available").length} of ${providers.length} public intelligence feeds available`,
    providers: providers.map(({ name, url, status, message }) => ({ name, url, status, message })),
    telemetryDates: dshieldDates,
    telemetryWindow: dshieldDates.length ? `${dshieldDates.at(-1)} through ${dshieldDates[0]} (DShield); other feeds are current snapshots`
      : "Current feed snapshots; DShield daily telemetry unavailable",
    geoIpSource: "ipwho.is",
    warning: "Public feeds may include false positives. Counts combine DShield attack telemetry with one observation per list-based feed; do not use this as a blocklist.",
    asns: aggregateAsns(enriched), countries: aggregateCountries(enriched), sources: enriched,
  });
}
