import Parser from "rss-parser";

export const revalidate = 86400;

type FeedSource = {
  name: string;
  homepage: string;
  feed: string;
};

type NewsItem = {
  source: string;
  title: string;
  link: string;
  pubDate: string;
  timestamp: number;
  contentSnippet: string;
  cves: string[];
  cveSource: "rss" | "article" | "none";
  cveCheckStatus: "full-article" | "feed-only";
};

const SOURCES: FeedSource[] = [
  {
    name: "BleepingComputer",
    homepage: "https://www.bleepingcomputer.com",
    feed: "https://www.bleepingcomputer.com/feed/",
  },
  {
    name: "KrebsOnSecurity",
    homepage: "https://krebsonsecurity.com",
    feed: "https://krebsonsecurity.com/feed/",
  },
  {
    name: "The Hacker News",
    homepage: "https://thehackernews.com",
    feed: "https://feeds.feedburner.com/TheHackersNews",
  },
  {
    name: "SecurityWeek",
    homepage: "https://www.securityweek.com",
    feed: "https://www.securityweek.com/feed/",
  },
];

const parser = new Parser();
const CVE_PATTERN = /CVE-\d{4}-\d{4,7}/gi;
const ARTICLE_FETCH_TIMEOUT_MS = 7000;
const ARTICLE_CONCURRENCY = 8;

function extractCves(text: string) {
  return Array.from(
    new Set((text.match(CVE_PATTERN) || []).map((cve) => cve.toUpperCase())),
  );
}

function normalizeUrl(value?: string) {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isArticleLink(link: string, source: FeedSource) {
  try {
    const url = new URL(link);
    const homepage = new URL(source.homepage);

    return (
      url.hostname.replace(/^www\./, "") ===
        homepage.hostname.replace(/^www\./, "") &&
      url.pathname !== "/" &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}

function toTimestamp(value?: string) {
  if (!value) return 0;

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

async function readFeed(source: FeedSource): Promise<NewsItem[]> {
  const response = await fetch(source.feed, {
    headers: { "User-Agent": "MalSight security news reader" },
    next: { revalidate: 86400 },
  });
  if (!response.ok) throw new Error(`Feed request failed: HTTP ${response.status}`);
  const feed = await parser.parseString(await response.text());

  return feed.items
    .map((item): NewsItem | null => {
      const link = normalizeUrl(item.link || item.guid);

      if (!link || !isArticleLink(link, source) || !item.title) {
        return null;
      }

      const timestamp = toTimestamp(item.isoDate || item.pubDate);
      const contentSnippet =
        item.contentSnippet?.replace(/\s+/g, " ").trim() ||
        "Open the original report for full details.";
      const rssText = [
        item.title,
        contentSnippet,
        item.content,
        item.summary,
      ].filter(Boolean).join(" ");
      const cves = extractCves(rssText);

      return {
        source: source.name,
        title: item.title,
        link,
        pubDate: timestamp
          ? new Intl.DateTimeFormat("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(timestamp)
          : "Recent",
        timestamp,
        contentSnippet,
        cves,
        cveSource: cves.length ? "rss" as const : "none" as const,
        cveCheckStatus: "feed-only" as const,
      };
    })
    .filter((item): item is NewsItem => Boolean(item));
}

function articleRelevantHtml(html: string) {
  const articleSections = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/gi);
  if (articleSections?.length) return articleSections.join(" ");

  const metadata = [
    ...html.matchAll(
      /<meta\b[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']*)["'][^>]*>/gi,
    ),
    ...html.matchAll(
      /<meta\b[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*>/gi,
    ),
  ].map((match) => match[1]);
  const articleBodies = Array.from(
    html.matchAll(/"articleBody"\s*:\s*"((?:\\.|[^"\\])*)"/gi),
    (match) => match[1],
  );

  return [...metadata, ...articleBodies].join(" ");
}

async function inspectArticle(item: NewsItem): Promise<NewsItem> {
  try {
    const response = await fetch(item.link, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "MalSight breach news CVE verifier contact: github.com/maljk-prog/MalSight",
      },
      signal: AbortSignal.timeout(ARTICLE_FETCH_TIMEOUT_MS),
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const articleCves = extractCves(articleRelevantHtml(await response.text()));
    const cves = Array.from(new Set([...item.cves, ...articleCves]));
    return {
      ...item,
      cves,
      cveSource: articleCves.length ? "article" : item.cveSource,
      cveCheckStatus: "full-article",
    };
  } catch {
    return item;
  }
}

async function inspectArticles(items: NewsItem[]) {
  const enriched: NewsItem[] = [];
  for (let index = 0; index < items.length; index += ARTICLE_CONCURRENCY) {
    const batch = items.slice(index, index + ARTICLE_CONCURRENCY);
    enriched.push(...await Promise.all(batch.map(inspectArticle)));
  }
  return enriched;
}

export async function GET() {
  const settled = await Promise.allSettled(SOURCES.map(readFeed));
  const seen = new Set<string>();

  const candidates = settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => {
      if (seen.has(item.link)) return false;
      seen.add(item.link);
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 40);
  const items = await inspectArticles(candidates);

  return Response.json({
    updatedAt: new Date().toISOString(),
    pageSize: 10,
    sources: SOURCES.map(({ name, homepage }) => ({ name, homepage })),
    items,
  });
}
