"use client";

import { useEffect, useMemo, useState } from "react";

type CountrySummary = {
  country: string;
  countryCode: string;
  attacks: number;
  reports: number;
  ipCount: number;
  latitude: number;
  longitude: number;
};

type ThreatSource = {
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

type ThreatMapResponse = {
  updatedAt?: string;
  source?: string;
  warning?: string;
  countries?: CountrySummary[];
  sources?: ThreatSource[];
};

const LAND_MASSES = [
  "M151 139 C117 160 86 208 89 266 C93 329 140 352 185 332 C224 315 231 262 216 221 C204 188 193 152 151 139 Z",
  "M246 302 C219 345 223 398 254 449 C282 496 320 492 331 432 C340 385 311 342 286 309 C273 293 259 291 246 302 Z",
  "M454 137 C404 150 372 188 379 232 C385 269 436 281 479 262 C525 241 569 253 602 224 C640 189 614 142 557 133 C521 127 488 127 454 137 Z",
  "M501 280 C459 300 427 358 442 420 C459 489 522 507 562 461 C590 428 584 369 560 323 C546 296 526 272 501 280 Z",
  "M608 259 C593 280 611 310 655 318 C702 326 739 299 740 267 C741 237 706 221 668 227 C639 231 621 242 608 259 Z",
  "M710 151 C671 160 652 193 669 220 C689 252 750 248 796 229 C840 212 877 215 909 194 C887 157 831 139 766 144 C746 145 727 147 710 151 Z",
  "M772 342 C741 357 729 394 749 424 C772 460 828 453 852 417 C872 386 850 348 812 338 C798 334 784 335 772 342 Z",
  "M668 420 C655 440 672 468 706 473 C740 478 765 457 757 432 C750 410 686 394 668 420 Z",
];

function project(longitude: number, latitude: number) {
  return {
    x: ((longitude + 180) / 360) * 1000,
    y: ((90 - latitude) / 180) * 520,
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

export default function ThreatMap() {
  const [data, setData] = useState<ThreatMapResponse | null>(null);
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

  const countries = data?.countries || [];
  const sources = data?.sources || [];
  const maxAttacks = Math.max(...countries.map((country) => country.attacks), 1);
  const totals = useMemo(
    () => ({
      attacks: countries.reduce((sum, country) => sum + country.attacks, 0),
      reports: countries.reduce((sum, country) => sum + country.reports, 0),
      ips: sources.length,
    }),
    [countries, sources],
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.3em] text-[#3F6B5A]">
            GLOBAL THREAT MAP
          </p>
          <h2 className="mt-2 text-3xl font-black">
            Public attack telemetry heatmap
          </h2>
          <p className="mt-2 max-w-3xl text-[#466357]">
            Top globally reported source IPs from SANS ISC/DShield, enriched
            with GeoIP location data and aggregated into country heat points.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-sm font-semibold text-[#243B32]">
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
            <div className="relative overflow-hidden rounded-2xl bg-[#243B32]">
              <svg
                viewBox="0 0 1000 520"
                role="img"
                aria-label="World heatmap of public attack source telemetry"
                className="h-[520px] w-full"
              >
                <rect width="1000" height="520" fill="#243B32" />
                {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => (
                  <line
                    key={`x-${x}`}
                    x1={x}
                    x2={x}
                    y1="0"
                    y2="520"
                    stroke="#8DA99B"
                    strokeOpacity="0.14"
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
                    strokeOpacity="0.14"
                  />
                ))}
                {LAND_MASSES.map((path) => (
                  <path
                    key={path}
                    d={path}
                    fill="#C8DDD2"
                    fillOpacity="0.72"
                    stroke="#8DA99B"
                    strokeOpacity="0.35"
                  />
                ))}

                {countries.map((country) => {
                  const point = project(country.longitude, country.latitude);
                  const intensity = Math.sqrt(country.attacks / maxAttacks);
                  const radius = 10 + intensity * 34;

                  return (
                    <g key={country.countryCode}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={radius * 1.8}
                        fill="#D6C89B"
                        opacity="0.16"
                      />
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={radius}
                        fill="#D6C89B"
                        opacity="0.72"
                      />
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill="#F5F4EF"
                      />
                      <title>
                        {country.country}: {formatNumber(country.attacks)}{" "}
                        attacks from {country.ipCount} IPs
                      </title>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="mt-4 flex flex-col gap-2 text-sm font-semibold text-[#466357] md:flex-row md:items-center md:justify-between">
              <p>{data?.source}</p>
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
                    {formatNumber(country.reports)} reports
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
                    Last seen {source.lastSeen}
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
