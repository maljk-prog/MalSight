import Parser from "rss-parser";

export const revalidate = 21600;
export const dynamic = "force-dynamic";

type TrendItem = {
  title?: string;
  contentSnippet?: string;
  isoDate?: string;
  pubDate?: string;
  link?: string;
  approxTraffic?: string;
};

type TrendArticle = {
  title: string;
  source: string;
  publishedAt: string | null;
  link: string;
};

type TrendSignal = {
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
  articles: TrendArticle[];
};

type WeightedTerm = {
  term: string;
  weight: number;
};

type MysteryTopic = {
  title: string;
  stats: string[];
  analogy: string;
};

type ScoreResult = {
  qualifies: boolean;
  score: number;
  label: string;
  components: any;
  matchedSignals: string[];
};

type ScoredTrendEntry = {
  item: TrendItem;
  index: number;
  traffic: number;
  source?: string;
  cyberTrend: ScoreResult;
  publicPanic: ScoreResult;
  risePercent?: number | null;
  recentCount?: number | null;
  baselineCount?: number | null;
  articles?: TrendArticle[];
};

const GOOGLE_TRENDS_RSS = "https://trends.google.com/trending/rss?geo=US";
const GOOGLE_NEWS_SEARCH_RSS =
  "https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=";

const CYBER_TOPIC_QUERIES = [
  "ransomware",
  "data breach",
  "zero day vulnerability",
  "CVE exploit",
  "phishing campaign",
  "malware",
  "credential stuffing",
  "authentication bypass",
  "privilege escalation",
  "botnet",
  "infostealer",
  "CISA KEV",
  "Microsoft vulnerability",
  "Okta breach",
];

const PANIC_TOPIC_QUERIES = [
  "account hacked",
  "password leaked",
  "identity theft",
  "data breach",
  "phone hacked",
  "email hacked",
  "ransomware attack",
  "scam text",
  "credit card stolen",
  "personal information leaked",
  "bank fraud",
  "phishing email",
];

const CRITICAL_CYBER_TERMS: WeightedTerm[] = [
  { term: "ransomware", weight: 20 },
  { term: "zero-day", weight: 20 },
  { term: "zero day", weight: 20 },
  { term: "exploit", weight: 18 },
  { term: "vulnerability", weight: 18 },
  { term: "cve", weight: 18 },
  { term: "malware", weight: 17 },
  { term: "backdoor", weight: 17 },
  { term: "rootkit", weight: 17 },
  { term: "trojan", weight: 16 },
  { term: "worm", weight: 16 },
  { term: "spyware", weight: 16 },
  { term: "credential stuffing", weight: 18 },
  { term: "rce", weight: 20 },
  { term: "remote code execution", weight: 20 },
  { term: "authentication bypass", weight: 18 },
  { term: "privilege escalation", weight: 18 },
  { term: "botnet", weight: 16 },
];

const CYBER_PHRASE_TERMS: WeightedTerm[] = [
  { term: "credential stuffing", weight: 18 },
  { term: "remote code execution", weight: 20 },
  { term: "authentication bypass", weight: 18 },
  { term: "privilege escalation", weight: 18 },
  { term: "exploit kit", weight: 12 },
  { term: "remote access", weight: 10 },
  { term: "dark web", weight: 10 },
  { term: "data breach", weight: 14 },
  { term: "zero day", weight: 20 },
  { term: "zero-day", weight: 20 },
];

const MEDIUM_CYBER_TERMS: WeightedTerm[] = [
  { term: "phishing", weight: 14 },
  { term: "breach", weight: 14 },
  { term: "leaked", weight: 13 },
  { term: "hacked", weight: 13 },
  { term: "compromise", weight: 12 },
  { term: "compromised", weight: 12 },
  { term: "ddos", weight: 12 },
  { term: "attack", weight: 11 },
  { term: "exploit kit", weight: 12 },
  { term: "remote access", weight: 10 },
  { term: "dark web", weight: 10 },
];

