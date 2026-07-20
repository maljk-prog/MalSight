"use client";

import { useEffect, useMemo, useState } from "react";
import IpAbuseLookup from "./IpAbuseLookup";
import ThreatGlobe from "./ThreatGlobe";

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

type ThreatSource = {
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
  providers: string[];
  categories: string[];
};

type ThreatProvider = {
  name: string;
  url: string;
  status: "available" | "unavailable";
  message: string;
};

type AsnSummary = {
  asn: number | null;
  organization: string;
  attacks: number;
  reports: number;
  ipCount: number;
  countryCount: number;
  countries: string[];
  daysSeen: number;
};

type ThreatMapResponse = {
  updatedAt?: string;
  requestedDays?: number;
  source?: string;
  warning?: string;
  telemetryDates?: string[];
  telemetryWindow?: string;
  totals?: {
    observations: number;
    uniqueIps: number;
    attacks: number;
    reports: number;
  };
  providers?: ThreatProvider[];
  asns?: AsnSummary[];
  countries?: CountrySummary[];
  sources?: ThreatSource[];
};

type GeoJsonFeature = {
  id?: string;
  properties?: {
    name?: string;
  };
  geometry?: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

type GeoJsonCollection = {
  features?: GeoJsonFeature[];
};

const WORLD_ATLAS_URL =
  "https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json";

const TIMEFRAMES = [
  { id: "24h", label: "24 hours", title: "Last 24 hours" },
  { id: "3d", label: "3 days", title: "Last 3 days" },
  { id: "7d", label: "7 days", title: "Last 7 days" },
  { id: "30d", label: "30 days", title: "Last 30 days" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function summarizeCountries(sources: ThreatSource[]): CountrySummary[] {
  const map = new Map<string, CountrySummary>();
  sources.forEach((source) => {
    const item = map.get(source.countryCode) || {
      country: source.country, countryCode: source.countryCode, attacks: 0, reports: 0,
      ipCount: 0, daysSeen: 0, latitude: 0, longitude: 0,
    };
    item.attacks += source.attacks; item.reports += source.reports; item.ipCount += 1;
    item.daysSeen += source.daysSeen; item.latitude += source.latitude; item.longitude += source.longitude;
    map.set(source.countryCode, item);
  });
  return Array.from(map.values()).map((item) => ({ ...item, latitude: item.latitude / item.ipCount,
    longitude: item.longitude / item.ipCount })).sort((a, b) => b.attacks - a.attacks);
}

function summarizeAsns(sources: ThreatSource[]): AsnSummary[] {
  const map = new Map<string, AsnSummary>();
  sources.forEach((source) => {
    const key = source.asn ? `AS${source.asn}` : source.organization;
    const item = map.get(key) || { asn: source.asn, organization: source.organization,
      attacks: 0, reports: 0, ipCount: 0, countryCount: 0, countries: [], daysSeen: 0 };
    item.attacks += source.attacks; item.reports += source.reports; item.ipCount += 1; item.daysSeen += source.daysSeen;
    if (!item.countries.includes(source.country)) item.countries.push(source.country);
    item.countryCount = item.countries.length; map.set(key, item);
  });
  return Array.from(map.values()).sort((a, b) => b.attacks - a.attacks);
}

export default function ThreatMap() {
  const [data, setData] = useState<ThreatMapResponse | null>(null);
  const [mapFeatures, setMapFeatures] = useState<GeoJsonFeature[]>([]);
  const [timeframe, setTimeframe] = useState("3d");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    setStatus("loading");
    fetch(`/api/threat-map?timeframe=${timeframe}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Threat map request failed");
        }

        return response.json() as Promise<ThreatMapResponse>;
      })
      .then((payload) => {
        setData(payload);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [timeframe]);

  useEffect(() => {
    fetch(WORLD_ATLAS_URL)
      .then((response) => response.json() as Promise<GeoJsonCollection>)
      .then((payload) => setMapFeatures(payload.features || []))
      .catch(() => setMapFeatures([]));
  }, []);

  const allSources = data?.sources || [];
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allSources.forEach((source) => source.categories.forEach((category) =>
      counts.set(category, (counts.get(category) || 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [allSources]);
  const sources = useMemo(() => selectedCategories.length
    ? allSources.filter((source) => selectedCategories.some((category) => source.categories.includes(category)))
    : allSources, [allSources, selectedCategories]);
  const countries = useMemo(() => summarizeCountries(sources), [sources]);
  const asns = useMemo(() => summarizeAsns(sources), [sources]);
  const topAsn = asns[0];
  const activeTimeframe =
    TIMEFRAMES.find((item) => item.id === timeframe) || TIMEFRAMES[1];
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.3em] text-[#3F6B5A]">
            GLOBAL THREAT MAP
          </p>
          <h2 className="mt-2 text-3xl font-black">
            {activeTimeframe.title} public attack heatmap
          </h2>
          <p className="mt-2 max-w-3xl text-[#466357]">
            Top globally reported source IPs from public intelligence feeds,
            enriched with GeoIP and plotted on a real world atlas.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap justify-start gap-2 md:justify-end">
            {TIMEFRAMES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTimeframe(item.id)}
                className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                  timeframe === item.id
                    ? "border-[#3F6B5A] bg-[#3F6B5A] text-white"
                    : "border-[#8DA99B] bg-white/55 text-[#243B32] hover:bg-white/80"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-sm font-semibold text-[#243B32]">
            <div className="rounded-2xl bg-white/60 p-3 [container-type:inline-size]">
              <p className="text-[clamp(1.05rem,20cqw,1.75rem)] font-black leading-none">
                {formatNumber(data?.totals?.observations || 0)}
              </p>
              <p>Observations</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 [container-type:inline-size]">
              <p className="text-[clamp(1.05rem,20cqw,1.75rem)] font-black leading-none">
                {formatNumber(data?.totals?.uniqueIps || 0)}
              </p>
              <p>Unique IPs</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 [container-type:inline-size]">
              <p className="text-[clamp(1.05rem,20cqw,1.75rem)] font-black leading-none">
                {formatNumber(data?.totals?.attacks || 0)}
              </p>
              <p>Attacks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
        {status === "loading" && (
          <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
            Loading global threat telemetry...
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
            Threat telemetry is temporarily unavailable. Try refreshing the
            dashboard.
          </div>
        )}

        {status === "ready" && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Threat signal filters">
              <button
                type="button"
                onClick={() => setSelectedCategories([])}
                className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                  selectedCategories.length === 0
                    ? "border-[#3F6B5A] bg-[#3F6B5A] text-white"
                    : "border-[#8DA99B] bg-white/60 text-[#3F6B5A]"
                }`}
              >
                All signals · {allSources.length}
              </button>
              {categoryCounts.map(([category, count]) => {
                const active = selectedCategories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedCategories((current) => active
                      ? current.filter((item) => item !== category)
                      : [...current, category])}
                    className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                      active
                        ? "border-[#3F6B5A] bg-[#73E2A7] text-[#13231D]"
                        : "border-[#8DA99B] bg-white/60 text-[#3F6B5A] hover:bg-white"
                    }`}
                  >
                    {category} · {count}
                  </button>
                );
              })}
            </div>
            <ThreatGlobe
              features={mapFeatures}
              sources={sources}
              countries={countries}
            />

            <p className="mt-3 text-sm font-semibold text-[#466357]">
              Drag to rotate the earth and scroll to zoom. Hotspots and moving
              pulses are derived from the same enriched public-feed source IPs
              listed below. Pulses show observed source activity, not invented
              source-to-destination routes. Headline totals include every
              record loaded from the available feeds; map markers require a
              successful GeoIP lookup.
            </p>

            <div className="mt-4 rounded-xl border border-[#D6C89B]/60 bg-[#FFF3B0]/20 p-3 text-xs font-semibold leading-relaxed text-[#5B4B22]">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <p>{data?.source}</p>
                <p>{data?.telemetryWindow}</p>
                {data?.updatedAt && (
                  <p>
                    Updated{" "}
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(data.updatedAt))}
                  </p>
                )}
              </div>
              {data?.warning && <p className="mt-1">{data.warning}</p>}
              {data?.providers && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.providers.map((provider) => (
                    <a
                      key={provider.name}
                      href={provider.url}
                      target="_blank"
                      rel="noreferrer"
                      title={provider.message}
                      className={`rounded-full border px-2 py-1 ${
                        provider.status === "available"
                          ? "border-[#8DA99B] bg-white/50 text-[#3F6B5A]"
                          : "border-[#C98D7B] bg-[#F8D7CF]/40 text-[#7A382B]"
                      }`}
                    >
                      {provider.name}: {provider.status}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {status === "ready" && (
        <>
          <IpAbuseLookup />

          <div className="mt-6 rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-bold tracking-[0.24em] text-[#3F6B5A]">
                  MOST ABUSED ASN ({activeTimeframe.title})
                </p>
                <h3 className="mt-2 text-2xl font-black text-[#243B32]">
                  {topAsn
                    ? topAsn.asn
                      ? `AS${topAsn.asn}`
                      : "Unknown ASN"
                    : "ASN enrichment unavailable"}
                </h3>
                <p className="mt-1 max-w-3xl text-sm font-semibold text-[#466357]">
                  {topAsn
                    ? topAsn.organization
                    : sources.length > 0
                      ? "GeoIP enrichment returned source locations, but no usable network ownership data for this timeframe."
                      : "No source-IP telemetry is available for this timeframe."}
                </p>
              </div>

              {topAsn && (
                <div className="grid grid-cols-2 gap-3 text-sm font-semibold text-[#243B32] md:grid-cols-3">
                  <div className="rounded-xl bg-[#E6E4DE]/80 p-3">
                    <p className="text-2xl font-black">
                      {formatNumber(topAsn.attacks)}
                    </p>
                    <p>Attacks</p>
                  </div>
                  <div className="rounded-xl bg-[#E6E4DE]/80 p-3">
                    <p className="text-2xl font-black">
                      {formatNumber(topAsn.ipCount)}
                    </p>
                    <p>Source IPs</p>
                  </div>
                  <div className="rounded-xl bg-[#E6E4DE]/80 p-3">
                    <p className="text-2xl font-black">
                      {formatNumber(topAsn.countryCount)}
                    </p>
                    <p>Countries</p>
                  </div>
                </div>
              )}
            </div>

            {asns.length > 0 && (
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {asns.slice(0, 3).map((asn) => (
                  <div
                    key={`${asn.asn || "unknown"}-${asn.organization}`}
                    className="rounded-xl bg-[#E6E4DE] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#243B32]">
                          {asn.asn ? `AS${asn.asn}` : "Unknown ASN"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#466357]">
                          {asn.organization}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-[#3F6B5A]">
                        {formatNumber(asn.attacks)}
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-[#466357]">
                      {asn.ipCount} IPs across {asn.countryCount} countries
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
            <h3 className="text-xl font-black text-[#243B32]">
              Top countries ({activeTimeframe.title})
            </h3>
            <div className="mt-4 space-y-3">
              {countries.slice(0, 10).map((country) => (
                <div
                  key={country.countryCode}
                  className="rounded-xl bg-[#E6E4DE] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-[#243B32]">
                      {country.country}
                    </p>
                    <p className="text-sm font-bold text-[#3F6B5A]">
                      {formatNumber(country.attacks)} attacks
                    </p>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#466357]">
                    {country.ipCount} source IPs,{" "}
                    {formatNumber(country.reports)} reports
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
            <h3 className="text-xl font-black text-[#243B32]">
              Top source IPs ({activeTimeframe.title})
            </h3>
            <div className="mt-4 space-y-3">
              {sources.slice(0, 10).map((source) => (
                <div key={source.ip} className="rounded-xl bg-[#E6E4DE] p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <span className="font-mono font-black text-[#3F6B5A]">
                        {source.ip}
                      </span>
                      <p className="mt-1 text-sm font-semibold text-[#466357]">
                        {source.city}, {source.country}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#3F6B5A]">
                      {formatNumber(source.attacks)} attacks
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-[#466357]">
                    {source.organization}
                    {source.asn ? `, ASN ${source.asn}` : ""}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#466357]">
                    Last reported {source.lastSeen}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#466357]">
                    Seen by {source.providers.join(", ")}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#3F6B5A]">
                    {source.categories.join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
          </div>
        </>
      )}
    </div>
  );
}
