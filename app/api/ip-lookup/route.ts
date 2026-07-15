import { isIP } from "node:net";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function number(value: unknown) {
  const parsed = Number(String(value ?? "").replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPublicIp(ip: string) {
  const version = isIP(ip);
  if (!version) return false;
  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224);
  }
  const normalized = ip.toLowerCase();
  return !(normalized === "::" || normalized === "::1" || normalized.startsWith("fc") ||
    normalized.startsWith("fd") || /^fe[89ab]/.test(normalized));
}

async function jsonRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Lookup failed (${response.status})`);
  return response.json() as Promise<unknown>;
}

async function lookupDshield(ip: string) {
  const payload = await jsonRequest(`https://isc.sans.edu/api/ip/${encodeURIComponent(ip)}?json`, {
    headers: { "User-Agent": "MalSight IP lookup contact: github.com/maljk-prog/MalSight" },
    next: { revalidate: 3600 },
  });
  const details = record(record(payload).ip || payload);
  const threatFeeds = Object.entries(record(details.threatfeeds)).map(
    ([name, observation]) => {
      const feed = record(observation);
      return {
        name,
        firstSeen: text(feed.firstseen) || null,
        lastSeen: text(feed.lastseen) || null,
      };
    },
  );
  return {
    reports: number(details.count ?? details.reports),
    targets: number(details.attacks ?? details.targets),
    firstSeen: text(details.mindate ?? details.firstseen) || null,
    lastSeen: text(details.maxdate ?? details.maxdata ?? details.lastseen) || null,
    hostname: text(details.hostname) || null,
    network: text(details.network) || null,
    asn: text(details.as) || null,
    asName: text(details.asname) || null,
    countryCode: text(details.country ?? details.ascountry) || null,
    abuseContact: text(details.abusecontact ?? details.asabusecontact) || null,
    comment: text(details.comment) || null,
    threatFeeds,
  };
}

async function lookupGeo(ip: string) {
  const payload = record(await jsonRequest(`https://ipwho.is/${encodeURIComponent(ip)}`, {
    next: { revalidate: 86400 },
  }));
  if (payload.success === false) throw new Error("GeoIP lookup failed");
  const connection = record(payload.connection);
  return {
    country: text(payload.country) || null,
    countryCode: text(payload.country_code) || null,
    region: text(payload.region) || null,
    city: text(payload.city) || null,
    latitude: typeof payload.latitude === "number" ? payload.latitude : null,
    longitude: typeof payload.longitude === "number" ? payload.longitude : null,
    asn: number(connection.asn) || null,
    organization: text(connection.org ?? connection.isp) || null,
    domain: text(connection.domain) || null,
  };
}

async function lookupRdap(ip: string) {
  const payload = record(await jsonRequest(`https://rdap.org/ip/${encodeURIComponent(ip)}`, {
    next: { revalidate: 86400 },
    headers: { Accept: "application/rdap+json, application/json" },
  }));
  return {
    name: text(payload.name) || null,
    handle: text(payload.handle) || null,
    startAddress: text(payload.startAddress) || null,
    endAddress: text(payload.endAddress) || null,
    countryCode: text(payload.country) || null,
    type: text(payload.type) || null,
    port43: text(payload.port43) || null,
  };
}

async function lookupOutpost(ip: string) {
  if (isIP(ip) !== 4) return null;
  const payload = record(await jsonRequest(
    `https://reputation.noc.org/api/?ip=${encodeURIComponent(ip)}`,
    { cache: "no-store" },
  ));
  const reputation = record(payload.reputation);
  const signalLabels: Record<string, string> = {
    web_spam: "Web spam",
    web_attacks: "Web attacks",
    botnet: "Botnet",
    email_spam: "Email spam",
    brute_force: "Brute force",
    ddos: "DDoS",
  };
  const checkedSignals = Object.entries(signalLabels).map(([key, label]) => ({
    key,
    label,
    detected: reputation[key] === true,
  }));
  const detectedSignals = checkedSignals.filter((signal) => signal.detected).map((signal) => signal.label);
  const totalSignals = Object.keys(signalLabels).length;
  return {
    detectedSignals,
    checkedSignals,
    totalSignals,
    signalCoverageScore: Math.round((detectedSignals.length / totalSignals) * 100),
    reverse: text(payload.reverse) || null,
    asn: text(payload.as_number) || null,
    asName: text(payload.as_name) || null,
    country: text(payload.country) || null,
    recommendations: record(payload.recommendations),
  };
}

