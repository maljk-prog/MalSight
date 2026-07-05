"use client";

import { useEffect, useMemo, useState } from "react";

type NewsItem = {
  source: string;
  title: string;
  link: string;
  pubDate: string;
  timestamp?: number;
  contentSnippet: string;
  cves?: string[];
  cveSource?: "rss" | "article" | "kev" | "none";
};

type NewsResponse = {
  updatedAt?: string;
  pageSize?: number;
  items?: NewsItem[];
};

type ArticleAnalysis = {
  categories: string[];
  cves: string[];
  entities: string[];
  sector: string;
  whyItMatters: string;
  defenderTakeaway: string;
  preventability: string;
  preventabilityReason: string;
  impactLabel: string;
  defenderRelevance: string;
  publicRelevance: string;
  confidence: string;
  clusterKey: string;
  clusterTheme: string;
  isRecap: boolean;
};

type StoryCluster = {
  key: string;
  title: string;
  summary: string;
  categories: string[];
  cves: string[];
  entities: string[];
  sector: string;
  sources: string[];
  articles: { item: NewsItem; analysis: ArticleAnalysis }[];
  whyItMatters: string;
  defenderTakeaway: string;
  preventability: string;
  preventabilityReason: string;
  impactLabel: string;
  defenderRelevance: string;
  publicRelevance: string;
  confidence: string;
  score: number;
  latestTimestamp: number;
  isRecap: boolean;
};

const FILTERS = [
  "All",
  "Breach",
  "Exploited CVE",
  "Malware",
  "Ransomware",
  "Privacy",
  "Threat Actor",
  "Patch/Update",
  "Critical Infrastructure",
  "Healthcare",
  "Finance",
  "Government",
  "Cloud/SaaS",
];

const ENTITY_TERMS = [
  "Oracle",
  "PeopleSoft",
  "ShinyHunters",
  "Nissan",
  "NAIC",
  "WhatsApp",
  "Microsoft",
  "Google",
  "Apple",
  "Cisco",
  "Okta",
  "VMware",
  "Fortinet",
  "Ivanti",
  "Citrix",
  "MOVEit",
  "Snowflake",
  "Salesforce",
  "AWS",
  "Azure",
  "Chrome",
  "Firefox",
  "Android",
  "CISA",
  "FBI",
  "LockBit",
  "Clop",
  "Lazarus",
  "Scattered Spider",
  "UNC",
];

const SOURCE_WEIGHT: Record<string, number> = {
  BleepingComputer: 4,
  KrebsOnSecurity: 4,
  "The Hacker News": 3,
  SecurityWeek: 3,
};

