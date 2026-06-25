import Parser from "rss-parser";

export const revalidate = 86400;

type FeedSource = {
  name: string;
  homepage: string;
  feed: string;
};

type Article = {
  source: string;
  title: string;
  link: string;
  pubDate: string;
  timestamp: number;
  contentSnippet: string;
};

type ImpactProfile = {
  industry: string;
  affectedSystem: string;
  humanImpact: string[];
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

const IMPACT_PROFILES: { keywords: string[]; profile: ImpactProfile }[] = [
  {
    keywords: ["hospital", "health", "clinic", "patient", "medical"],
    profile: {
      industry: "Healthcare",
      affectedSystem: "Clinical scheduling, patient records, or care coordination systems",
      humanImpact: [
        "Appointments or procedures can be delayed while staff fall back to manual workflows",
        "Patients may wait longer for prescriptions, lab results, referrals, or billing answers",
        "Care teams spend more time reconciling records instead of focusing on people",
        "A routine health issue can become more stressful, expensive, or harder to navigate",
      ],
    },
  },
  {
    keywords: ["farm", "agriculture", "food", "grain", "wheat", "dairy", "meat"],
    profile: {
      industry: "Food and Agriculture",
      affectedSystem: "Production planning, logistics, inventory, or industrial control systems",
      humanImpact: [
        "Farm or processing operations may slow while systems are restored",
        "Reduced production can tighten availability for ingredients or finished goods",
        "Retailers and restaurants may face higher prices or inconsistent supply",
        "Households can feel the impact as everyday staples become less predictable",
      ],
    },
  },
  {
    keywords: ["school", "university", "college", "student", "education"],
    profile: {
      industry: "Education",
      affectedSystem: "Learning platforms, identity systems, payroll, or student records",
      humanImpact: [
        "Classes, assignments, or campus services can be interrupted",
        "Students and families may lose access to schedules, grades, or financial records",
        "Staff may shift to manual work and take longer to resolve support requests",
        "A disruption can widen stress for students who rely on school services daily",
      ],
    },
  },
  {
    keywords: ["bank", "payment", "fintech", "credit", "loan", "financial"],
    profile: {
      industry: "Financial Services",
      affectedSystem: "Payment processing, customer portals, fraud systems, or account services",
      humanImpact: [
        "People may lose easy access to balances, transfers, or payment history",
        "Merchants and customers may experience delayed transactions or support backlogs",
        "Fraud monitoring and account recovery work can become slower",
        "A missed payment or blocked account can ripple into fees, stress, or credit concerns",
      ],
    },
  },
  {
    keywords: ["water", "electric", "power", "energy", "utility", "pipeline", "grid"],
    profile: {
      industry: "Utilities and Energy",
      affectedSystem: "Operational technology, dispatch, billing, or monitoring systems",
      humanImpact: [
        "Operators may reduce automation and rely on manual checks",
        "Outage response, maintenance, or customer notices can slow down",
        "Local communities may see service instability or longer restoration windows",
        "Basic household routines become harder when essential services feel uncertain",
      ],
    },
  },
  {
    keywords: ["transport", "shipping", "airport", "airline", "rail", "logistics", "freight"],
    profile: {
      industry: "Transportation and Logistics",
      affectedSystem: "Routing, booking, dispatch, warehouse, or fleet management systems",
      humanImpact: [
        "Shipments, travel, or deliveries may be delayed while systems recover",
        "Businesses may struggle to restock inventory or meet customer commitments",
        "Individuals may face missed appointments, travel disruption, or late essentials",
        "Small delays can compound across supply chains and everyday schedules",
      ],
    },
  },
  {
    keywords: ["ransomware", "breach", "stolen", "credentials", "data leak", "extortion"],
    profile: {
      industry: "Digital Services",
      affectedSystem: "Identity, customer data, internal operations, or support systems",
      humanImpact: [
        "People may need to reset passwords, monitor accounts, or verify suspicious messages",
        "Support teams can become overwhelmed, slowing help for everyday users",
        "Scammers may use leaked context to make phishing more convincing",
        "A technical incident can turn into personal time loss, anxiety, and financial risk",
      ],
    },
  },
];

const DEFAULT_PROFILE: ImpactProfile = {
  industry: "General Business Operations",
  affectedSystem: "Internal applications, identity systems, data stores, or operational workflows",
  humanImpact: [
    "Employees may lose access to normal tools and switch to slower manual processes",
    "Customers may face delays, missing updates, or reduced support quality",
    "Downstream partners can experience uncertainty around orders, billing, or service delivery",
    "The human impact often shows up as lost time, stress, higher costs, and reduced trust",
  ],
};

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

function classifyImpact(article: Article) {
  const text = `${article.title} ${article.contentSnippet}`.toLowerCase();
  return (
    IMPACT_PROFILES.find(({ keywords }) =>
      keywords.some((keyword) => text.includes(keyword)),
    )?.profile || DEFAULT_PROFILE
  );
}

function isBreachLike(article: Article) {
  const text = `${article.title} ${article.contentSnippet}`.toLowerCase();
  return [
    "attack",
    "breach",
    "cyberattack",
    "data leak",
    "extortion",
    "hacked",
    "malware",
    "outage",
    "ransomware",
    "stolen",
    "vulnerability",
  ].some((keyword) => text.includes(keyword));
}

async function readFeed(source: FeedSource): Promise<Article[]> {
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
    .filter((item): item is Article => Boolean(item));
}

export async function GET() {
  const settled = await Promise.allSettled(SOURCES.map(readFeed));
  const seen = new Set<string>();
  const articles = settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((article) => {
      if (seen.has(article.link)) return false;
      seen.add(article.link);
      return true;
    })
    .filter(isBreachLike)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)
    .map((article) => {
      const profile = classifyImpact(article);

      return {
        ...article,
        industry: profile.industry,
        affectedSystem: profile.affectedSystem,
        humanImpact: profile.humanImpact,
      };
    });

  return Response.json({
    updatedAt: new Date().toISOString(),
    disclaimer:
      "Impact chains are hypothetical human-centered scenarios based on article context and industry patterns, not claims about confirmed downstream harm.",
    items: articles,
  });
}
