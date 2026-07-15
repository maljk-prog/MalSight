"use client";

import { useEffect, useState } from "react";

type IocType = "ip" | "domain" | "url" | "hash" | "email";
const VISIBLE_IOC_TYPES: IocType[] = ["ip", "domain", "url", "hash"];

const WEATHER_REFRESH_MS = 24 * 60 * 60 * 1000;

type ThreatWeatherResponse = {
  updatedAt: string;
  mode: "live" | "cached" | "none" | "mock";
  health: "available" | "partial" | "unavailable" | "mock";
  healthMessage: string;
  weatherState: string;
  threatIndex: number | null;
  summary: string;
  freshness: string | null;
  usingCachedSince: string | null;
  sourceStatuses: {
    name: string;
    configured: boolean;
    mode: "live" | "cached" | "none" | "mock";
    status: string;
    retrievedAt: string | null;
    itemCount: number;
    message: string;
  }[];
  contributors: {
    name: string;
    label: string;
    value: number;
    score: number;
    weight: number;
    sourceNames: string[];
    note: string;
  }[];
  iocCollector: {
    totals: Record<IocType, number>;
    sourceBreakdown: {
      source: string;
      totals: Record<IocType, number>;
      status: string;
      retrievedAt: string | null;
    }[];
    deltas: {
      available: boolean;
      message: string;
      totals?: Partial<Record<IocType, number>>;
    };
    topFamily: string | null;
    freshness: string | null;
  };
};

