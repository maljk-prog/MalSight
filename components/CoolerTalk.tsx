"use client";

import { useEffect, useMemo, useState } from "react";

type CoolerTalkResponse = {
  updatedAt?: string;
  fastestRising?: {
    query: string;
    score: number;
    label: string;
    traffic: number;
    risePercent: number | null;
    recentCount: number | null;
    baselineCount: number | null;
    rank: number;
    source: string;
    isLive: boolean;
    note: string;
    link: string;
    components: {
      traffic: number;
      rank: number;
      keyword: number;
      phrase: number;
      entitySector: number;
      urgency: number;
      falsePositivePenalty: number;
      combo: number;
      momentum: number;
      final: number;
    };
    matchedSignals: string[];
    articles: {
      title: string;
      source: string;
      publishedAt: string | null;
      link: string;
    }[];
  } | null;
  panic?: {
    score: number | null;
    label: string;
    trackedTerms: string[];
    baseline: string;
    matchedSearches: {
      query: string;
      traffic: number;
      score?: number;
      label?: string;
      signals?: string[];
      components?: {
        keyword?: number;
        panicKeywords?: number;
        phrase?: number;
        urgency: number;
        traffic: number;
        rank?: number;
        ranking: number;
        victim: number;
        entitySector?: number;
        falsePositivePenalty: number;
        final?: number;
      };
    }[];
    components?: {
      panicKeywords: number;
      keyword?: number;
      phrase?: number;
      urgency: number;
      traffic: number;
      rank?: number;
      ranking: number;
      victim: number;
      entitySector?: number;
      falsePositivePenalty: number;
      final?: number;
    };
  };
  mysteryTopic?: {
    title: string;
    stats: string[];
    analogy: string;
  };
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function formatRisePercent(value: number | null | undefined) {
  if (!Number.isFinite(value)) return "Tracking";

  return `+${formatNumber(Number(value))}%`;
}

function formatArticleDate(value: string | null) {
  if (!value) return "Recent";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
  }).format(date);
}

function safeScore(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function panicColor(score: number | null) {
  if (score === null) return "text-[#466357]";
  if (score >= 85) return "text-[#B3261E]";
  if (score >= 50) return "text-[#B85C00]";
  if (score >= 25) return "text-[#3F6B5A]";
  return "text-[#466357]";
}

function panicBar(score: number | null) {
  if (score === null) return "bg-[#8DA99B]";
  if (score >= 85) return "bg-[#B3261E]";
  if (score >= 50) return "bg-[#D97706]";
  if (score >= 25) return "bg-[#3F6B5A]";
  return "bg-[#8DA99B]";
}

function riseColor(percent: number | null | undefined) {
  if (!Number.isFinite(percent)) return "text-[#466357]";
  if (Number(percent) >= 200) return "text-[#B3261E]";
  if (Number(percent) >= 75) return "text-[#B85C00]";
  if (Number(percent) >= 25) return "text-[#3F6B5A]";
  return "text-[#466357]";
}

function riseBar(percent: number | null | undefined) {
  if (!Number.isFinite(percent)) return "bg-[#8DA99B]";
  if (Number(percent) >= 200) return "bg-[#B3261E]";
  if (Number(percent) >= 75) return "bg-[#D97706]";
  if (Number(percent) >= 25) return "bg-[#3F6B5A]";
  return "bg-[#8DA99B]";
}

function meterWidth(value: number | null | undefined, max: number) {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(100, (Number(value) / max) * 100));
}