const LOW_CYBER_TERMS: WeightedTerm[] = [
  { term: "vpn", weight: 7 },
  { term: "firewall", weight: 7 },
  { term: "antivirus", weight: 6 },
  { term: "mfa", weight: 6 },
  { term: "passkey", weight: 6 },
  { term: "soc", weight: 5 },
  { term: "siem", weight: 5 },
  { term: "xdr", weight: 5 },
  { term: "edr", weight: 5 },
  { term: "defender", weight: 6 },
  { term: "crowdstrike", weight: 7 },
];

const CYBER_ENTITY_TERMS: WeightedTerm[] = [
  { term: "microsoft", weight: 15 },
  { term: "google", weight: 15 },
  { term: "apple", weight: 15 },
  { term: "amazon", weight: 15 },
  { term: "meta", weight: 14 },
  { term: "openai", weight: 14 },
  { term: "cisco", weight: 14 },
  { term: "oracle", weight: 14 },
  { term: "vmware", weight: 14 },
  { term: "okta", weight: 14 },
  { term: "fbi", weight: 15 },
  { term: "cisa", weight: 15 },
  { term: "nsa", weight: 15 },
  { term: "interpol", weight: 14 },
  { term: "hospital", weight: 15 },
  { term: "airport", weight: 14 },
  { term: "power grid", weight: 15 },
  { term: "telecom", weight: 14 },
  { term: "water", weight: 13 },
  { term: "pipeline", weight: 15 },
];

const KNOWN_CYBER_ENTITY_TERMS: WeightedTerm[] = [
  { term: "cisa", weight: 15 },
  { term: "nsa", weight: 15 },
  { term: "fbi", weight: 15 },
  { term: "interpol", weight: 14 },
  { term: "okta", weight: 14 },
  { term: "cisco", weight: 14 },
  { term: "vmware", weight: 14 },
  { term: "crowdstrike", weight: 14 },
  { term: "defender", weight: 12 },
  { term: "microsoft defender", weight: 15 },
];

const CRITICAL_SECTOR_TERMS: WeightedTerm[] = [
  { term: "hospital", weight: 15 },
  { term: "airport", weight: 14 },
  { term: "power grid", weight: 15 },
  { term: "telecom", weight: 14 },
  { term: "water", weight: 13 },
  { term: "pipeline", weight: 15 },
];

const COMBO_BONUSES: WeightedTerm[] = [
  { term: "microsoft+ransomware", weight: 12 },
  { term: "hospital+breach", weight: 15 },
  { term: "zero-day+microsoft", weight: 18 },
  { term: "zero day+microsoft", weight: 18 },
];

const HIGH_PANIC_TERMS: WeightedTerm[] = [
  { term: "account hacked", weight: 45 },
  { term: "password leaked", weight: 45 },
  { term: "identity theft", weight: 45 },
  { term: "bank hacked", weight: 45 },
  { term: "phone hacked", weight: 43 },
  { term: "email hacked", weight: 43 },
  { term: "ransomware attack", weight: 43 },
  { term: "scam text", weight: 40 },
  { term: "scam call", weight: 40 },
  { term: "data breach", weight: 42 },
  { term: "credit card stolen", weight: 45 },
  { term: "social security leak", weight: 45 },
  { term: "personal information leaked", weight: 45 },
];

const CONSUMER_RISK_PHRASES: WeightedTerm[] = [
  { term: "account hacked", weight: 45 },
  { term: "password leaked", weight: 45 },
  { term: "scam text", weight: 40 },
  { term: "scam call", weight: 40 },
  { term: "credit card stolen", weight: 45 },
  { term: "social security leak", weight: 45 },
  { term: "personal information leaked", weight: 45 },
  { term: "identity theft", weight: 45 },
];

const MEDIUM_PANIC_TERMS: WeightedTerm[] = [
  { term: "phishing email", weight: 30 },
  { term: "fake login", weight: 28 },
  { term: "crypto scam", weight: 28 },
  { term: "fake invoice", weight: 26 },
  { term: "fraud", weight: 28 },
  { term: "malware", weight: 26 },
  { term: "virus", weight: 24 },
];

const LOW_PANIC_TERMS: WeightedTerm[] = [
  { term: "vpn", weight: 10 },
  { term: "antivirus", weight: 10 },
  { term: "cybersecurity", weight: 8 },
  { term: "hacker", weight: 12 },
];