export async function GET(request: Request) {
  const ip = new URL(request.url).searchParams.get("ip")?.trim() || "";
  if (!isPublicIp(ip)) {
    return Response.json({ error: "Enter a valid public IPv4 or IPv6 address." }, { status: 400 });
  }
  const lookups = await Promise.allSettled([
    lookupDshield(ip), lookupGeo(ip), lookupRdap(ip), lookupOutpost(ip),
  ]);
  const [dshield, geo, rdap, outpost] = lookups;
  const resolved = <T,>(result: PromiseSettledResult<T>) => result.status === "fulfilled" ? result.value : null;
  const dshieldData = resolved(dshield);
  const outpostData = resolved(outpost);
  const geoData = resolved(geo);
  const rdapData = resolved(rdap);
  const identityText = [
    geoData?.organization,
    geoData?.domain,
    dshieldData?.hostname,
    dshieldData?.asName,
    rdapData?.name,
  ].filter(Boolean).join(" ").toLowerCase();
  const knownCrawlerPattern = /\b(censys|shodan|shadowserver|greynoise|internet measurement|research scanner|securitytrails)\b/i;
  const categories = [
    ...(outpostData?.checkedSignals || []).map((signal) => ({
      ...signal,
      source: "Outpost",
    })),
    {
      key: "scanner_probe_activity",
      label: "Scanner / probe activity",
      detected: Boolean(dshieldData && (dshieldData.reports > 0 || dshieldData.targets > 0)),
      source: "DShield",
    },
    {
      key: "known_crawler_identity",
      label: "Known crawler identity",
      detected: knownCrawlerPattern.test(identityText),
      source: "RDAP / GeoIP / DShield",
    },
    {
      key: "threat_feed_association",
      label: "Threat-feed association",
      detected: Boolean(dshieldData?.threatFeeds.length),
      source: "DShield",
    },
    {
      key: "multi_target_activity",
      label: "Multi-target activity",
      detected: Boolean(dshieldData && dshieldData.targets > 1),
      source: "DShield",
    },
  ];
  const detectedCategoryCount = categories.filter((category) => category.detected).length;
  return Response.json({
    searchedAt: new Date().toISOString(), ip,
    assessment: outpostData && outpostData.detectedSignals.length > 0
      ? `Outpost detected ${outpostData.detectedSignals.length} abuse signals`
      : dshieldData && (dshieldData.reports > 0 || dshieldData.targets > 0 || dshieldData.threatFeeds.length > 0)
        ? "Observed in DShield telemetry"
        : "No abuse observations returned by the available sources",
    abuseScore: categories.length ? Math.round((detectedCategoryCount / categories.length) * 100) : null,
    abuseScoreKind: categories.length ? "signal coverage" : null,
    abuseScoreSource: categories.length
      ? `${detectedCategoryCount} of ${categories.length} reputation and telemetry checks detected`
      : null,
    categories,
    dshield: dshieldData, geo: geoData, rdap: rdapData, outpost: outpostData,
    sourceStatus: {
      dshield: dshield.status === "fulfilled" ? "available" : "unavailable",
      geo: geo.status === "fulfilled" ? "available" : "unavailable",
      rdap: rdap.status === "fulfilled" ? "available" : "unavailable",
      outpost: outpost.status === "fulfilled" && outpostData ? "available" : "unavailable",
    },
    warning: "Third-party abuse reports and scanner telemetry may include false positives. Treat this as investigation context, not an automatic blocking decision.",
  });
}