function BreakdownGrid({
  items,
}: {
  items: {
    label: string;
    value: number;
    description?: string;
    alwaysShowDescription?: boolean;
  }[];
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-[#466357]">
      {items.map((item) => {
        const shouldShowDescription =
          Boolean(item.description) &&
          (item.alwaysShowDescription || Math.abs(item.value) > 0);

        return (
          <div key={item.label} className="rounded-xl bg-[#E6E4DE]/70 px-3 py-2">
            <p className="text-[#243B32]">{item.value}</p>
            <p>{item.label}</p>
            {shouldShowDescription && (
              <p className="mt-1 text-[11px] font-semibold leading-snug text-[#466357]/85">
                {item.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function uniqueSignals(signals: string[] = []) {
  return Array.from(new Set(signals))
    .filter((signal) => !signal.includes("prior-window"))
    .slice(0, 5);
}

function confidenceLevel(score: number, signals: string[] = []) {
  const signalCount = uniqueSignals(signals).length;

  if (score >= 70 && signalCount >= 4) return "High";
  if (score >= 40 && signalCount >= 2) return "Medium";
  return "Low";
}

function whyTrendMatters(query: string) {
  const normalized = query.toLowerCase();

  if (normalized.includes("zero") || normalized.includes("vulnerability")) {
    return "Zero-day vulnerabilities are software flaws that may be exploited before a fix is available.";
  }
  if (normalized.includes("ransomware")) {
    return "Ransomware can lock files or disrupt services until an organization restores systems or pays a demand.";
  }
  if (normalized.includes("breach") || normalized.includes("leaked")) {
    return "Breaches can expose personal, business, or login information that attackers may reuse later.";
  }
  if (normalized.includes("phishing")) {
    return "Phishing tricks people into giving away passwords, payment details, or access to accounts.";
  }
  if (normalized.includes("malware") || normalized.includes("infostealer")) {
    return "Malware can steal information, monitor activity, or give attackers access to a device.";
  }
  if (normalized.includes("credential")) {
    return "Credential attacks try to reuse or guess login details, which can lead to account takeover.";
  }

  return "This topic matters because increased attention can point defenders toward risks people are discussing or researching.";
}

function trendExplanation(trend: NonNullable<CoolerTalkResponse["fastestRising"]>) {
  const source = trend.source.includes("Google News")
    ? "cybersecurity news coverage"
    : "search activity";
  const rise = trend.risePercent ?? 0;

  if (rise <= 0) {
    return `${trend.query} is security-relevant, but MalSight is not seeing a measurable increase across ${source} versus the 30-day baseline.`;
  }

  return `Interest in ${trend.query} is rising across ${source} and related cyber signals. MalSight only considers security-focused terms here and does not confirm an active incident.`;
}

function concernExplanation(panic: NonNullable<CoolerTalkResponse["panic"]>) {
  const topMatch = panic.matchedSearches[0];

  if (!topMatch) return "No public cyber-concern searches are moving strongly right now.";

  return `${topMatch.query} is driving public concern because it maps to everyday account, password, or scam risk.`;
}

export default function CoolerTalk() {
  const [data, setData] = useState<CoolerTalkResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    fetch("/api/cooler-talk")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Cooler Talk request failed");
        }

        return response.json() as Promise<CoolerTalkResponse>;
      })
      .then((payload) => {
        setData(payload);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const updatedAt = useMemo(() => {
    if (!data?.updatedAt) return null;

    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(data.updatedAt));
  }, [data?.updatedAt]);

  if (status === "loading") {
    return (
      <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
        Listening for Cooler Talk signals...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
        Cooler Talk is temporarily unavailable. Try refreshing the dashboard.
      </div>
    );
  }

  const trend = data?.fastestRising;
  const panic = data?.panic;
  const mystery = data?.mysteryTopic;
  const panicScore = panic?.score ?? null;
  const safePanicScore = safeScore(panicScore);
  const trendRisePercent = trend?.risePercent ?? null;
  const panicWidth = meterWidth(panicScore, 100);
  const trendRiseWidth = meterWidth(trendRisePercent, 200);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.3em] text-[#3F6B5A]">
            COOLER TALK
          </p>
          <h2 className="mt-2 text-3xl font-black">
            Search chatter for security people
          </h2>
          <p className="mt-2 max-w-3xl text-[#466357]">
            A lighter read on public search attention, cyber-anxiety keywords,
            and one rotating topic worth explaining at the office cooler.
          </p>
        </div>

        {updatedAt && (
          <p className="rounded-full border border-[#8DA99B]/55 bg-white/55 px-4 py-2 text-sm font-bold text-[#466357]">
            Updated {updatedAt}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.82fr]">
        <section className="rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-6">
          <p className="text-sm font-black tracking-[0.24em] text-[#3F6B5A]">
            MYSTERY TOPIC
          </p>
          <h3 className="mt-3 text-4xl font-black text-[#243B32]">
            {mystery?.title || "Mystery topic"}
          </h3>
          <div className="mt-6 space-y-3">
            {(mystery?.stats || []).map((stat) => (
              <div
                key={stat}
                className="rounded-xl border border-[#8DA99B]/45 bg-[#E6E4DE]/80 p-4 text-sm font-semibold text-[#466357]"
              >
                {stat}
              </div>
            ))}
          </div>
          {mystery?.analogy && (
            <p className="mt-6 rounded-xl bg-[#13231D]/90 p-4 text-sm font-semibold leading-relaxed text-[#F5F4EF]">
              {mystery.analogy}
            </p>
          )}
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#466357]">
            Refreshes weekly
          </p>
        </section>

        <div className="grid gap-4">
          <section className="rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-6">
            <p className="text-sm font-black tracking-[0.24em] text-[#3F6B5A]">
              CYBER TREND INDEX
            </p>
            {trend ? (
              <>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <p className="text-3xl font-black text-[#243B32]">
                    {trend.query}
                  </p>
                  <p className="rounded-full border border-[#8DA99B]/55 bg-[#E6E4DE]/80 px-3 py-1 text-sm font-black text-[#466357]">
                    {trend.label}
                  </p>
                </div>
                <div className="mt-4 flex items-end gap-3">
                  <p className={`text-6xl font-black ${riseColor(trendRisePercent)}`}>
                    {formatRisePercent(trendRisePercent)}
                  </p>
                  <p className="pb-2 text-lg font-black text-[#466357]">
                    vs 30-day baseline
                  </p>
                </div>
                <div className="mt-5 h-4 overflow-hidden rounded-full border border-[#8DA99B]/45 bg-white/70">
                  <div
                    className={`h-full rounded-full transition-all ${riseBar(
                      trendRisePercent,
                    )}`}
                    style={{ width: `${trendRiseWidth}%` }}
                  />
                </div>
                <p className="mt-4 text-sm font-semibold leading-relaxed text-[#466357]">
                  {trendExplanation(trend)}
                </p>
                <p className="mt-3 rounded-xl bg-[#E6E4DE]/70 p-3 text-sm font-semibold leading-relaxed text-[#466357]">
                  <span className="font-black text-[#243B32]">Why it matters: </span>
                  {whyTrendMatters(trend.query)}
                </p>
                <div className="mt-4 text-sm font-bold text-[#466357]">
                  <p>
                    Last 24h matching articles:{" "}
                    {formatNumber(trend.recentCount ?? 0)}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {uniqueSignals(trend.matchedSignals).map((signal) => (
                    <span
                      key={signal}
                      className="rounded-full border border-[#8DA99B]/45 bg-[#E6E4DE]/75 px-3 py-1 text-xs font-bold text-[#466357]"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {[
                    ...trend.articles,
                    {
                      title: `Open more ${trend.query} coverage`,
                      source: trend.source,
                      publishedAt: null,
                      link: trend.link,
                    },
                  ].slice(0, 2).map((article) => (
                    <a
                      key={`${article.link}-${article.title}`}
                      href={article.link}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-xl border border-[#8DA99B]/45 bg-[#E6E4DE]/65 p-4 transition hover:border-[#3F6B5A] hover:bg-[#E6E4DE]"
                    >
                      <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.18em] text-[#3F6B5A]">
                        <span>{article.source}</span>
                        <span>{formatArticleDate(article.publishedAt)}</span>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm font-black leading-snug text-[#243B32] group-hover:underline">
                        {article.title}
                      </p>
                      <p className="mt-3 text-xs font-bold text-[#466357]">
                        Open article
                      </p>
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-[#8DA99B]/45 bg-[#E6E4DE]/80 p-4">
                <p className="text-3xl font-black text-[#243B32]">
                  No cyber signal
                </p>
                <p className="mt-2 text-sm font-semibold text-[#466357]">
                  No cyber-relevant trends detected today.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black tracking-[0.24em] text-[#3F6B5A]">
                  PUBLIC CONCERN INDEX
                </p>
                <p className="mt-2 text-sm font-semibold text-[#466357]">
                  {panic ? concernExplanation(panic) : "Listening for public cyber concern."}
                </p>
              </div>
              <p className="rounded-full border border-[#8DA99B]/55 bg-[#E6E4DE]/80 px-3 py-1 text-sm font-black text-[#466357]">
                {panic?.label}
              </p>
            </div>

            <div className="mt-6 flex items-end gap-3">
              <p className={`text-6xl font-black ${panicColor(panicScore)}`}>
                {panicScore === null ? "--" : panicScore}
              </p>
              <p className="pb-2 text-2xl font-black text-[#466357]">/100</p>
            </div>

            <div className="mt-5 h-4 overflow-hidden rounded-full border border-[#8DA99B]/45 bg-white/70">
              <div
                className={`h-full rounded-full transition-all ${panicBar(
                  panicScore,
                )}`}
                style={{ width: `${panicWidth}%` }}
              />
            </div>

            <div className="mt-4 grid gap-2 text-sm font-bold text-[#466357] md:grid-cols-2">
              <p>
                Approx. public attention:{" "}
                {formatNumber(
                  panic?.matchedSearches?.[0]?.traffic || 0,
                )}
              </p>
              <p>
                Concern confidence:{" "}
                {confidenceLevel(
                  safePanicScore,
                  panic?.matchedSearches?.[0]?.signals || [],
                )}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {uniqueSignals(panic?.matchedSearches?.[0]?.signals || []).map(
                (signal) => (
                  <span
                    key={signal}
                    className="rounded-full border border-[#8DA99B]/45 bg-[#E6E4DE]/75 px-3 py-1 text-xs font-bold text-[#466357]"
                  >
                    {signal}
                  </span>
                ),
              )}
            </div>

            {panic?.matchedSearches && panic.matchedSearches.length > 0 && (
              <table className="mt-4 w-full overflow-hidden rounded-xl text-left text-xs font-bold text-[#466357]">
                <thead className="bg-[#E6E4DE] text-[#243B32]">
                  <tr>
                    <th className="px-3 py-2">Search term</th>
                    <th className="px-3 py-2">Concern level</th>
                    <th className="px-3 py-2">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#8DA99B]/35 bg-[#E6E4DE]/55">
                  {panic.matchedSearches.slice(0, 5).map((match) => (
                    <tr key={match.query}>
                      <td className="px-3 py-2">{match.query}</td>
                      <td className="px-3 py-2">{match.label || "Calm"}</td>
                      <td className="px-3 py-2">
                        {formatNumber(match.traffic)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {(!panic?.matchedSearches || panic.matchedSearches.length === 0) && (
              <div className="mt-4 rounded-xl border border-[#8DA99B]/45 bg-[#E6E4DE]/80 p-4">
                <p className="text-sm font-semibold text-[#466357]">
                  No public cyber-concern trends detected today.
                </p>
              </div>
            )}

            {panic?.components && (
              <details className="mt-4 rounded-xl border border-[#8DA99B]/45 bg-[#E6E4DE]/55 p-4">
                <summary className="cursor-pointer text-sm font-black text-[#243B32]">
                  Scoring details
                </summary>
                <p className="mt-3 text-xs font-semibold text-[#466357]">
                  {panic.baseline}
                </p>
                <BreakdownGrid
                  items={[
                    {
                      label: "Keyword score",
                      value: panic.components.keyword ?? panic.components.panicKeywords,
                      description: "General cyber-concern words found in the trend.",
                    },
                    {
                      label: "Phrase score",
                      value: panic.components.phrase ?? 0,
                      description: "Higher-weight phrases that sound like public worry.",
                    },
                    {
                      label: "Traffic score",
                      value: panic.components.traffic,
                      description: "Adds weight only when attention is broad enough.",
                    },
                    {
                      label: "Rank score",
                      value: panic.components.rank ?? panic.components.ranking,
                      description: "Boosts terms appearing higher in trend results.",
                    },
                    {
                      label: "Entity/sector bonus",
                      value: panic.components.entitySector ?? panic.components.victim,
                      description: "Extra weight for trusted brands or sensitive sectors.",
                    },
                    {
                      label: "Urgency bonus",
                      value: panic.components.urgency,
                      description: "Flags language that suggests immediate user concern.",
                    },
                    {
                      label: "False positive",
                      value: -panic.components.falsePositivePenalty,
                      description: "Subtracts points when the topic looks less security-relevant.",
                    },
                    {
                      label: "Final score",
                      value: panic.components.final ?? safePanicScore,
                      description: "Combined score after bonuses, caps, and penalties.",
                      alwaysShowDescription: true,
                    },
                  ]}
                />
              </details>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