const PANIC_KEYWORD_TERMS: WeightedTerm[] = [
  { term: "fraud", weight: 28 },
  { term: "malware", weight: 26 },
  { term: "virus", weight: 24 },
  { term: "hacker", weight: 12 },
  { term: "vpn", weight: 10 },
  { term: "antivirus", weight: 10 },
  { term: "cybersecurity", weight: 8 },
];

const URGENCY_TERMS: WeightedTerm[] = [
  { term: "urgent", weight: 15 },
  { term: "warning", weight: 12 },
  { term: "alert", weight: 12 },
  { term: "immediately", weight: 14 },
  { term: "emergency", weight: 15 },
  { term: "exposed", weight: 13 },
  { term: "compromised", weight: 13 },
  { term: "active", weight: 10 },
  { term: "widespread", weight: 12 },
];

const PANIC_VICTIM_TERMS: WeightedTerm[] = [
  { term: "bank", weight: 10 },
  { term: "healthcare", weight: 10 },
  { term: "government", weight: 10 },
  { term: "school", weight: 9 },
  { term: "hospital", weight: 10 },
  { term: "airline", weight: 9 },
  { term: "amazon", weight: 10 },
  { term: "microsoft", weight: 10 },
  { term: "google", weight: 10 },
  { term: "apple", weight: 10 },
];

const FALSE_POSITIVE_PAIRS = [
  ["virus", "flu"],
  ["virus", "covid"],
  ["virus", "fever"],
  ["virus", "symptoms"],
  ["virus", "doctor"],
  ["virus", "vaccine"],
  ["worm", "fishing"],
  ["trojan", "horse"],
  ["bug", "insect"],
];

const MYSTERY_TOPICS: MysteryTopic[] = [
  {
    title: "ClickFix",
    stats: [
      "Social-engineering lure that pushes users to paste commands into their terminal or Run dialog.",
      "Often appears after fake browser errors, CAPTCHA prompts, or document-viewing problems.",
      "Common goal: install an infostealer before endpoint tools can attach context.",
      "Best defense: block clipboard-to-shell habits with user training and command-line telemetry.",
    ],
    analogy:
      "It is like a fake mechanic asking you to pour sugar into your own gas tank, then blaming the car.",
  },
  {
    title: "MFA Fatigue",
    stats: [
      "Attackers repeatedly trigger login prompts until a tired user approves one.",
      "Push-based MFA is most exposed when prompts do not show location, number matching, or app context.",
      "High-value accounts should favor phishing-resistant factors such as passkeys or hardware keys.",
      "A sudden burst of denied prompts is a useful early-warning signal.",
    ],
    analogy:
      "It works like someone leaning on a doorbell until the homeowner opens the door just to make it stop.",
  },
  {
    title: "Infostealers",
    stats: [
      "Stealers target browser cookies, saved passwords, crypto wallets, and session tokens.",
      "Stolen session cookies can bypass passwords and sometimes bypass MFA.",
      "Logs are commonly resold in criminal marketplaces and reused for cloud, email, and SaaS access.",
      "Detection improves when browser, process, and unusual-login signals are joined together.",
    ],
    analogy:
      "Think of it as a thief taking not just your keys, but the valet ticket that says which car is yours.",
  },
  {
    title: "Living Off The Land",
    stats: [
      "Attackers use trusted admin tools such as PowerShell, WMI, certutil, or remote-management agents.",
      "The activity can look legitimate unless command arguments and parent processes are inspected.",
      "Allowlists need behavior rules, not just binary names.",
      "Strong logging turns ordinary admin tools into useful tripwires.",
    ],
    analogy:
      "It is like a burglar wearing the building maintenance uniform and using the building's own ladder.",
  },
  {
    title: "Password Spraying",
    stats: [
      "Instead of many guesses against one account, attackers try one common password against many accounts.",
      "It is designed to avoid simple lockout thresholds.",
      "Seasonal words, company names, and leaked password patterns are common guesses.",
      "Tenant-wide failed-login patterns matter more than one user's login history.",
    ],
    analogy:
      "It is less like picking one lock and more like trying the same spare key on every door in a hallway.",
  },
  {
    title: "DNS Tunneling",
    stats: [
      "Data is hidden inside DNS queries and responses to sneak past networks that allow DNS freely.",
      "Long, random-looking subdomains are a common clue.",
      "It can support command-and-control, data theft, or payload staging.",
      "Baselines by host and domain age make detection much cleaner.",
    ],
    analogy:
      "It is like passing secret notes through the mailroom because everyone assumes mailroom traffic is harmless.",
  },
];

