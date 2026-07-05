"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

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

function clampMapCenter(center: { x: number; y: number }, zoom: number) {
  const viewWidth = 1000 / zoom;
  const viewHeight = 520 / zoom;

  if (viewWidth >= 1000 || viewHeight >= 520) {
    return { x: 500, y: 260 };
  }

  return {
    x: Math.max(viewWidth / 2, Math.min(1000 - viewWidth / 2, center.x)),
    y: Math.max(viewHeight / 2, Math.min(520 - viewHeight / 2, center.y)),
  };
}

export default function ThreatMap() {
  const [data, setData] = useState<ThreatMapResponse | null>(null);
  const [mapFeatures, setMapFeatures] = useState<GeoJsonFeature[]>([]);
  const [timeframe, setTimeframe] = useState("3d");
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 500, y: 260 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    center: { x: number; y: number };
  } | null>(null);
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

  const countries = data?.countries || [];
  const sources = data?.sources || [];
  const asns = data?.asns || [];
  const topAsn = asns[0];
  const activeTimeframe =
    TIMEFRAMES.find((item) => item.id === timeframe) || TIMEFRAMES[1];
  const maxAttacks = Math.max(...countries.map((country) => country.attacks), 1);
  const maxSourceAttacks = Math.max(
    ...sources.map((source) => source.attacks),
    1,
  );
  const viewWidth = 1000 / zoom;
  const viewHeight = 520 / zoom;
  const clampedCenter = clampMapCenter(center, zoom);
  const viewBox = `${clampedCenter.x - viewWidth / 2} ${clampedCenter.y - viewHeight / 2} ${viewWidth} ${viewHeight}`;
  const totals = useMemo(
    () => ({
      attacks: countries.reduce((sum, country) => sum + country.attacks, 0),
      reports: countries.reduce((sum, country) => sum + country.reports, 0),
      ips: sources.length,
    }),
    [countries, sources],
  );
  const handleMapPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (zoom <= 1) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      center: clampedCenter,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleMapPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    const svg = svgRef.current;

    if (!drag || !svg || drag.pointerId !== event.pointerId) return;

    const bounds = svg.getBoundingClientRect();
    const dx = ((event.clientX - drag.startX) / bounds.width) * viewWidth;
    const dy = ((event.clientY - drag.startY) / bounds.height) * viewHeight;

    setCenter(
      clampMapCenter({ x: drag.center.x - dx, y: drag.center.y - dy }, zoom),
    );
  };
  const stopMapDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };
  const pointFromMapEvent = (event: ReactMouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;

    if (!svg) return clampedCenter;

    const bounds = svg.getBoundingClientRect();

    return {
      x:
        clampedCenter.x -
        viewWidth / 2 +
        ((event.clientX - bounds.left) / bounds.width) * viewWidth,
      y:
        clampedCenter.y -
        viewHeight / 2 +
        ((event.clientY - bounds.top) / bounds.height) * viewHeight,
    };
  };
  const handleMapDoubleClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    event.preventDefault();

    const nextZoom = Math.min(4, Math.max(2.25, zoom + 1));
    const nextCenter = pointFromMapEvent(event);

    dragRef.current = null;
    setZoom(nextZoom);
    setCenter(clampMapCenter(nextCenter, nextZoom));
  };

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
                {formatNumber(totals.ips)}
              </p>
              <p>IPs</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 [container-type:inline-size]">
              <p className="text-[clamp(1.05rem,20cqw,1.75rem)] font-black leading-none">
                {formatNumber(countries.length)}
              </p>
              <p>Countries</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 [container-type:inline-size]">
              <p className="text-[clamp(1.05rem,20cqw,1.75rem)] font-black leading-none">
                {formatNumber(totals.attacks)}
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
                ref={svgRef}
                viewBox={viewBox}
                role="img"
                aria-label="World heatmap of public attack source telemetry"
                className={`h-[520px] w-full touch-none select-none ${
                  zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                }`}
                onPointerDown={handleMapPointerDown}
                onPointerMove={handleMapPointerMove}
                onPointerUp={stopMapDrag}
                onPointerCancel={stopMapDrag}
                onPointerLeave={stopMapDrag}
                onDoubleClick={handleMapDoubleClick}
              >
                <defs>
                  <filter id="heat-blur" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="18" />
                  </filter>
                  <filter id="source-heat-blur" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="15" />
                  </filter>
                  <radialGradient id="heat-core">
                    <stop offset="0%" stopColor="color-mix(in srgb, var(--theme-light) 76%, white)" stopOpacity="1" />
                    <stop offset="42%" stopColor="color-mix(in srgb, var(--theme-warm) 88%, white)" stopOpacity="0.92" />
                    <stop offset="100%" stopColor="var(--theme-accent)" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="source-heat-core">
                    <stop offset="0%" stopColor="white" stopOpacity="0.96" />
                    <stop offset="18%" stopColor="color-mix(in srgb, var(--theme-light) 72%, white)" stopOpacity="0.9" />
                    <stop offset="46%" stopColor="color-mix(in srgb, var(--theme-warm) 76%, white)" stopOpacity="0.66" />
                    <stop offset="76%" stopColor="color-mix(in srgb, var(--theme-accent) 64%, var(--theme-warm))" stopOpacity="0.26" />
                    <stop offset="100%" stopColor="var(--theme-accent)" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <rect width="1000" height="520" fill="var(--theme-deep-panel)" />
                {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => (
                  <line
                    key={`x-${x}`}
                    x1={x}
                    x2={x}
                    y1="0"
                    y2="520"
                    stroke="var(--theme-border)"
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
                    stroke="var(--theme-border)"
                    strokeOpacity="0.12"
                  />
                ))}

                <g>
                  {mapFeatures.map((feature, index) => (
                    <path
                      key={`${feature.id || feature.properties?.name || "country"}-${index}`}
                      d={featureToPath(feature)}
                      fill="var(--theme-overlay)"
                      fillOpacity="0.42"
                      stroke="var(--theme-deep-muted)"
                      strokeOpacity="0.32"
                      strokeWidth="0.7"
                    />
                  ))}
                </g>

                <g filter="url(#heat-blur)" opacity="0.94">
                  {countries.map((country) => {
                    const point = project(country.longitude, country.latitude);
                    const intensity = Math.sqrt(country.attacks / maxAttacks);
                    const radius = 24 + intensity * 82;

                    return (
                      <circle
                        key={`glow-${country.countryCode}`}
                        cx={point.x}
                        cy={point.y}
                        r={radius}
                        fill="url(#heat-core)"
                        opacity={0.24 + intensity * 0.38}
                        pointerEvents="none"
                      />
                    );
                  })}
                </g>

                <g filter="url(#source-heat-blur)" opacity="0.92" style={{ mixBlendMode: "screen" }}>
                  {sources.map((source) => {
                    const point = project(source.longitude, source.latitude);
                    const intensity = Math.sqrt(source.attacks / maxSourceAttacks);
                    const radius = 14 + intensity * (zoom > 1 ? 38 : 28);

                    return (
                      <circle
                        key={`source-heat-${source.ip}`}
                        cx={point.x}
                        cy={point.y}
                        r={radius}
                        fill="url(#source-heat-core)"
                        opacity={0.34 + intensity * 0.34}
                        pointerEvents="none"
                      />
                    );
                  })}
                </g>

              </svg>

              {mapFeatures.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#13231D]/75 text-sm font-bold text-[#C8DDD2]">
                  Loading world atlas...
                </div>
              )}
            </div>

            <p className="mt-3 text-sm font-semibold text-[#466357]">
              Double-click a heat region to zoom in, then drag the map to
              follow denser source areas. Color shows relative source-IP
              concentration without count markers.
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
            </div>
          </>
        )}
      </div>

      {status === "ready" && (
        <>
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
                    : "No ASN data available"}
                </h3>
                <p className="mt-1 max-w-3xl text-sm font-semibold text-[#466357]">
                  {topAsn
                    ? topAsn.organization
                    : "Public telemetry did not return enriched ASN data for this timeframe."}
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
                    Last reported {source.lastSeen}
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
