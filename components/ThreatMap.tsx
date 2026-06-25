"use client";

import { useEffect, useMemo, useState } from "react";

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
};

type ThreatMapResponse = {
  updatedAt?: string;
  source?: string;
  warning?: string;
  telemetryDates?: string[];
  telemetryWindow?: string;
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

function project(longitude: number, latitude: number) {
  return {
    x: ((longitude + 180) / 360) * 1000,
    y: ((83 - latitude) / 166) * 520,
  };
}

function polygonToPath(rings: number[][][]) {
  return rings
    .map((ring) =>
      ring
        .map(([longitude, latitude], index) => {
          const point = project(longitude, latitude);
          return `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
        })
        .join(" ")
        .concat(" Z"),
    )
    .join(" ");
}

function featureToPath(feature: GeoJsonFeature) {
  if (!feature.geometry) return "";

  if (feature.geometry.type === "Polygon") {
    return polygonToPath(feature.geometry.coordinates as number[][][]);
  }

  return (feature.geometry.coordinates as number[][][][])
    .map((polygon) => polygonToPath(polygon))
    .join(" ");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

export default function ThreatMap() {
  const [data, setData] = useState<ThreatMapResponse | null>(null);
  const [mapFeatures, setMapFeatures] = useState<GeoJsonFeature[]>([]);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 500, y: 260 });
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    fetch("/api/threat-map")
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
  }, []);

  useEffect(() => {
    fetch(WORLD_ATLAS_URL)
      .then((response) => response.json() as Promise<GeoJsonCollection>)
      .then((payload) => setMapFeatures(payload.features || []))
      .catch(() => setMapFeatures([]));
  }, []);

  const countries = data?.countries || [];
  const sources = data?.sources || [];
  const maxAttacks = Math.max(...countries.map((country) => country.attacks), 1);
  const maxSourceAttacks = Math.max(
    ...sources.map((source) => source.attacks),
    1,
  );
  const viewWidth = 1000 / zoom;
  const viewHeight = 520 / zoom;
  const viewBox = `${Math.max(0, Math.min(1000 - viewWidth, center.x - viewWidth / 2))} ${Math.max(0, Math.min(520 - viewHeight, center.y - viewHeight / 2))} ${viewWidth} ${viewHeight}`;
  const totals = useMemo(
    () => ({
      attacks: countries.reduce((sum, country) => sum + country.attacks, 0),
      reports: countries.reduce((sum, country) => sum + country.reports, 0),
      ips: sources.length,
      days: data?.telemetryDates?.length || 0,
    }),
    [countries, data?.telemetryDates?.length, sources],
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.3em] text-[#3F6B5A]">
            GLOBAL THREAT MAP
          </p>
          <h2 className="mt-2 text-3xl font-black">
            3-day public attack heatmap
          </h2>
          <p className="mt-2 max-w-3xl text-[#466357]">
            Top globally reported source IPs from SANS ISC/DShield over the
            last 3 populated telemetry days, enriched with GeoIP and plotted on
            a real world atlas.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center text-sm font-semibold text-[#243B32]">
          <div className="rounded-2xl bg-white/60 p-3">
            <p className="text-2xl font-black">{formatNumber(totals.ips)}</p>
            <p>IPs</p>
          </div>
          <div className="rounded-2xl bg-white/60 p-3">
            <p className="text-2xl font-black">
              {formatNumber(countries.length)}
            </p>
            <p>Countries</p>
          </div>
          <div className="rounded-2xl bg-white/60 p-3">
            <p className="text-2xl font-black">
              {formatNumber(totals.days)}
            </p>
            <p>Days</p>
          </div>
          <div className="rounded-2xl bg-white/60 p-3">
            <p className="text-2xl font-black">
              {formatNumber(totals.attacks)}
            </p>
            <p>Attacks</p>
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
            <div className="relative overflow-hidden rounded-2xl bg-[#13231D]">
              <div className="absolute right-4 top-4 z-10 flex gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((current) => Math.min(4, current + 0.75))}
                  className="rounded-xl border border-[#C8DDD2]/40 bg-[#13231D]/80 px-3 py-2 text-sm font-black text-[#F5F4EF] backdrop-blur"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((current) => Math.max(1, current - 0.75))}
                  className="rounded-xl border border-[#C8DDD2]/40 bg-[#13231D]/80 px-3 py-2 text-sm font-black text-[#F5F4EF] backdrop-blur"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setCenter({ x: 500, y: 260 });
                  }}
                  className="rounded-xl border border-[#C8DDD2]/40 bg-[#13231D]/80 px-3 py-2 text-sm font-bold text-[#F5F4EF] backdrop-blur"
                >
                  Reset
                </button>
              </div>
              <svg
                viewBox={viewBox}
                role="img"
                aria-label="World heatmap of public attack source telemetry"
                className="h-[520px] w-full"
              >
                <defs>
                  <filter id="heat-blur" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="18" />
                  </filter>
                  <radialGradient id="heat-core">
                    <stop offset="0%" stopColor="#FFF3B0" stopOpacity="1" />
                    <stop offset="42%" stopColor="#FF8A00" stopOpacity="0.88" />
                    <stop offset="100%" stopColor="#FF3B30" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <rect width="1000" height="520" fill="#13231D" />
                {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => (
                  <line
                    key={`x-${x}`}
                    x1={x}
                    x2={x}
                    y1="0"
                    y2="520"
                    stroke="#8DA99B"
                    strokeOpacity="0.12"
                  />
                ))}
                {[80, 160, 240, 320, 400, 480].map((y) => (
                  <line
                    key={`y-${y}`}
                    x1="0"
                    x2="1000"
                    y1={y}
                    y2={y}
                    stroke="#8DA99B"
                    strokeOpacity="0.12"
                  />
                ))}

                <g>
                  {mapFeatures.map((feature, index) => (
                    <path
                      key={`${feature.id || feature.properties?.name || "country"}-${index}`}
                      d={featureToPath(feature)}
                      fill="#9FB7AA"
                      fillOpacity="0.42"
                      stroke="#C8DDD2"
                      strokeOpacity="0.32"
                      strokeWidth="0.7"
                    />
                  ))}
                </g>

                <g filter="url(#heat-blur)" opacity="0.94">
                  {countries.map((country) => {
                    const point = project(country.longitude, country.latitude);
                    const intensity = Math.sqrt(country.attacks / maxAttacks);
                    const radius = 22 + intensity * 92;

                    return (
                      <circle
                        key={`glow-${country.countryCode}`}
                        cx={point.x}
                        cy={point.y}
                        r={radius}
                        fill="url(#heat-core)"
                        opacity={0.38 + intensity * 0.48}
                        className="cursor-zoom-in"
                        onClick={() => {
                          setCenter(point);
                          setZoom((current) => Math.max(current, 2.75));
                        }}
                      />
                    );
                  })}
                </g>

                <g opacity={zoom > 1 ? 0.86 : 0.34}>
                  {sources.map((source) => {
                    const point = project(source.longitude, source.latitude);
                    const intensity = Math.sqrt(source.attacks / maxSourceAttacks);
                    const radius = zoom > 1 ? 2.4 + intensity * 5.5 : 1.2 + intensity * 2.4;

                    return (
                      <circle
                        key={source.ip}
                        cx={point.x}
                        cy={point.y}
                        r={radius}
                        fill="#FFF3B0"
                        opacity={0.26 + intensity * 0.46}
                        stroke="#FF8A00"
                        strokeOpacity={zoom > 1 ? 0.42 : 0}
                        strokeWidth={0.6 / zoom}
                      >
                        <title>
                          {source.ip} · {source.city}, {source.country}:{" "}
                          {formatNumber(source.attacks)} attacks
                        </title>
                      </circle>
                    );
                  })}
                </g>

                {zoom > 1.75 && (
                  <g>
                    {sources.map((source) => {
                      const point = project(source.longitude, source.latitude);

                      return (
                        <text
                          key={`count-${source.ip}`}
                          x={point.x}
                          y={point.y - 7}
                          textAnchor="middle"
                          className="select-none"
                          fill="#F5F4EF"
                          stroke="#13231D"
                          strokeWidth={2 / zoom}
                          paintOrder="stroke"
                          fontSize={11 / zoom}
                          fontWeight="800"
                        >
                          {formatNumber(source.attacks)}
                        </text>
                      );
                    })}
                  </g>
                )}
              </svg>

              {mapFeatures.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#13231D]/75 text-sm font-bold text-[#C8DDD2]">
                  Loading world atlas...
                </div>
              )}
            </div>

            <p className="mt-3 text-sm font-semibold text-[#466357]">
              Use the zoom controls or click a heat region to inspect the
              smaller translucent source-IP points underneath.
            </p>

            <div className="mt-4 flex flex-col gap-2 text-sm font-semibold text-[#466357] md:flex-row md:items-center md:justify-between">
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

            {data?.warning && (
              <p className="mt-2 text-sm font-semibold text-[#466357]">
                {data.warning}
              </p>
            )}
          </>
        )}
      </div>

      {status === "ready" && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
            <h3 className="text-xl font-black text-[#243B32]">
              Top countries
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
                    {formatNumber(country.reports)} reports, {country.daysSeen}{" "}
                    observed IP-days
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
            <h3 className="text-xl font-black text-[#243B32]">
              Top source IPs
            </h3>
            <div className="mt-4 space-y-3">
              {sources.slice(0, 10).map((source) => (
                <div key={source.ip} className="rounded-xl bg-[#E6E4DE] p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <a
                        href={`https://isc.sans.edu/ipinfo/${source.ip}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-black text-[#3F6B5A] underline"
                      >
                        {source.ip}
                      </a>
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
                    Seen on {source.daysSeen} of the selected days. Last seen{" "}
                    {source.lastSeen}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