const parser = new Parser({
  customFields: {
    item: [["ht:approx_traffic", "approxTraffic"]],
  },
});

function parseTraffic(value?: string) {
  if (!value) return 0;

  const normalized = value.toLowerCase().replace(/\+/g, "").replace(/,/g, "");
  const number = Number.parseFloat(normalized);

  if (Number.isNaN(number)) return 0;
  if (normalized.includes("m")) return Math.round(number * 1_000_000);
  if (normalized.includes("k")) return Math.round(number * 1_000);
  return Math.round(number);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(safeNumber(value))));
}

function trendTrafficScore(traffic: number) {
  if (traffic >= 1_000_000) return 35;
  if (traffic >= 500_000) return 25;
  if (traffic >= 200_000) return 18;
  if (traffic >= 100_000) return 12;
  if (traffic >= 50_000) return 8;
  if (traffic >= 20_000) return 5;
  if (traffic >= 10_000) return 3;
  return 0;
}

function panicTrafficScore(traffic: number) {
  if (traffic >= 10_000_000) return 20;
  if (traffic >= 5_000_000) return 17;
  if (traffic >= 2_000_000) return 14;
  if (traffic >= 1_000_000) return 11;
  if (traffic >= 500_000) return 8;
  if (traffic >= 250_000) return 5;
  if (traffic >= 100_000) return 2;
  return 0;
}

function trendRankScore(rank: number) {
  if (rank <= 1) return 15;
  if (rank <= 5) return 12;
  if (rank <= 10) return 8;
  if (rank <= 20) return 5;
  return 0;
}

function panicRankScore(rank: number) {
  return Math.round((trendRankScore(rank) / 15) * 10);
}

function topicTrafficEstimate(recentCount: number) {
  if (recentCount >= 40) return 500_000;
  if (recentCount >= 28) return 250_000;
  if (recentCount >= 18) return 100_000;
  if (recentCount >= 10) return 50_000;
  if (recentCount >= 5) return 20_000;
  if (recentCount >= 3) return 10_000;
  return 0;
}

function momentumScore(recentCount: number, previousCount: number) {
  if (recentCount <= 0) return 0;
  if (previousCount <= 0) return Math.min(5, recentCount);

  const lift = recentCount / Math.max(1, previousCount / 3);
  if (lift >= 3) return 5;
  if (lift >= 2) return 4;
  if (lift >= 1.4) return 3;
  if (lift >= 1.1) return 2;
  return 1;
}

function risePercent(recentCount: number, baselineCount: number) {
  if (recentCount <= 0) return 0;
  if (baselineCount <= 0) return 100;

  return Math.max(0, Math.round(((recentCount - baselineCount) / baselineCount) * 100));
}

function safeNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function articleFromItem(item: TrendItem): TrendArticle | null {
  if (!item.title || !item.link) return null;

  const parts = item.title.split(" - ");
  const source = parts.length > 1 ? parts.at(-1) || "News source" : "News source";
  const title = parts.length > 1 ? parts.slice(0, -1).join(" - ") : item.title;

  return {
    title,
    source,
    publishedAt: item.isoDate || item.pubDate || null,
    link: item.link,
  };
}

function textForItem(item: TrendItem) {
  return `${item.title || ""} ${item.contentSnippet || ""}`.toLowerCase();
}

function matchedTerms(text: string, terms: WeightedTerm[]) {
  return terms.filter((item) => text.includes(item.term));
}

function maxWeight(matches: WeightedTerm[]) {
  return Math.max(...matches.map((item) => item.weight), 0);
}

function comboScore(text: string) {
  const matches = COMBO_BONUSES.filter((combo) => {
    const [left, right] = combo.term.split("+");
    return text.includes(left) && text.includes(right);
  });

  return {
    score: maxWeight(matches),
    labels: matches.map((item) => item.term.replace("+", " + ")),
  };
}