function unique<T>(values: T[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function textFor(item: NewsItem) {
  return `${item.title} ${item.contentSnippet}`.toLowerCase();
}

function titleCase(value: string) {
  return value
    .split(/[\s-/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function extractCves(item: NewsItem) {
  const serverCves = (item.cves || []).map((cve) => cve.toUpperCase());
  const localCves = `${item.title} ${item.contentSnippet}`.match(/CVE-\d{4}-\d{4,7}/gi) || [];

  return unique([...serverCves, ...localCves]).map((cve) => cve.toUpperCase());
}

function extractEntities(item: NewsItem) {
  const haystack = `${item.title} ${item.contentSnippet}`;
  const lower = haystack.toLowerCase();
  const known = ENTITY_TERMS.filter((entity) =>
    lower.includes(entity.toLowerCase()),
  );
  const capitalized = haystack.match(/\b[A-Z][A-Za-z0-9&.-]{2,}(?:\s[A-Z][A-Za-z0-9&.-]{2,})?\b/g) || [];

  return unique([...known, ...capitalized])
    .filter(
      (entity) =>
        ![
          "The",
          "This",
          "Security",
          "Recent",
          "Open",
          "SecurityWeek",
          "BleepingComputer",
          "KrebsOnSecurity",
          "The Hacker News",
        ].includes(entity),
    )
    .slice(0, 8);
}

function articleCategories(text: string, cves: string[]) {
  const categories = new Set<string>();

  if (includesAny(text, ["breach", "exposed", "leaked", "stolen data", "data theft"])) {
    categories.add("Breach");
  }
  if (cves.length > 0 || includesAny(text, ["exploited", "zero-day", "zero day", "actively exploited"])) {
    categories.add("Exploited CVE");
  }
  if (includesAny(text, ["ransomware", "extortion"])) categories.add("Ransomware");
  if (includesAny(text, ["malware", "trojan", "backdoor", "infostealer", "spyware"])) {
    categories.add("Malware");
  }
  if (includesAny(text, ["threat actor", "hackers", "shinyhunters", "lockbit", "clop", "lazarus"])) {
    categories.add("Threat Actor");
  }
  if (includesAny(text, ["privacy", "tracking", "username", "personal information"])) {
    categories.add("Privacy");
  }
  if (includesAny(text, ["patch", "update", "fixed", "advisory", "released fixes"])) {
    categories.add("Patch/Update");
  }
  if (includesAny(text, ["vulnerability", "flaw", "bug"])) categories.add("Vulnerability");
  if (includesAny(text, ["weekly recap", "week in review", "roundup"])) categories.add("Weekly Recap");
  if (includesAny(text, ["advisory", "alert", "warning"])) categories.add("Advisory");
  if (includesAny(text, ["cloud", "saas", "aws", "azure", "google cloud", "salesforce", "snowflake"])) {
    categories.add("Cloud/SaaS");
  }
  if (includesAny(text, ["browser extension", "chrome extension", "firefox add-on"])) {
    categories.add("Browser Extension");
  }
  if (includesAny(text, ["credential", "password", "session cookie", "token"])) {
    categories.add("Credential Theft");
  }

  return Array.from(categories);
}

function affectedSector(text: string) {
  if (includesAny(text, ["hospital", "healthcare", "patient", "medical"])) return "Healthcare";
  if (includesAny(text, ["bank", "insurance", "finance", "payment", "credit card"])) return "Finance";
  if (includesAny(text, ["government", "agency", "municipal", "federal"])) return "Government";
  if (includesAny(text, ["power grid", "water", "pipeline", "utility", "telecom", "airport"])) {
    return "Critical Infrastructure";
  }
  if (includesAny(text, ["automotive", "vehicle", "nissan", "toyota", "ford"])) return "Automotive";
  if (includesAny(text, ["cloud", "saas", "aws", "azure", "salesforce", "snowflake"])) return "Cloud/SaaS";
  return "General technology";
}

function whyItMatters(categories: string[], sector: string) {
  if (categories.includes("Breach")) {
    return "Data exposure can increase phishing, extortion, fraud, and identity-risk pressure on affected people.";
  }
  if (categories.includes("Exploited CVE")) {
    return "Exploited software flaws can give attackers a path into exposed systems before defenders catch up.";
  }
  if (categories.includes("Ransomware")) {
    return "Ransomware can disrupt operations, delay services, and pressure organizations through data theft.";
  }
  if (categories.includes("Browser Extension")) {
    return "Malicious browser extensions can steal searches, credentials, session data, or browsing activity.";
  }
  if (categories.includes("Privacy")) {
    return "Privacy changes or leaks can expose personal identifiers that people did not expect to be public.";
  }
  if (sector === "Critical Infrastructure") {
    return "Incidents in critical services can affect availability, safety, and public trust.";
  }
  return "The story may affect security decisions, user trust, or how defenders prioritize monitoring.";
}

function defenderTakeaway(categories: string[], entities: string[], sector: string) {
  const entityText = entities.slice(0, 2).join(" or ");

  if (categories.includes("Exploited CVE")) {
    return `Confirm patch status, exposure, and unusual access for affected ${entityText || "internet-facing"} systems.`;
  }
  if (categories.includes("Breach")) {
    return "Review access logs, data export activity, third-party exposure, and phishing protections for affected users.";
  }
  if (categories.includes("Browser Extension")) {
    return "Review browser extension policies and audit installed extensions across managed endpoints.";
  }
  if (categories.includes("Malware")) {
    return "Hunt for known malware indicators, unusual persistence, and suspicious outbound connections.";
  }
  if (categories.includes("Ransomware")) {
    return "Validate backups, remote access controls, endpoint detections, and signs of data staging.";
  }
  if (sector === "Cloud/SaaS") {
    return "Check SaaS audit logs, admin grants, token usage, and risky integrations.";
  }
  return "Use this story as a prompt to review related exposure, logging, and user-facing risk.";
}

function preventability(categories: string[]) {
  if (categories.includes("Exploited CVE") || categories.includes("Patch/Update")) {
    return {
      value: "Likely reducible",
      reason:
        "Likely reducible with faster patching, exposure management, and monitoring for suspicious data access.",
    };
  }
  if (categories.includes("Breach") || categories.includes("Credential Theft")) {
    return {
      value: "Partially reducible",
      reason:
        "Partially reducible with tighter access controls, monitoring, and stronger identity protections.",
    };
  }
  if (categories.includes("Privacy")) {
    return {
      value: "Partially reducible",
      reason:
        "Partially reducible through privacy reviews, data minimization, and safer default settings.",
    };
  }
  if (categories.includes("Weekly Recap")) {
    return {
      value: "Unknown",
      reason: "Recap stories summarize many events, so preventability depends on each underlying incident.",
    };
  }
  return {
    value: "Unknown",
    reason: "The public reporting does not provide enough detail to judge preventability.",
  };
}

function relevanceLabels(categories: string[], sector: string) {
  const defenderHigh = categories.some((category) =>
    ["Exploited CVE", "Ransomware", "Malware", "Patch/Update", "Credential Theft"].includes(category),
  );
  const publicHigh = categories.some((category) =>
    ["Breach", "Privacy", "Credential Theft", "Ransomware"].includes(category),
  );
  const impactHigh =
    defenderHigh || publicHigh || ["Healthcare", "Finance", "Government", "Critical Infrastructure"].includes(sector);

  return {
    impactLabel: impactHigh ? "High impact" : "Watch",
    defenderRelevance: defenderHigh ? "High defender relevance" : "Situational awareness",
    publicRelevance: publicHigh ? "High public relevance" : "Low public relevance",
  };
}

function clusterTheme(item: NewsItem, categories: string[], cves: string[], entities: string[], isRecap: boolean) {
  if (isRecap) return "Weekly Recap";
  if (cves[0]) return cves[0];
  const lower = textFor(item);
  if (lower.includes("peoplesoft") || lower.includes("oracle")) return "Oracle PeopleSoft";
  if (lower.includes("whatsapp")) return "WhatsApp privacy";
  if (entities[0]) return entities[0];
  if (categories[0]) return categories[0];
  return item.title.split(":")[0].slice(0, 70);
}

function analyzeArticle(item: NewsItem): ArticleAnalysis {
  const text = textFor(item);
  const cves = extractCves(item);
  const categories = articleCategories(text, cves);
  const entities = extractEntities(item);
  const sector = affectedSector(text);
  const isRecap = categories.includes("Weekly Recap");
  const prevent = preventability(categories);
  const labels = relevanceLabels(categories, sector);
  const theme = clusterTheme(item, categories, cves, entities, isRecap);
  const clusterKey = `${isRecap ? "recap" : "story"}:${theme.toLowerCase()}`;

  return {
    categories: categories.length ? categories : ["Advisory"],
    cves,
    entities,
    sector,
    whyItMatters: whyItMatters(categories, sector),
    defenderTakeaway: defenderTakeaway(categories, entities, sector),
    preventability: prevent.value,
    preventabilityReason: prevent.reason,
    confidence:
      cves.length > 0 || entities.length > 1 || categories.length > 2
        ? "High confidence"
        : "Medium confidence",
    clusterKey,
    clusterTheme: theme,
    isRecap,
    ...labels,
  };
}

function clusterTitle(theme: string, categories: string[], entities: string[]) {
  if (categories.includes("Weekly Recap")) return `${theme}: editorial roundup`;
  if (categories.includes("Exploited CVE")) return `${theme}: exploited vulnerability activity`;
  if (categories.includes("Breach")) return `${theme}: breach or data exposure`;
  if (categories.includes("Privacy")) return `${theme}: privacy and user exposure`;
  return `${theme}: security development`;
}

function clusterSummary(cluster: StoryCluster) {
  const entityText = cluster.entities.slice(0, 3).join(", ") || cluster.sector;
  const categoryText = cluster.categories.slice(0, 2).join(" and ").toLowerCase();

  return `${cluster.articles.length} related article${cluster.articles.length === 1 ? "" : "s"} describe ${categoryText} activity involving ${entityText}.`;
}

function clusterScore(cluster: StoryCluster) {
  const categories = cluster.categories;
  let score = 0;

  if (categories.includes("Exploited CVE")) score += 40;
  if (categories.includes("Breach")) score += 30;
  if (categories.includes("Ransomware") || categories.includes("Malware")) score += 24;
  if (["Healthcare", "Finance", "Government", "Critical Infrastructure"].includes(cluster.sector)) {
    score += 20;
  }
  score += Math.min(20, cluster.sources.length * 6);
  score += Math.min(12, cluster.articles.length * 3);
  score += Math.min(10, Math.max(0, Date.now() - cluster.latestTimestamp) < 3 * 86_400_000 ? 10 : 3);
  if (cluster.defenderRelevance.includes("High")) score += 12;
  if (cluster.isRecap) score -= 25;

  return score;
}

function buildClusters(items: NewsItem[]) {
  const grouped = new Map<string, StoryCluster>();

  items.forEach((item) => {
    const analysis = analyzeArticle(item);
    const existing = grouped.get(analysis.clusterKey);

    if (!existing) {
      const cluster: StoryCluster = {
        key: analysis.clusterKey,
        title: "",
        summary: "",
        categories: analysis.categories,
        cves: analysis.cves,
        entities: analysis.entities,
        sector: analysis.sector,
        sources: [item.source],
        articles: [{ item, analysis }],
        whyItMatters: analysis.whyItMatters,
        defenderTakeaway: analysis.defenderTakeaway,
        preventability: analysis.preventability,
        preventabilityReason: analysis.preventabilityReason,
        impactLabel: analysis.impactLabel,
        defenderRelevance: analysis.defenderRelevance,
        publicRelevance: analysis.publicRelevance,
        confidence: analysis.confidence,
        latestTimestamp: item.timestamp || Date.parse(item.pubDate) || 0,
        score: 0,
        isRecap: analysis.isRecap,
      };
      cluster.title = clusterTitle(analysis.clusterTheme, cluster.categories, cluster.entities);
      cluster.summary = clusterSummary(cluster);
      grouped.set(analysis.clusterKey, cluster);
      return;
    }

    existing.articles.push({ item, analysis });
    existing.categories = unique([...existing.categories, ...analysis.categories]);
    existing.cves = unique([...existing.cves, ...analysis.cves]);
    existing.entities = unique([...existing.entities, ...analysis.entities]).slice(0, 12);
    existing.sources = unique([...existing.sources, item.source]);
    existing.latestTimestamp = Math.max(
      existing.latestTimestamp,
      item.timestamp || Date.parse(item.pubDate) || 0,
    );
    existing.summary = clusterSummary(existing);
  });

  return Array.from(grouped.values())
    .map((cluster) => ({ ...cluster, score: clusterScore(cluster) }))
    .sort((a, b) => b.score - a.score || b.latestTimestamp - a.latestTimestamp);
}

function makeBrief(clusters: StoryCluster[], items: NewsItem[], updatedAt: string | null) {
  const top = clusters[0];
  const repeatedEntities = new Map<string, number>();
  const sectors = unique(clusters.slice(0, 5).map((cluster) => cluster.sector));

  clusters.forEach((cluster) =>
    cluster.entities.forEach((entity) =>
      repeatedEntities.set(entity, (repeatedEntities.get(entity) || 0) + 1),
    ),
  );

  const keyEntity =
    Array.from(repeatedEntities.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "No repeated entity";

  return {
    topStory: top?.title || "No top story available",
    mainTheme: top?.categories.slice(0, 2).join(" / ") || "No theme available",
    affectedSectors: sectors.length ? sectors.join(", ") : "Not identified",
    keyEntity,
    actionTheme: top?.defenderTakeaway || "Review the latest source articles when news is available.",
    reviewed: items.length,
    updatedAt,
  };
}

function matchesFilter(cluster: StoryCluster, filter: string) {
  if (filter === "All") return true;
  return cluster.categories.includes(filter) || cluster.sector === filter;
}

function matchesKeyword(cluster: StoryCluster, keyword: string) {
  const normalized = keyword.trim().toLowerCase();

  if (!normalized) return true;

  return [
    cluster.title,
    cluster.summary,
    cluster.categories.join(" "),
    cluster.entities.join(" "),
    cluster.cves.join(" "),
    cluster.sector,
    ...cluster.articles.map(({ item }) => `${item.title} ${item.contentSnippet} ${item.source}`),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#8DA99B]/45 bg-[#E6E4DE]/75 px-3 py-1 text-xs font-bold text-[#466357]">
      {children}
    </span>
  );
}

function CveLinks({
  cves,
  onSelectCve,
}: {
  cves: string[];
  onSelectCve: (cve: string) => void;
}) {
  if (!cves.length) return <span>No CVE identified</span>;

  return (
    <span className="inline-flex flex-wrap gap-2 align-middle">
      {cves.map((cve) => (
        <button
          key={cve}
          type="button"
          onClick={() => onSelectCve(cve)}
          className="rounded-full border border-[#3F6B5A]/55 bg-white/65 px-2.5 py-1 text-xs font-black text-[#3F6B5A] underline-offset-2 transition hover:bg-white hover:underline"
          title={`Open ${cve} in Exploited CVEs`}
        >
          {cve}
        </button>
      ))}
    </span>
  );
}

function formatUpdated(value: string | null) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function cveSourceLabel(source?: NewsItem["cveSource"]) {
  if (source === "rss") return "RSS text";
  if (source === "article") return "source article";
  if (source === "kev") return "CISA KEV match";
  return "not found in RSS or source page";
}

export default function NewsFeed({
  selectedCve = "",
  onSelectCve,
}: {
  selectedCve?: string;
  onSelectCve: (cve: string) => void;
}) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const clusters = useMemo(() => buildClusters(items), [items]);
  const filteredClusters = useMemo(
    () =>
      clusters.filter(
        (cluster) =>
          matchesFilter(cluster, activeFilter) && matchesKeyword(cluster, keyword),
      ),
    [activeFilter, clusters, keyword],
  );
  const brief = useMemo(
    () => makeBrief(clusters, items, updatedAt),
    [clusters, items, updatedAt],
  );

  useEffect(() => {
    if (!selectedCve) return;

    setKeyword(selectedCve);
    setActiveFilter("All");
    setPage(0);
  }, [selectedCve]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword && activeFilter === "All") return items;

    return items.filter((item) => {
      const analysis = analyzeArticle(item);
      const filterMatch =
        activeFilter === "All" ||
        analysis.categories.includes(activeFilter) ||
        analysis.sector === activeFilter;
      const keywordMatch = !normalizedKeyword
        ? true
        : [item.source, item.title, item.contentSnippet, item.pubDate]
            .join(" ")
            .toLowerCase()
            .includes(normalizedKeyword);

      return filterMatch && keywordMatch;
    });
  }, [activeFilter, items, keyword]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = filteredItems.slice(
    page * pageSize,
    page * pageSize + pageSize,
  );

  useEffect(() => {
    fetch("/api/news")
      .then((res) => {
        if (!res.ok) {
          throw new Error("News request failed");
        }

        return res.json() as Promise<NewsResponse>;
      })
      .then((data) => {
        setItems(data.items || []);
        setUpdatedAt(data.updatedAt || null);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.3em] text-[#3F6B5A]">
            GLOBAL BREACH NEWS
          </p>
          <h2 className="mt-2 text-3xl font-black">
            Breach intelligence brief
          </h2>
          <p className="mt-2 text-[#466357]">
            Related stories are grouped into plain-English security clusters
            with CVEs, affected sectors, impact, and defender takeaways.
          </p>
        </div>

        {status === "ready" && (
          <div className="text-sm font-semibold text-[#466357]">
            <p>{clusters.length} story clusters</p>
            <p>Updated {formatUpdated(updatedAt)}</p>
          </div>
        )}
      </div>

      {status === "ready" && (
        <section className="mb-4 rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-5">
          <p className="text-sm font-black tracking-[0.24em] text-[#3F6B5A]">
            TODAY'S BREACH BRIEF
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#3F6B5A]">
                Top story
              </p>
              <h3 className="text-2xl font-black text-[#243B32]">
                {brief.topStory}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-[#466357]">
                {brief.actionTheme}
              </p>
            </div>
            <div className="grid gap-2 text-sm font-bold text-[#466357]">
              <p>Main theme: {brief.mainTheme}</p>
              <p>Affected sectors: {brief.affectedSectors}</p>
              <p>Key entity: {brief.keyEntity}</p>
              <p>Stories reviewed: {brief.reviewed}</p>
              <p>Last updated: {formatUpdated(brief.updatedAt)}</p>
            </div>
          </div>
        </section>
      )}

      <div className="mb-4 rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-[#466357]">
            Search brief
          </span>
          <input
            type="search"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(0);
            }}
            placeholder="Entity, CVE, sector, source, keyword..."
            className="w-full rounded-xl border border-[#8DA99B] bg-white/80 px-4 py-3 text-sm font-semibold text-[#243B32] outline-none focus:border-[#3F6B5A]"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => {
                setActiveFilter(filter);
                setPage(0);
              }}
              className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                activeFilter === filter
                  ? "border-[#3F6B5A] bg-[#3F6B5A] text-white"
                  : "border-[#8DA99B]/60 bg-white/60 text-[#466357] hover:bg-white"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <section className="mb-5 rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-2xl font-black text-[#243B32]">Story Clusters</h3>
          <p className="text-sm font-bold text-[#466357]">
            {filteredClusters.length} shown
          </p>
        </div>

        {status === "loading" && (
          <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
            Loading breach intelligence...
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
            Couldn't load breach news right now.
          </div>
        )}

        {status === "ready" && filteredClusters.length === 0 && (
          <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
            No matching story clusters found.
          </div>
        )}

        <div className="space-y-4">
          {filteredClusters.map((cluster) => (
            <article key={cluster.key} className="rounded-2xl bg-[#E6E4DE] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h4 className="text-2xl font-black text-[#243B32]">
                    {cluster.title}
                  </h4>
                  <p className="mt-2 max-w-4xl text-sm font-semibold leading-relaxed text-[#466357]">
                    {cluster.summary}
                  </p>
                </div>
                <div className="shrink-0 rounded-xl border border-[#8DA99B]/55 bg-white/55 px-4 py-3 text-sm font-black text-[#243B32]">
                  {cluster.articles.length} source{cluster.articles.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {cluster.categories.slice(0, 5).map((category) => (
                  <Pill key={category}>{category}</Pill>
                ))}
                <Pill>{cluster.impactLabel}</Pill>
                <Pill>{cluster.defenderRelevance}</Pill>
                <Pill>{cluster.publicRelevance}</Pill>
                <Pill>{cluster.confidence}</Pill>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl bg-[#F5F4EF] p-4">
                  <p className="text-xs font-black tracking-widest text-[#3F6B5A]">
                    Why it matters
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#466357]">
                    {cluster.whyItMatters}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F5F4EF] p-4">
                  <p className="text-xs font-black tracking-widest text-[#3F6B5A]">
                    Defender takeaway
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#466357]">
                    {cluster.defenderTakeaway}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm font-bold text-[#466357] md:grid-cols-3">
                <p>
                  Related CVEs:{" "}
                  <CveLinks cves={cluster.cves} onSelectCve={onSelectCve} />
                </p>
                <p>Affected sector: {cluster.sector}</p>
                <p>
                  Preventability: {cluster.preventability}.{" "}
                  <span className="font-semibold">{cluster.preventabilityReason}</span>
                </p>
              </div>

              <details className="mt-4 rounded-xl border border-[#8DA99B]/45 bg-white/45 p-4">
                <summary className="cursor-pointer text-sm font-black text-[#243B32]">
                  View details and sources
                </summary>
                <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-2 text-sm font-semibold text-[#466357]">
                    <p>Sources: {cluster.sources.join(", ")}</p>
                    <p>
                      Entities:{" "}
                      {cluster.entities.length ? cluster.entities.join(", ") : "None identified"}
                    </p>
                    <p>
                      CVEs: <CveLinks cves={cluster.cves} onSelectCve={onSelectCve} />
                    </p>
                    <p>Ranking score: {cluster.score}</p>
                    <p>Latest source date: {cluster.articles[0]?.item.pubDate}</p>
                  </div>
                  <div className="space-y-3">
                    {cluster.articles.slice(0, 3).map(({ item, analysis }) => (
                      <a
                        key={item.link}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl bg-[#F5F4EF] p-4 transition hover:bg-white"
                      >
                        <p className="text-xs font-black uppercase tracking-widest text-[#3F6B5A]">
                          {item.source} / {item.pubDate}
                        </p>
                        <p className="mt-2 font-black text-[#243B32]">{item.title}</p>
                        <p className="mt-2 text-sm text-[#466357]">
                          {item.contentSnippet}
                        </p>
                        <p className="mt-2 text-xs font-bold text-[#466357]">
                          {analysis.categories.join(", ")}
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#466357]">
                          CVEs: {analysis.cves.length ? analysis.cves.join(", ") : "No CVE identified"} / source:{" "}
                          {cveSourceLabel(item.cveSource)}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-2xl font-black text-[#243B32]">Raw Article Feed</h3>
          {status === "ready" && (
            <p className="text-sm font-bold text-[#466357]">
              Page {page + 1} of {totalPages}
            </p>
          )}
        </div>

        <div className="min-h-[360px] space-y-4">
          {status === "loading" && (
            <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
              Loading current security news...
            </div>
          )}

          {status === "error" && (
            <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
              Couldn't load breach news right now.
            </div>
          )}

          {status === "ready" && visibleItems.length === 0 && (
            <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
              {keyword.trim()
                ? "No articles match that keyword."
                : "No articles are available right now."}
            </div>
          )}

          {visibleItems.map((item) => {
            const analysis = analyzeArticle(item);

            return (
              <details
                key={item.link}
                className="rounded-2xl bg-[#E6E4DE] p-5"
              >
                <summary className="cursor-pointer list-none">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#3F6B5A]">
                    {item.source} / {item.pubDate}
                  </p>
                  <h4 className="mt-2 text-xl font-black text-[#243B32]">
                    {item.title}
                  </h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.categories.slice(0, 4).map((category) => (
                      <Pill key={category}>{category}</Pill>
                    ))}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#466357]">
                    {analysis.whyItMatters}
                  </p>
                </summary>
                <p className="mt-4 text-sm text-[#466357]">
                  {item.contentSnippet}
                </p>
                <div className="mt-4 grid gap-2 text-sm font-semibold text-[#466357] md:grid-cols-2">
                  <p>
                    CVEs: <CveLinks cves={analysis.cves} onSelectCve={onSelectCve} />
                  </p>
                  <p>CVE source: {cveSourceLabel(item.cveSource)}</p>
                  <p>Sector: {analysis.sector}</p>
                  <p>Preventability: {analysis.preventability}</p>
                  <p>{analysis.defenderTakeaway}</p>
                </div>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex rounded-xl bg-[#3F6B5A] px-4 py-2 text-sm font-bold text-white"
                >
                  Open article
                </a>
              </details>
            );
          })}
        </div>

        {status === "ready" && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0}
              className="rounded-xl border border-[#8DA99B] px-4 py-2 text-sm font-bold text-[#243B32] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <p className="text-sm font-semibold text-[#466357]">
              Showing {visibleItems.length} of {filteredItems.length}
            </p>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages - 1, current + 1))
              }
              disabled={page >= totalPages - 1}
              className="rounded-xl border border-[#8DA99B] px-4 py-2 text-sm font-bold text-[#243B32] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
