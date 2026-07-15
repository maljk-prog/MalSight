import type {
  DataMode,
  NormalizedIoc,
  SourceDataset,
  SourceStatus,
  ThreatSignalName,
} from "./types";
import { datasetHasValidatedContent, isDatasetFresh, normalizeIoc } from "./validation";

type Fetcher = typeof fetch;

type AdapterResult = {
  dataset: SourceDataset | null;
  status: SourceStatus;
};

type SourceAdapter = {
  name: string;
  ttlMs: number;
  configured: () => boolean;
  fetch: (fetcher: Fetcher, now: number) => Promise<SourceDataset>;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const LIVE_REFRESH_MS = DAY;
const LIVE_REFRESH_SECONDS = 24 * 60 * 60;
const cache = new Map<string, SourceDataset>();

function status(
  name: string,
  configured: boolean,
  mode: DataMode,
  sourceStatus: SourceStatus["status"],
  retrievedAt: string | null,
  itemCount: number,
  message: string,
): SourceStatus {
  return {
    name,
    configured,
    mode,
    status: sourceStatus,
    retrievedAt,
    itemCount,
    message,
  };
}

function makeDataset(
  source: string,
  ttlMs: number,
  retrievedAt: string,
  iocs: NormalizedIoc[],
  signals: Partial<Record<ThreatSignalName, number>>,
) {
  const normalized = iocs
    .map(normalizeIoc)
    .filter((ioc): ioc is NormalizedIoc => Boolean(ioc));

  return {
    source,
    ttlMs,
    retrievedAt,
    iocs: normalized,
    signals,
    status: status(
      source,
      true,
      "live",
      "validated",
      retrievedAt,
      normalized.length,
      "Validated live data",
    ),
  } satisfies SourceDataset;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim().replace(/^"|"$/g, ""));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function fetchCisaKev(fetcher: Fetcher, now: number) {
  const response = await fetcher(
    "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
    { next: { revalidate: LIVE_REFRESH_SECONDS } },
  );
  if (!response.ok) throw new Error("CISA KEV request failed");

  const payload = await response.json();
  if (!isObject(payload) || !Array.isArray(payload.vulnerabilities)) {
    throw new Error("CISA KEV response malformed");
  }

  const cutoff = now - 30 * DAY;
  const recent = payload.vulnerabilities.filter((entry: unknown) => {
    if (!isObject(entry)) return false;
    if (!/^CVE-\d{4}-\d{4,7}$/i.test(readString(entry.cveID))) return false;
    const dateAdded = Date.parse(readString(entry.dateAdded));
    return Number.isFinite(dateAdded) && dateAdded >= cutoff;
  });

  if (!payload.vulnerabilities.length) throw new Error("CISA KEV response empty");

  return makeDataset(
    "CISA KEV",
    LIVE_REFRESH_MS,
    new Date(now).toISOString(),
    [],
    {
      knownExploitedCves: recent.length,
      criticalCves: recent.filter((entry: Record<string, unknown>) =>
        /critical|ransomware|remote code execution|privilege escalation/i.test(
          `${readString(entry.vulnerabilityName)} ${readString(entry.shortDescription)} ${readString(entry.knownRansomwareCampaignUse)}`,
        ),
      ).length,
    },
  );
}

async function fetchUrlhaus(fetcher: Fetcher, now: number) {
  const response = await fetcher("https://urlhaus.abuse.ch/downloads/text/", {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("URLhaus request failed");

  const text = await response.text();
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (!rows.length) throw new Error("URLhaus response empty");

  const iocs = rows.map((url) => ({
    type: "url" as const,
    value: url,
    source: "URLhaus",
    firstSeen: null,
    lastSeen: null,
    category: "malicious-url",
    confidence: "medium" as const,
  }));

  return makeDataset("URLhaus", LIVE_REFRESH_MS, new Date(now).toISOString(), iocs, {
    phishingActivity: iocs.filter((ioc) => /phish|login|account|verify/i.test(ioc.value)).length,
  });
}

async function fetchUrlhausDomains(fetcher: Fetcher, now: number) {
  const response = await fetcher("https://urlhaus.abuse.ch/downloads/hostfile/", {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("URLhaus domains request failed");

  const text = await response.text();
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (!rows.length) throw new Error("URLhaus domains response empty");

  const iocs = rows
    .map((line): NormalizedIoc | null => {
      const [, domain] = line.split(/\s+/);
      if (!domain) return null;

      return {
        type: "domain" as const,
        value: domain,
        source: "URLhaus Domains",
        firstSeen: null,
        lastSeen: null,
        category: "malicious-domain",
        confidence: "medium" as const,
      };
    })
    .filter((ioc): ioc is NormalizedIoc => Boolean(ioc));

  if (!iocs.length) throw new Error("URLhaus domains response empty");

  return makeDataset("URLhaus Domains", LIVE_REFRESH_MS, new Date(now).toISOString(), iocs, {
    iocVolume: iocs.length,
  });
}

async function fetchMalwareBazaarRecent(fetcher: Fetcher, now: number) {
  const response = await fetcher("https://bazaar.abuse.ch/export/csv/recent/", {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("MalwareBazaar Recent request failed");

  const text = await response.text();
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (!rows.length) throw new Error("MalwareBazaar Recent response empty");

  const cutoff = now - DAY;
  const iocs = rows
    .map((line): NormalizedIoc | null => {
      const values = parseCsvLine(line);
      const firstSeen = values[0];
      const sha256 = values[1];
      const fileType = values[6];
      const signature = values[8];
      const firstSeenAt = Date.parse(`${firstSeen} UTC`);

      if (!Number.isFinite(firstSeenAt) || firstSeenAt < cutoff) return null;
      if (!sha256) return null;

      return {
        type: "hash" as const,
        value: sha256,
        source: "MalwareBazaar Recent",
        firstSeen: firstSeen || null,
        lastSeen: firstSeen || null,
        malwareFamily: signature && signature !== "n/a" ? signature : undefined,
        category: fileType || "malware-sample",
        confidence: "high" as const,
      };
    })
    .filter((ioc): ioc is NormalizedIoc => Boolean(ioc));

  if (!iocs.length) {
    return makeDataset("MalwareBazaar Recent", LIVE_REFRESH_MS, new Date(now).toISOString(), [], {});
  }

  return makeDataset("MalwareBazaar Recent", LIVE_REFRESH_MS, new Date(now).toISOString(), iocs, {
    iocVolume: iocs.length,
    malwareSubmissions: iocs.length,
  });
}

async function fetchEmergingThreatsCompromisedIps(fetcher: Fetcher, now: number) {
  const response = await fetcher("https://rules.emergingthreats.net/blockrules/compromised-ips.txt", {
    next: { revalidate: LIVE_REFRESH_SECONDS },
  });
  if (!response.ok) throw new Error("Emerging Threats request failed");

  const text = await response.text();
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (!rows.length) throw new Error("Emerging Threats response empty");

  const iocs = rows.map((ip) => ({
    type: "ip" as const,
    value: ip,
    source: "Emerging Threats",
    firstSeen: null,
    lastSeen: null,
    category: "compromised-ip",
    confidence: "high" as const,
  }));

  return makeDataset("Emerging Threats", LIVE_REFRESH_MS, new Date(now).toISOString(), iocs, {
    iocVolume: iocs.length,
    internetScanning: iocs.length,
  });
}

async function fetchBlocklistDe(fetcher: Fetcher, now: number) {
  const response = await fetcher("https://lists.blocklist.de/lists/all.txt", {
    next: { revalidate: LIVE_REFRESH_SECONDS },
  });
  if (!response.ok) throw new Error("blocklist.de request failed");

  const text = await response.text();
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (!rows.length) throw new Error("blocklist.de response empty");

  const iocs = rows.map((ip) => ({
    type: "ip" as const,
    value: ip,
    source: "blocklist.de",
    firstSeen: null,
    lastSeen: null,
    category: "abusive-ip",
    confidence: "medium" as const,
  }));

  return makeDataset("blocklist.de", LIVE_REFRESH_MS, new Date(now).toISOString(), iocs, {
    iocVolume: iocs.length,
    internetScanning: iocs.length,
  });
}

async function fetchDshield(fetcher: Fetcher, now: number) {
  const response = await fetcher("https://isc.sans.edu/api/sources/attacks/75?json", {
    headers: {
      "User-Agent": "MalSight threat weather contact: github.com/maljk-prog/MalSight",
    },
    next: { revalidate: LIVE_REFRESH_SECONDS },
  });
  if (!response.ok) throw new Error("DShield request failed");

  const payload = await response.json();
  const rows = Array.isArray(payload)
    ? payload
    : isObject(payload) && Array.isArray(payload.value)
      ? payload.value
      : null;

  if (!rows) throw new Error("DShield response malformed");
  if (!rows.length) throw new Error("DShield response empty");

  const attacks = rows.reduce((total: number, entry: unknown) => {
    if (!isObject(entry)) return total;
    return total + Number(String(entry.attacks || "0").replace(/,/g, ""));
  }, 0);

  return makeDataset("SANS ISC DShield", LIVE_REFRESH_MS, new Date(now).toISOString(), [], {
    internetScanning: attacks,
  });
}

async function fetchPhishTank(fetcher: Fetcher, now: number) {
  const response = await fetcher("http://data.phishtank.com/data/online-valid.csv", {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("PhishTank request failed");

  const text = await response.text();
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length <= 1) throw new Error("PhishTank response empty");

  const [, ...dataRows] = rows;
  const cutoff = now - DAY;
  const iocs = dataRows
    .map((line): NormalizedIoc | null => {
      const values = parseCsvLine(line);
      const url = values[1];
      const submissionTime = values[3];
      const verified = values[4];
      const verificationTime = values[5];
      const online = values[6];
      const target = values[7];
      const submittedAt = Date.parse(submissionTime);

      if (verified !== "yes" || online !== "yes") return null;
      if (!Number.isFinite(submittedAt) || submittedAt < cutoff) return null;

      return {
        type: "url" as const,
        value: url,
        source: "PhishTank",
        firstSeen: submissionTime || null,
        lastSeen: verificationTime || null,
        category: target ? `phishing:${target}` : "phishing",
        confidence: "high" as const,
      };
    })
    .filter((ioc): ioc is NormalizedIoc => Boolean(ioc));

  if (!iocs.length) throw new Error("PhishTank response empty");

  return makeDataset("PhishTank", LIVE_REFRESH_MS, new Date(now).toISOString(), iocs, {
    iocVolume: iocs.length,
    phishingActivity: iocs.length,
  });
}

async function fetchOpenPhish(fetcher: Fetcher, now: number) {
  const response = await fetcher("https://openphish.com/feed.txt", {
    next: { revalidate: LIVE_REFRESH_SECONDS },
  });
  if (!response.ok) throw new Error("OpenPhish request failed");

  const text = await response.text();
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rows.length) throw new Error("OpenPhish response empty");

  const iocs = rows.map((url) => ({
    type: "url" as const,
    value: url,
    source: "OpenPhish",
    firstSeen: null,
    lastSeen: null,
    category: "phishing",
    confidence: "medium" as const,
  }));

  return makeDataset("OpenPhish", LIVE_REFRESH_MS, new Date(now).toISOString(), iocs, {
    phishingActivity: iocs.length,
  });
}

async function fetchMock(now: number) {
  if (process.env.NODE_ENV === "production" || process.env.MALSIGHT_USE_MOCK_THREAT_WEATHER !== "true") {
    throw new Error("Mock mode disabled");
  }

  return makeDataset(
    "Local development mock",
    HOUR,
    new Date(now).toISOString(),
    [
      {
        type: "ip",
        value: "203.0.113.10",
        source: "Local development mock",
        firstSeen: null,
        lastSeen: null,
        category: "mock",
        confidence: "low",
      },
    ],
    { iocVolume: 1 },
  );
}

export const SOURCE_ADAPTERS: SourceAdapter[] = [
  { name: "CISA KEV", ttlMs: LIVE_REFRESH_MS, configured: () => true, fetch: fetchCisaKev },
  { name: "URLhaus", ttlMs: LIVE_REFRESH_MS, configured: () => true, fetch: fetchUrlhaus },
  { name: "URLhaus Domains", ttlMs: LIVE_REFRESH_MS, configured: () => true, fetch: fetchUrlhausDomains },
  {
    name: "MalwareBazaar Recent",
    ttlMs: LIVE_REFRESH_MS,
    configured: () => true,
    fetch: fetchMalwareBazaarRecent,
  },
  {
    name: "Emerging Threats",
    ttlMs: LIVE_REFRESH_MS,
    configured: () => true,
    fetch: fetchEmergingThreatsCompromisedIps,
  },
  { name: "blocklist.de", ttlMs: LIVE_REFRESH_MS, configured: () => true, fetch: fetchBlocklistDe },
  { name: "SANS ISC DShield", ttlMs: LIVE_REFRESH_MS, configured: () => true, fetch: fetchDshield },
  { name: "PhishTank", ttlMs: LIVE_REFRESH_MS, configured: () => true, fetch: fetchPhishTank },
  { name: "OpenPhish", ttlMs: LIVE_REFRESH_MS, configured: () => true, fetch: fetchOpenPhish },
];

async function runAdapter(adapter: SourceAdapter, fetcher: Fetcher, now: number): Promise<AdapterResult> {
  if (!adapter.configured()) {
    return {
      dataset: null,
      status: status(adapter.name, false, "none", "failed", null, 0, "Source is not configured"),
    };
  }

  const liveCached = cache.get(adapter.name);
  if (liveCached && isDatasetFresh(liveCached, now) && datasetHasValidatedContent(liveCached)) {
    return { dataset: liveCached, status: liveCached.status };
  }

  try {
    const dataset = await adapter.fetch(fetcher, now);

    if (!isDatasetFresh(dataset, now)) {
      throw new Error("Dataset is stale");
    }

    if (!datasetHasValidatedContent(dataset)) {
      const emptyStatus = status(
        adapter.name,
        true,
        "live",
        "empty",
        dataset.retrievedAt,
        0,
        "Live source returned no current validated IOCs",
      );

      return { dataset: null, status: emptyStatus };
    }

    cache.set(adapter.name, dataset);

    return { dataset, status: dataset.status };
  } catch {
    const cached = cache.get(adapter.name);

    if (cached && isDatasetFresh(cached, now) && datasetHasValidatedContent(cached)) {
      return {
        dataset: {
          ...cached,
          status: status(
            adapter.name,
            true,
            "cached",
            "validated",
            cached.retrievedAt,
            cached.iocs.length,
            "Using last validated cached data",
          ),
        },
        status: status(
          adapter.name,
          true,
          "cached",
          "validated",
          cached.retrievedAt,
          cached.iocs.length,
          "Using last validated cached data",
        ),
      };
    }

    return {
      dataset: null,
      status: status(adapter.name, true, "none", "failed", null, 0, "No validated data available"),
    };
  }
}

export async function fetchThreatWeatherDatasets(fetcher: Fetcher = fetch, now = Date.now()) {
  const adapters =
    process.env.MALSIGHT_USE_MOCK_THREAT_WEATHER === "true" && process.env.NODE_ENV !== "production"
      ? [
          ...SOURCE_ADAPTERS,
          {
            name: "Local development mock",
            ttlMs: HOUR,
            configured: () => true,
            fetch: (_fetcher: Fetcher, mockNow: number) => fetchMock(mockNow),
          },
        ]
      : SOURCE_ADAPTERS;
  const settled = await Promise.all(adapters.map((adapter) => runAdapter(adapter, fetcher, now)));

  return {
    datasets: settled.flatMap((result) => (result.dataset ? [result.dataset] : [])),
    statuses: settled.map((result) => result.status),
    totalConfiguredSources: adapters.length,
    mode:
      process.env.MALSIGHT_USE_MOCK_THREAT_WEATHER === "true" && process.env.NODE_ENV !== "production"
        ? ("mock" as const)
        : ("live" as const),
  };
}

export function clearThreatWeatherCache() {
  cache.clear();
}