function cyberTrendLabel(score: number) {
  if (score >= 85) return "Critical";
  if (score >= 70) return "Major";
  if (score >= 50) return "Significant";
  if (score >= 25) return "Emerging";
  return "Low";
}

function panicLabel(score: number) {
  if (score >= 85) return "Widespread Concern";
  if (score >= 70) return "High Concern";
  if (score >= 50) return "Concerned";
  if (score >= 25) return "Watchful";
  return "Calm";
}

function capPublicConcernScore(score: number, independentSignals: number, traffic = Number.POSITIVE_INFINITY) {
  const scopeCap = traffic >= 500_000 ? 100 : traffic >= 100_000 ? 84 : 79;
  const scopedScore = Math.min(score, scopeCap);

  if (independentSignals >= 3) return scopedScore;
  if (independentSignals === 1) return Math.min(score, 75);
  return Math.min(scopedScore, 84);
}

function scoreCyberTrend(item: TrendItem, index: number, traffic: number) {
  const text = textForItem(item);
  const rank = index + 1;
  const keywordMatches = matchedTerms(text, [
    ...CRITICAL_CYBER_TERMS,
    ...MEDIUM_CYBER_TERMS,
    ...LOW_CYBER_TERMS,
  ]);
  const phraseMatches = matchedTerms(text, CYBER_PHRASE_TERMS);
  const entityMatches = matchedTerms(text, CYBER_ENTITY_TERMS);
  const knownCyberEntityMatches = matchedTerms(text, KNOWN_CYBER_ENTITY_TERMS);
  const sectorMatches = matchedTerms(text, CRITICAL_SECTOR_TERMS);
  const combo = comboScore(text);
  const keywordScore = maxWeight(keywordMatches);
  const phraseScore = maxWeight(phraseMatches);
  const comboBonus = combo.score;
  const hasCyberContext = keywordScore > 0 || phraseScore > 0 || comboBonus > 0;
  const qualifies =
    hasCyberContext ||
    knownCyberEntityMatches.length > 0 ||
    (sectorMatches.length > 0 && hasCyberContext);
  const entitySectorScore = qualifies
    ? maxWeight([...entityMatches, ...knownCyberEntityMatches, ...sectorMatches])
    : 0;
  const components = {
    traffic: qualifies ? trendTrafficScore(traffic) : 0,
    rank: qualifies ? trendRankScore(rank) : 0,
    keyword: keywordScore,
    phrase: phraseScore,
    entitySector: entitySectorScore,
    urgency: 0,
    falsePositivePenalty: 0,
    combo: comboBonus,
    momentum: 0,
    final: 0,
  };
  const score = qualifies ? clampScore(
    components.traffic +
      components.rank +
      components.keyword +
      components.phrase +
      components.entitySector +
      components.combo +
      components.momentum,
  ) : 0;
  components.final = score;

  return {
    qualifies,
    score,
    label: cyberTrendLabel(score),
    components,
    matchedSignals: [
      ...keywordMatches.map((item) => item.term),
      ...phraseMatches.map((item) => item.term),
      ...entityMatches.map((item) => item.term),
      ...knownCyberEntityMatches.map((item) => item.term),
      ...sectorMatches.map((item) => item.term),
      ...combo.labels,
    ],
  };
}

function falsePositivePenalty(text: string) {
  return FALSE_POSITIVE_PAIRS.some(([left, right]) => text.includes(left) && text.includes(right))
    ? 20
    : 0;
}