const WEATHER_POSITIONS: Record<string, string> = {
  Clear: "0% 0%",
  "Mostly Clear": "50% 0%",
  "Moderate Activity": "100% 0%",
  "Elevated Risk": "0% 100%",
  "Threat Storm": "50% 100%",
  "Critical Threat": "100% 100%",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function formatTimestamp(value: string | null) {
  if (!value) return "No validated timestamp";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No validated timestamp";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function indexColor(value: number | null) {
  if (value === null) return "text-[#466357]";
  if (value >= 91) return "text-[#B3261E]";
  if (value >= 76) return "text-[#D92D20]";
  if (value >= 56) return "text-[#B85C00]";
  if (value >= 36) return "text-[#7A5B16]";
  return "text-[#3F6B5A]";
}

function healthPill(health: ThreatWeatherResponse["health"]) {
  if (health === "available") return "bg-[#3F6B5A] text-white";
  if (health === "partial") return "bg-[#D97706] text-white";
  if (health === "mock") return "bg-[#5B4B22] text-white";
  return "bg-[#B3261E] text-white";
}

function signalWidth(score: number) {
  return `${Math.max(0, Math.min(100, score))}%`;
}

function totalIocs(totals: Record<IocType, number>) {
  return Object.values(totals).reduce((sum, value) => sum + value, 0);
}

function iocLabel(type: IocType) {
  if (type === "ip") return "IPs";
  if (type === "hash") return "hashes";
  return `${type}s`;
}

function sourceModeLabel(mode: ThreatWeatherResponse["mode"]) {
  if (mode === "none") return "unavailable";
  if (mode === "mock") return "mock";
  return mode;
}

function sourceModeClass(mode: ThreatWeatherResponse["mode"]) {
  if (mode === "live") return "bg-[#3F6B5A] text-white";
  if (mode === "cached") return "bg-[#D97706] text-white";
  if (mode === "mock") return "bg-[#5B4B22] text-white";
  return "bg-[#B3261E] text-white";
}

export default function ThreatWeatherPanel() {
  const [data, setData] = useState<ThreatWeatherResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [sourceHealthOpen, setSourceHealthOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      try {
        const response = await fetch("/api/threat-weather", { cache: "no-store" });
        const payload = (await response.json()) as ThreatWeatherResponse;

        if (!cancelled) {
          setData(payload);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    loadWeather();
    const refreshTimer = window.setInterval(loadWeather, WEATHER_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const weatherPosition =
    WEATHER_POSITIONS[data?.weatherState || "Clear"] || WEATHER_POSITIONS.Clear;
  const iocTotal = data ? totalIocs(data.iocCollector.totals) : 0;
  const iocEvidenceSources =
    data?.iocCollector.sourceBreakdown.filter((source) => totalIocs(source.totals) > 0) || [];

  if (status === "loading") {
    return (
      <section className="theme-home-panel rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-6">
        <p className="text-sm font-black tracking-[0.28em] text-[#3F6B5A]">
          THREAT WEATHER
        </p>
        <p className="mt-3 font-semibold text-[#466357]">
          Validating configured threat-intelligence sources...
        </p>
      </section>
    );
  }

  if (status === "error" || !data) {
    return (
      <section className="theme-home-panel rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-6">
        <p className="text-sm font-black tracking-[0.28em] text-[#3F6B5A]">
          THREAT WEATHER
        </p>
        <p className="mt-3 font-semibold text-[#B3261E]">
          Threat Weather unavailable — no validated data sources reachable.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <article className="relative min-h-[520px] overflow-hidden rounded-2xl bg-[#13231D] text-[#F5F4EF] shadow-xl shadow-[#13231D]/25">
        <div
          className="absolute -inset-2 bg-cover opacity-75"
          style={{
            backgroundImage: "url('/assets/threat-weather-states.png')",
            backgroundSize: "306% 204%",
            backgroundPosition: weatherPosition,
            imageRendering: "pixelated",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#08120F]/25 via-[#08120F]/45 to-[#08120F]/88" />
        <div className="relative z-10 flex min-h-[520px] flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black tracking-[0.28em] text-[#C8DDD2]">
                  THREAT WEATHER
                </p>
                <h2 className="mt-2 text-4xl font-black text-white">
                  {data.weatherState}
                </h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${healthPill(data.health)}`}>
                {data.health === "mock" ? "DEV MOCK" : data.health.toUpperCase()}
              </span>
            </div>

            <div className="mt-7 flex items-end gap-3">
              <p className={`text-7xl font-black ${indexColor(data.threatIndex)}`}>
                {data.threatIndex === null ? "--" : data.threatIndex}
              </p>
              <p className="pb-3 text-2xl font-black text-[#C8DDD2]">/100</p>
            </div>
            <div className="mt-3 h-4 overflow-hidden rounded-full border border-white/25 bg-white/20">
              <div
                className="h-full rounded-full bg-current transition-all"
                style={{
                  width: `${data.threatIndex ?? 0}%`,
                  color:
                    data.threatIndex === null
                      ? "#8DA99B"
                      : data.threatIndex >= 76
                        ? "#D92D20"
                        : data.threatIndex >= 56
                          ? "#D97706"
                          : data.threatIndex >= 36
                            ? "#D6C89B"
                            : "#3F6B5A",
                }}
              />
            </div>
            <p className="mt-5 max-w-xl text-sm font-semibold leading-relaxed text-[#F5F4EF]">
              {data.summary}
            </p>
          </div>

          <div className="mt-6 max-w-xs">
            <div className="rounded-xl border border-white/18 bg-black/28 p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C8DDD2]">
                Freshness
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {formatTimestamp(data.freshness)}
              </p>
            </div>
          </div>
        </div>
      </article>

      <article className="theme-home-panel rounded-2xl border border-[#8DA99B]/50 bg-white/55 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black tracking-[0.28em] text-[#3F6B5A]">
              IOC COLLECTOR
            </p>
            <h3 className="mt-2 text-3xl font-black text-[#243B32]">
              {formatNumber(iocTotal)} validated malicious indicators
            </h3>
          </div>
          <span className="rounded-full border border-[#8DA99B]/55 bg-[#E6E4DE]/80 px-3 py-1 text-xs font-black text-[#466357]">
            {data.iocCollector.deltas.message}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {VISIBLE_IOC_TYPES.map(
            (type) => (
              <div key={type} className="rounded-xl bg-[#E6E4DE]/75 p-3">
                <p className="text-2xl font-black text-[#243B32]">
                  {formatNumber(data.iocCollector.totals[type] || 0)}
                </p>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#466357]">
                  {iocLabel(type)}
                </p>
              </div>
            ),
          )}
        </div>

        <div className="mt-5 rounded-xl border border-[#8DA99B]/45 bg-[#E6E4DE]/45 p-4">
          <p className="text-sm font-black text-[#243B32]">
            Supporting evidence
          </p>
          <div className="mt-3 space-y-3">
            {iocEvidenceSources.length > 0 ? (
              iocEvidenceSources.map((source) => (
                <div
                  key={source.source}
                  className="grid gap-3 rounded-xl bg-white/55 p-3 text-xs font-bold text-[#466357] sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="text-sm font-black text-[#243B32]">
                      {source.source}
                    </p>
                    <p>{source.status} · {formatTimestamp(source.retrievedAt)}</p>
                  </div>
                  <p className="text-right text-sm font-black text-[#243B32]">
                    {formatNumber(totalIocs(source.totals))} IOCs
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-[#466357]">
                No validated IOC evidence is available from configured sources.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[#8DA99B]/45 bg-[#E6E4DE]/45 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-black text-[#243B32]">Source health</p>
            <button
              type="button"
              onClick={() => setSourceHealthOpen((open) => !open)}
              className="rounded-full border border-[#8DA99B]/55 bg-white/65 px-3 py-1.5 text-xs font-black text-[#243B32] transition hover:bg-white"
            >
              {sourceHealthOpen ? "Hide details" : "Show details"}
            </button>
          </div>
          <p className="mt-2 text-xs font-bold text-[#466357]">{data.healthMessage}</p>
          {sourceHealthOpen && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {data.sourceStatuses.map((source) => (
                <div
                  key={source.name}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/55 p-3"
                >
                  <div>
                    <p className="text-sm font-black text-[#243B32]">{source.name}</p>
                    <p className="text-xs font-bold text-[#466357]">{source.message}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${sourceModeClass(source.mode)}`}
                  >
                    {source.configured ? sourceModeLabel(source.mode) : "not set"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3">
          {data.contributors.map((signal) => (
            <div key={signal.name}>
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-[#466357]">
                <span>{signal.label}</span>
                <span>{formatNumber(signal.value)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#E6E4DE]">
                <div
                  className="h-full rounded-full bg-[#3F6B5A]"
                  style={{ width: signalWidth(signal.score) }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 text-sm font-semibold text-[#466357]">
          Baseline timeframe:{" "}
          <span className="font-black text-[#243B32]">
            {data.iocCollector.deltas.available
              ? "Compared to prior validated collection"
              : "Current live 24-hour window; prior-day comparison needs persisted history"}
          </span>
        </p>
      </article>
    </section>
  );
}
