export const revalidate = 86400;
export const dynamic = "force-dynamic";

type DShieldSource = {
  ip: string;
  attacks: number | string;
  count: number | string;
  firstseen: string;
  lastseen: string;
};

type GeoIpResponse = {
  success: boolean;
  ip: string;
  country?: string;
  country_code?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  connection?: {
    asn?: number;
    org?: string;
    isp?: string;
  };
};

type EnrichedSource = {
  ip: string;
  attacks: number;
  reports: number;
  firstSeen: string;
  lastSeen: string;
  country: string;
  countryCode: string;
  city: string;
  latitude: number;
  longitude: number;
  asn: number | null;
  organization: string;
};

type CountrySummary = {
  country: string;
  countryCode: string;
  attacks: number;
  reports: number;
  ipCount: number;
  latitude: number;
  longitude: number;
};

function dateDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function toNumber(value: number | string) {
  if (typeof value === "number") return value;
  return Number(value.toString().replace(/,/g, "")) || 0;
}

async function fetchDShieldSourcesForDate(date: string) {
  const response = await fetch(
    `https://isc.sans.edu/api/sources/attacks/75/${date}?json`,
    {
      headers: {
        "User-Agent":
          "MalSight local dashboard contact: github.com/maljk-prog/MalSight",
      },
      next: { revalidate: 86400 },
    },
  );

  if (!response.ok) {
    throw new Error("DShield telemetry request failed");
  }

  const data = (await response.json()) as DShieldSource[] | { value?: DShieldSource[] };
  return Array.isArray(data) ? data : data.value || [];
}

async function fetchDShieldSources() {
  for (const date of [dateDaysAgo(0), dateDaysAgo(1), dateDaysAgo(2)]) {
    const sources = await fetchDShieldSourcesForDate(date);

    if (sources.length > 0) {
      return { date, sources };
    }
  }

  return { date: dateDaysAgo(0), sources: [] };
}

async function geolocateSource(source: DShieldSource) {
  const response = await fetch(`https://ipwho.is/${source.ip}`, {
    next: { revalidate: 86400 },
  });

  if (!response.ok) return null;

  const geo = (await response.json()) as GeoIpResponse;

  if (
    !geo.success ||
    typeof geo.latitude !== "number" ||
    typeof geo.longitude !== "number"
  ) {
    return null;
  }

  return {
    ip: source.ip,
    attacks: toNumber(source.attacks),
    reports: toNumber(source.count),
    firstSeen: source.firstseen,
    lastSeen: source.lastseen,
    country: geo.country || "Unknown",
    countryCode: geo.country_code || "??",
    city: geo.city || "Unknown city",
    latitude: geo.latitude,
    longitude: geo.longitude,
    asn: geo.connection?.asn || null,
    organization: geo.connection?.org || geo.connection?.isp || "Unknown",
  } satisfies EnrichedSource;
}

function aggregateCountries(sources: EnrichedSource[]) {
  const countries = new Map<string, CountrySummary>();

  sources.forEach((source) => {
    const key = source.countryCode;
    const current =
      countries.get(key) ||
      ({
        country: source.country,
        countryCode: source.countryCode,
        attacks: 0,
        reports: 0,
        ipCount: 0,
        latitude: 0,
        longitude: 0,
      } satisfies CountrySummary);

    current.attacks += source.attacks;
    current.reports += source.reports;
    current.ipCount += 1;
    current.latitude += source.latitude;
    current.longitude += source.longitude;
    countries.set(key, current);
  });

  return Array.from(countries.values())
    .map((country) => ({
      ...country,
      latitude: country.latitude / country.ipCount,
      longitude: country.longitude / country.ipCount,
    }))
    .sort((a, b) => b.attacks - a.attacks);
}

export async function GET() {
  const { date, sources } = await fetchDShieldSources();
  const enriched = (
    await Promise.all(sources.map((source) => geolocateSource(source)))
  )
    .filter((source): source is EnrichedSource => Boolean(source))
    .sort((a, b) => b.attacks - a.attacks);
  const topSources = enriched.slice(0, 50);

  return Response.json({
    updatedAt: new Date().toISOString(),
    source:
      "SANS Internet Storm Center / DShield top source IP telemetry enriched with GeoIP coordinates",
    sourceUrl: "https://isc.sans.edu/api/",
    telemetryDate: date,
    geoIpSource: "ipwho.is",
    warning:
      "DShield source-IP summaries are public telemetry and may include false positives. Do not use this as a blocklist.",
    countries: aggregateCountries(topSources),
    sources: topSources,
  });
}