function scorePanic(item: TrendItem, index: number, traffic: number) {
  const text = textForItem(item);
  const rank = index + 1;
  const panicMatches = matchedTerms(text, [
    ...PANIC_KEYWORD_TERMS,
  ]);
  const consumerRiskMatches = matchedTerms(text, [
    ...HIGH_PANIC_TERMS,
    ...MEDIUM_PANIC_TERMS,
    ...CONSUMER_RISK_PHRASES,
  ]);
  const securityContextMatches = matchedTerms(text, [
    ...CRITICAL_CYBER_TERMS,
    ...CYBER_PHRASE_TERMS,
    ...MEDIUM_CYBER_TERMS,
    ...LOW_CYBER_TERMS,
    ...HIGH_PANIC_TERMS,
    ...MEDIUM_PANIC_TERMS,
    ...LOW_PANIC_TERMS,
  ]);
  const urgencyMatches = matchedTerms(text, URGENCY_TERMS);
  const victimMatches = matchedTerms(text, PANIC_VICTIM_TERMS);
  const penalty = falsePositivePenalty(text);
  const panicKeywordScore = maxWeight(panicMatches);
  const phraseScore = maxWeight(consumerRiskMatches);
  const urgencyScore = maxWeight(urgencyMatches);
  const victimScore = maxWeight(victimMatches);
  const qualifies =
    panicKeywordScore > 0 ||
    phraseScore > 0 ||
    (urgencyScore > 0 && securityContextMatches.length > 0);
  const independentSignals = [
    phraseScore > 0,
    traffic >= 500_000,
    urgencyScore > 0,
    victimScore > 0,
  ].filter(Boolean).length;
  const components = {
    panicKeywords: panicKeywordScore,
    keyword: panicKeywordScore,
    phrase: phraseScore,
    urgency: qualifies ? urgencyScore : 0,
    traffic: qualifies ? panicTrafficScore(traffic) : 0,
    rank: qualifies ? panicRankScore(rank) : 0,
    ranking: qualifies ? panicRankScore(rank) : 0,
    victim: qualifies ? victimScore : 0,
    entitySector: qualifies ? victimScore : 0,
    falsePositivePenalty: qualifies ? penalty : 0,
    final: 0,
  };
  const rawScore = qualifies ? clampScore(
    components.panicKeywords +
      components.phrase +
      components.urgency +
      components.traffic +
      components.rank +
      components.victim -
      components.falsePositivePenalty,
  ) : 0;
  const score = qualifies
    ? capPublicConcernScore(rawScore, independentSignals, traffic)
    : 0;
  components.final = score;

  return {
    qualifies,
    score,
    label: panicLabel(score),
    components,
    matchedSignals: [
      ...panicMatches.map((item) => item.term),
      ...consumerRiskMatches.map((item) => item.term),
      ...urgencyMatches.map((item) => item.term),
      ...victimMatches.map((item) => item.term),
      ...(penalty ? ["false-positive penalty"] : []),
    ],
  };
}

function emptyFastestTrend(): TrendSignal {
  return {
    query: "No cyber trend detected",
    score: 0,
    label: "Low",
    traffic: 0,
    risePercent: 0,
    recentCount: 0,
    baselineCount: 0,
    rank: 0,
    source: "Google Trends daily trending searches",
    isLive: true,
    note:
      "The live Google Trends daily feed is reachable, but none of today's top searches produced a Cyber Trend Index signal.",
    link: GOOGLE_TRENDS_RSS,
    components: {
      traffic: 0,
      rank: 0,
      keyword: 0,
      phrase: 0,
      entitySector: 0,
      urgency: 0,
      falsePositivePenalty: 0,
      combo: 0,
      momentum: 0,
      final: 0,
    },
    matchedSignals: [],
    articles: [],
  };
}

function trendSignalFromItem(
  entry: ScoredTrendEntry,
): TrendSignal | null {
  const { item, index, traffic, cyberTrend } = entry;
  const isNewsMomentum = entry.source?.includes("Google News");

  if (!item.title) return null;

  return {
    query: item.title,
    score: cyberTrend.score,
    label: cyberTrend.label,
    traffic,
    risePercent: entry.risePercent ?? null,
    recentCount: entry.recentCount ?? null,
    baselineCount: entry.baselineCount ?? null,
    rank: index + 1,
    source: entry.source || "Google Trends daily trending searches",
    isLive: true,
    note: isNewsMomentum
      ? "Scored from security keyword relevance and Google News article momentum. Article counts are not raw search totals."
      : "Scored from search traffic, trend rank, cyber keyword weight, entity bonus, combination bonus, and available momentum.",
    link:
      item.link ||
      `https://trends.google.com/trends/explore?q=${encodeURIComponent(
        item.title,
    )}`,
    components: cyberTrend.components,
    matchedSignals: cyberTrend.matchedSignals,
    articles: entry.articles || [],
  };
}

