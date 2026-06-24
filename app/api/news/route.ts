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
  const feed = await parser.parseURL(source.feed);

  return feed.items
    .map((item) => {
      const link = normalizeUrl(item.link || item.guid);

      if (!link || !isArticleLink(link, source) || !item.title) {
        return null;
      }

      const timestamp = toTimestamp(item.isoDate || item.pubDate);

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
        contentSnippet:
          item.contentSnippet?.replace(/\s+/g, " ").trim() ||
          "Open the original report for full details.",
      };
    })
    .filter((item): item is NewsItem => Boolean(item));
}

export async function GET() {
  const settled = await Promise.allSettled(SOURCES.map(readFeed));
  const seen = new Set<string>();

  const items = settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => {
      if (seen.has(item.link)) return false;
      seen.add(item.link);
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 40);

  return Response.json({
    updatedAt: new Date().toISOString(),
    pageSize: 10,
    sources: SOURCES.map(({ name, homepage }) => ({ name, homepage })),
    items,
  });
}
