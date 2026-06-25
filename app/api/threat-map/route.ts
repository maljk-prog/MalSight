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
  daysSeen: number;
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
  daysSeen: number;
  latitude: number;
  longitude: number;
};

type AggregatedSource = DShieldSource & {
  attacks: number;
  count: number;
  daysSeen: number;
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
  const populatedDays: { date: string; sources: DShieldSource[] }[] = [];

  for (const date of Array.from({ length: 7 }, (_, index) =>
    dateDaysAgo(index),
  )) {
    const sources = await fetchDShieldSourcesForDate(date);

    if (sources.length > 0) {
      populatedDays.push({ date, sources });
    }

    if (populatedDays.length === 3) {
      break;
    }
  }

  return {
    dates: populatedDays.map((day) => day.date),
    sources: aggregateSources(populatedDays),
  };
}

function aggregateSources(
  days: { date: string; sources: DShieldSource[] }[],
): AggregatedSource[] {
  const sources = new Map<string, AggregatedSource>();

  days.forEach(({ sources: daySources }) => {
    daySources.forEach((source) => {
      const current =
        sources.get(source.ip) ||
        ({
          ...source,
          attacks: 0,
          count: 0,
          daysSeen: 0,
        } satisfies AggregatedSource);

      current.attacks += toNumber(source.attacks);
      current.count += toNumber(source.count);
      current.daysSeen += 1;
      current.firstseen =
        source.firstseen < current.firstseen ? source.firstseen : current.firstseen;
      current.lastseen =
        source.lastseen > current.lastseen ? source.lastseen : current.lastseen;
      sources.set(source.ip, current);
    });
  });

  return Array.from(sources.values()).sort((a, b) => b.attacks - a.attacks);
}

async function geolocateSource(source: AggregatedSource) {
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
    attacks: source.attacks,
    reports: source.count,
    daysSeen: source.daysSeen,
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
      daysSeen: 0,
      latitude: 0,
      longitude: 0,
      } satisfies CountrySummary);

    current.attacks += source.attacks;
    current.reports += source.reports;
    current.ipCount += 1;
    current.daysSeen += source.daysSeen;
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
  const { dates, sources } = await fetchDShieldSources();
  const enriched = (
    await Promise.all(sources.slice(0, 100).map((source) => geolocateSource(source)))
  )
    .filter((source): source is EnrichedSource => Boolean(source))
    .sort((a, b) => b.attacks - a.attacks);
  const topSources = enriched.slice(0, 50);

  return Response.json({
    updatedAt: new Date().toISOString(),
    source:
      "SANS Internet Storm Center / DShield top source IP telemetry enriched with GeoIP coordinates",
    sourceUrl: "https://isc.sans.edu/api/",
    telemetryDates: dates,
    telemetryWindow:
      dates.length > 0
        ? `${dates[dates.length - 1]} through ${dates[0]}`
        : "No populated DShield days available",
    geoIpSource: "ipwho.is",
    warning:
      "DShield source-IP summaries are public telemetry and may include false positives. Do not use this as a blocklist.",
    countries: aggregateCountries(topSources),
    sources: topSources,
  });
}