async function fetchTrendItems(): Promise<ScoredTrendEntry[]> {
  const feed = await parser.parseURL(GOOGLE_TRENDS_RSS);

  return (feed.items as TrendItem[]).map((item, index) => ({
    item,
    index,
    traffic: parseTraffic(item.approxTraffic),
    cyberTrend: scoreCyberTrend(item, index, parseTraffic(item.approxTraffic)),
    publicPanic: scorePanic(item, index, parseTraffic(item.approxTraffic)),
  }));
}

async function fetchNewsTopicMomentum(query: string, index: number, mode: "cyber" | "panic") {
  const searchWindow = mode === "cyber" ? "31d" : "7d";
  const feed = await parser.parseURL(
    `${GOOGLE_NEWS_SEARCH_RSS}${encodeURIComponent(`${query} when:${searchWindow}`)}`,
  );
  const now = Date.now();
  const oneDay = 86_400_000;
  const twoDays = 2 * 86_400_000;
  const sevenDays = 7 * 86_400_000;
  const thirtyOneDays = 31 * 86_400_000;
  const baselineDays = mode === "cyber" ? 30 : 3;
  const items = (feed.items as TrendItem[]).slice(0, 40);
  const datedItems = items
    .map((item) => ({
      ...item,
      timestamp: Date.parse(item.isoDate || item.pubDate || ""),
    }))
    .filter((item) => Number.isFinite(item.timestamp));
  const recentItems = datedItems.filter((item) => now - item.timestamp <= twoDays);
  const recentSearchWindowItems = datedItems.filter((item) => now - item.timestamp <= oneDay);
  const baselineItems = datedItems.filter(
    (item) => now - item.timestamp > oneDay && now - item.timestamp <= thirtyOneDays,
  );
  const previousItems = datedItems.filter(
    (item) => now - item.timestamp > twoDays && now - item.timestamp <= sevenDays,
  );
  const baselineDailyCount = Number((baselineItems.length / baselineDays).toFixed(1));
  const securityRisePercent = risePercent(recentSearchWindowItems.length, baselineDailyCount);
  const articles = items
    .map(articleFromItem)
    .filter((article): article is TrendArticle => Boolean(article))
    .slice(0, 2);
  const traffic = topicTrafficEstimate(recentItems.length);
  const snippet = items
    .slice(0, 5)
    .map((item) => item.title)
    .filter(Boolean)
    .join(" ");
  const item: TrendItem = {
    title: query,
    contentSnippet: snippet,
    link: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
  };
  const cyberTrend = scoreCyberTrend(item, index, traffic);
  const publicPanic = scorePanic(item, index, traffic);
  const momentum = momentumScore(recentItems.length, previousItems.length);
  const selectedScore: ScoreResult = mode === "cyber" ? cyberTrend : publicPanic;

  if (selectedScore.qualifies) {
    selectedScore.components.momentum = momentum;
    selectedScore.components.final = clampScore(selectedScore.components.final + momentum);
    if (mode === "panic") {
      const independentSignals = [
        selectedScore.components.phrase > 0,
        traffic >= 500_000,
        selectedScore.components.urgency > 0,
        selectedScore.components.entitySector > 0,
        recentItems.length >= 3,
      ].filter(Boolean).length;
      selectedScore.components.final = capPublicConcernScore(
        selectedScore.components.final,
        independentSignals,
        traffic,
      );
    }
    selectedScore.score = selectedScore.components.final;
    selectedScore.label =
      mode === "cyber"
        ? cyberTrendLabel(selectedScore.score)
        : panicLabel(selectedScore.score);
    selectedScore.matchedSignals = Array.from(
      new Set([
        ...selectedScore.matchedSignals,
        `${recentItems.length} recent articles`,
        previousItems.length > 0
          ? `${previousItems.length} prior-window articles`
          : `new ${searchWindow} topic`,
      ]),
    );
  }

  return {
    item,
    index,
    traffic,
    source:
      mode === "cyber"
        ? "Google News cyber topic momentum"
        : "Google News public cyber-concern momentum",
    cyberTrend,
    publicPanic,
    risePercent: mode === "cyber" ? securityRisePercent : null,
    recentCount: mode === "cyber" ? recentSearchWindowItems.length : null,
    baselineCount: mode === "cyber" ? baselineDailyCount : null,
    articles: mode === "cyber" ? articles : [],
  };
}

