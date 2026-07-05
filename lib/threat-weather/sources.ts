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

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}

function isMeaningfulMalwareName(value: string) {
  return Boolean(value) && !/^(unknown|n\/a|none|generic|malware)$/i.test(value.trim());
}

function hasMaliciousTag(tags: string[]) {
  return tags.some((tag) =>
    /malware|trojan|ransom|botnet|stealer|loader|rat|backdoor|worm|banker|dropper|keylogger|phish|exploit/i.test(
      tag,
    ),
  );
}

function isThreatFoxMalicious(entry: Record<string, unknown>) {
  const confidence = Number(readString(entry.confidence_level) || entry.confidence_level || 0);
  const threatType = readString(entry.threat_type);
  const malware = readString(entry.malware_printable);

  return confidence >= 50 && (isMeaningfulMalwareName(malware) || /malware|botnet|phish|c2|exploit/i.test(threatType));
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
    { next: { revalidate: 6 * HOUR } },
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
    6 * HOUR,
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
    next: { revalidate: 6 * HOUR },
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

  return makeDataset("URLhaus", 6 * HOUR, new Date(now).toISOString(), iocs, {
    phishingActivity: iocs.filter((ioc) => /phish|login|account|verify/i.test(ioc.value)).length,
  });
}

async function fetchMalwareBazaar(fetcher: Fetcher, now: number) {
  const response = await fetcher("https://mb-api.abuse.ch/api/v1/", {
    method: "POST",
    body: new URLSearchParams({ query: "get_recent", selector: "100" }),
    next: { revalidate: 6 * HOUR },
  });
  if (!response.ok) throw new Error("MalwareBazaar request failed");

  const payload = await response.json();
  if (!isObject(payload) || payload.query_status !== "ok" || !Array.isArray(payload.data)) {
    throw new Error("MalwareBazaar response malformed");
  }

  const iocs = payload.data
    .map((entry: unknown): NormalizedIoc | null => {
      if (!isObject(entry)) return null;
      const malwareFamily = readString(entry.signature);
      const tags = readStringArray(entry.tags);

      if (!isMeaningfulMalwareName(malwareFamily) && !hasMaliciousTag(tags)) {
        return null;
      }

      return {
        type: "hash" as const,
        value: readString(entry.sha256_hash),
        source: "MalwareBazaar",
        firstSeen: readString(entry.first_seen) || null,
        lastSeen: readString(entry.last_seen) || null,
        malwareFamily: isMeaningfulMalwareName(malwareFamily) ? malwareFamily : undefined,
        category: readString(entry.file_type) || "malware",
        confidence: "high" as const,
      };
    })
    .filter((ioc): ioc is NormalizedIoc => Boolean(ioc));

  if (!iocs.length) throw new Error("MalwareBazaar response empty");

  return makeDataset("MalwareBazaar", 6 * HOUR, new Date(now).toISOString(), iocs, {
    malwareSubmissions: iocs.length,
  });
}

async function fetchDshield(fetcher: Fetcher, now: number) {
  const response = await fetcher("https://isc.sans.edu/api/sources/attacks/75?json", {
    headers: {
      "User-Agent": "MalSight threat weather contact: github.com/maljk-prog/MalSight",
    },
    next: { revalidate: 6 * HOUR },
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

  return makeDataset("SANS ISC DShield", 6 * HOUR, new Date(now).toISOString(), [], {
    internetScanning: attacks,
  });
}

async function fetchOpenPhish(fetcher: Fetcher, now: number) {
  const response = await fetcher("https://openphish.com/feed.txt", {
    next: { revalidate: 6 * HOUR },
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

  return makeDataset("OpenPhish", 6 * HOUR, new Date(now).toISOString(), iocs, {
    phishingActivity: iocs.length,
  });
}

async function fetchThreatFox(fetcher: Fetcher, now: number) {
  const response = await fetcher("https://threatfox-api.abuse.ch/api/v1/", {
    method: "POST",
    body: new URLSearchParams({ query: "get_iocs", days: "1" }),
    next: { revalidate: 6 * HOUR },
  });
  if (!response.ok) throw new Error("ThreatFox request failed");

  const payload = await response.json();
  if (!isObject(payload) || payload.query_status !== "ok" || !Array.isArray(payload.data)) {
    throw new Error("ThreatFox response malformed");
  }

  const iocs = payload.data
    .map((entry: unknown): NormalizedIoc | null => {
      if (!isObject(entry)) return null;
      if (!isThreatFoxMalicious(entry)) return null;

      const type = readString(entry.ioc_type).toLowerCase();
      const mappedType =
        type === "ip:port" || type === "ip"
          ? "ip"
          : type === "domain"
            ? "domain"
            : type === "url"
              ? "url"
              : type.includes("hash")
                ? "hash"
                : null;
      const rawValue = readString(entry.ioc).split(":")[0];
      if (!mappedType) return null;

      return {
        type: mappedType,
        value: rawValue,
        source: "ThreatFox",
        firstSeen: readString(entry.first_seen) || null,
        lastSeen: readString(entry.last_seen) || null,
        malwareFamily: readString(entry.malware_printable) || undefined,
        category: readString(entry.threat_type) || "threat-ioc",
        confidence: "high" as const,
      };
    })
    .filter((ioc): ioc is NormalizedIoc => Boolean(ioc));

  if (!iocs.length) throw new Error("ThreatFox response empty");

  return makeDataset("ThreatFox", 6 * HOUR, new Date(now).toISOString(), iocs, {
    iocVolume: iocs.length,
    malwareSubmissions: iocs.filter((ioc) => ioc.malwareFamily).length,
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
  { name: "CISA KEV", ttlMs: 6 * HOUR, configured: () => true, fetch: fetchCisaKev },
  { name: "URLhaus", ttlMs: 6 * HOUR, configured: () => true, fetch: fetchUrlhaus },
  { name: "MalwareBazaar", ttlMs: 6 * HOUR, configured: () => true, fetch: fetchMalwareBazaar },
  { name: "SANS ISC DShield", ttlMs: 6 * HOUR, configured: () => true, fetch: fetchDshield },
  { name: "OpenPhish", ttlMs: 6 * HOUR, configured: () => true, fetch: fetchOpenPhish },
  { name: "ThreatFox", ttlMs: 6 * HOUR, configured: () => true, fetch: fetchThreatFox },
];

async function runAdapter(adapter: SourceAdapter, fetcher: Fetcher, now: number): Promise<AdapterResult> {
  if (!adapter.configured()) {
    return {
      dataset: null,
      status: status(adapter.name, false, "none", "failed", null, 0, "Source is not configured"),
    };
  }

  try {
    const dataset = await adapter.fetch(fetcher, now);

    if (!isDatasetFresh(dataset, now)) {
      throw new Error("Dataset is stale");
    }

    if (!datasetHasValidatedContent(dataset)) {
      throw new Error("Dataset has no validated content");
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
    totalConfiguredSources: adapters.filter((adapter) => adapter.configured()).length,
    mode:
      process.env.MALSIGHT_USE_MOCK_THREAT_WEATHER === "true" && process.env.NODE_ENV !== "production"
        ? ("mock" as const)
        : ("live" as const),
  };
}

export function clearThreatWeatherCache() {
  cache.clear();
}