async function fetchCyberTopicItems() {
  const settled = await Promise.allSettled(
    CYBER_TOPIC_QUERIES.map((query, index) =>
      fetchNewsTopicMomentum(query, index, "cyber"),
    ),
  );

  return settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
}

async function fetchPanicTopicItems() {
  const settled = await Promise.allSettled(
    PANIC_TOPIC_QUERIES.map((query, index) =>
      fetchNewsTopicMomentum(query, index, "panic"),
    ),
  );

  return settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
}

async function fetchFastestCyberTrend(
  items: ScoredTrendEntry[],
  topicItems: ScoredTrendEntry[],
) {
  const selected = items
    .concat(topicItems)
    .map((item, index) => ({
      ...item,
      index,
    }))
    .filter((entry) => entry.cyberTrend.qualifies)
    .sort(
      (a, b) =>
        (b.risePercent ?? -1) - (a.risePercent ?? -1) ||
        b.cyberTrend.score - a.cyberTrend.score ||
        b.traffic - a.traffic ||
        a.index - b.index,
    )[0];

  return selected ? trendSignalFromItem(selected) : null;
}

function weeklyIndex(date = new Date()) {
  const firstDay = Date.UTC(date.getUTCFullYear(), 0, 1);
  const currentDay = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const week = Math.floor((currentDay - firstDay) / (7 * 86_400_000));
  return week % MYSTERY_TOPICS.length;
}

function panicMeter(items: ScoredTrendEntry[]) {
  const matches = items
    .filter((entry) => entry.publicPanic.qualifies)
    .sort(
      (a, b) =>
        b.publicPanic.score - a.publicPanic.score ||
        b.traffic - a.traffic ||
        a.index - b.index,
    );

  if (matches.length === 0) {
    return {
      score: 0,
      label: "Calm",
      trackedTerms: HIGH_PANIC_TERMS.slice(0, 8).map((item) => item.term),
      baseline:
        "Live cyber topic feeds have no current matches for the Public Concern Index.",
      matchedSearches: [],
      components: {
        panicKeywords: 0,
        keyword: 0,
        phrase: 0,
        urgency: 0,
        traffic: 0,
        rank: 0,
        ranking: 0,
        victim: 0,
        entitySector: 0,
        falsePositivePenalty: 0,
        final: 0,
      },
    };
  }

  const topMatch = matches[0];
  const trackedTerms = HIGH_PANIC_TERMS.slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
    .map((item) => item.term);

  return {
    score: topMatch.publicPanic.score,
    label: topMatch.publicPanic.label,
    trackedTerms,
    baseline:
      "Based on panic phrases, urgency words, broader-scale search traffic, trend rank, trusted-service or victim targets, and false-positive penalties.",
    matchedSearches: matches.slice(0, 5).map((entry) => ({
      query: entry.item.title,
      traffic: entry.traffic,
      score: entry.publicPanic.score,
      label: entry.publicPanic.label,
      signals: entry.publicPanic.matchedSignals,
      components: entry.publicPanic.components,
    })),
    components: topMatch.publicPanic.components,
  };
}

export async function GET() {
  try {
    const [items, cyberTopicItems, panicTopicItems] = await Promise.all([
      fetchTrendItems(),
      fetchCyberTopicItems(),
      fetchPanicTopicItems(),
    ]);

    return Response.json({
      updatedAt: new Date().toISOString(),
      fastestRising: await fetchFastestCyberTrend(items, cyberTopicItems),
      panic: panicMeter(items.concat(panicTopicItems)),
      mysteryTopic: MYSTERY_TOPICS[weeklyIndex()],
    });
  } catch {
    return Response.json({
      updatedAt: new Date().toISOString(),
      fastestRising: null,
      panic: {
        score: null,
        label: "Listening",
        trackedTerms: HIGH_PANIC_TERMS.slice(0, 8).map((item) => item.term),
        baseline: "Google Trends is temporarily unavailable.",
        matchedSearches: [],
      },
      mysteryTopic: MYSTERY_TOPICS[weeklyIndex()],
    });
  }
}
