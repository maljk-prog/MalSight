import type {
  DataMode,
  IocTotals,
  SourceDataset,
  SourceStatus,
  ThreatSignal,
  ThreatSignalName,
  ThreatWeatherOutput,
  ThreatWeatherState,
} from "./types";
import {
  cloneTotals,
  countTotals,
  datasetHasValidatedContent,
  dedupeIocs,
  isDatasetFresh,
} from "./validation";

const SIGNAL_LABELS: Record<ThreatSignalName, string> = {
  criticalCves: "Critical CVEs",
  knownExploitedCves: "Known exploited CVEs",
  iocVolume: "IOC volume",
  phishingActivity: "Phishing activity",
  malwareSubmissions: "Malware submissions",
  internetScanning: "Internet scanning",
  publicConcern: "Public concern",
};

const SIGNAL_NOTES: Record<ThreatSignalName, string> = {
  criticalCves: "Recent critical vulnerability observations from validated vulnerability sources.",
  knownExploitedCves: "CISA KEV entries indicate vulnerabilities known to be exploited.",
  iocVolume: "Deduplicated indicators collected from validated threat-intel sources.",
  phishingActivity: "URL/domain indicators categorized as phishing by configured sources.",
  malwareSubmissions: "Malware-linked hashes, URLs, or families returned by configured sources.",
  internetScanning: "Public source-IP telemetry and scan reports from configured sources.",
  publicConcern: "Search or public concern signal when a validated MalSight source is available.",
};

const SIGNAL_WEIGHTS: Record<ThreatSignalName, number> = {
  criticalCves: 0.18,
  knownExploitedCves: 0.18,
  iocVolume: 0.16,
  phishingActivity: 0.12,
  malwareSubmissions: 0.14,
  internetScanning: 0.14,
  publicConcern: 0.08,
};

const SIGNAL_CAPS: Record<ThreatSignalName, number> = {
  criticalCves: 8,
  knownExploitedCves: 25,
  iocVolume: 400,
  phishingActivity: 120,
  malwareSubmissions: 120,
  internetScanning: 500_000,
  publicConcern: 100,
};

export function weatherStateForIndex(index: number | null): ThreatWeatherState {
  if (index === null) return "Clear";
  if (index <= 15) return "Clear";
  if (index <= 35) return "Mostly Clear";
  if (index <= 55) return "Moderate Activity";
  if (index <= 75) return "Elevated Risk";
  if (index <= 90) return "Threat Storm";
  return "Critical Threat";
}

function signalScore(name: ThreatSignalName, value: number) {
  if (value <= 0) return 0;

  return Math.min(100, Math.round((value / SIGNAL_CAPS[name]) * 100));
}

function sourceNamesForSignal(datasets: SourceDataset[], signal: ThreatSignalName) {
  return datasets
    .filter((dataset) => Number(dataset.signals[signal] || 0) > 0)
    .map((dataset) => dataset.source);
}

function healthMessage(available: number, total: number) {
  if (available === 0) {
    return "Threat Weather unavailable — no validated data sources reachable.";
  }

  if (available < total) {
    return `Partial observations — ${available} of ${total} sources available.`;
  }

  return `Threat Weather available — ${available} validated sources.`;
}

function mergeSignals(datasets: SourceDataset[]) {
  const values = Object.keys(SIGNAL_LABELS).reduce(
    (acc, signal) => ({ ...acc, [signal]: 0 }),
    {} as Record<ThreatSignalName, number>,
  );

  datasets.forEach((dataset) => {
    Object.entries(dataset.signals).forEach(([name, value]) => {
      values[name as ThreatSignalName] += Number(value || 0);
    });
  });

  return values;
}

function buildSignals(datasets: SourceDataset[]) {
  const values = mergeSignals(datasets);

  return (Object.keys(SIGNAL_LABELS) as ThreatSignalName[]).map((name) => ({
    name,
    label: SIGNAL_LABELS[name],
    value: values[name],
    score: signalScore(name, values[name]),
    weight: SIGNAL_WEIGHTS[name],
    sourceNames: sourceNamesForSignal(datasets, name),
    note: SIGNAL_NOTES[name],
  }));
}

function summarize(state: ThreatWeatherState, index: number | null, signals: ThreatSignal[]) {
  if (index === null) return "No validated threat-intelligence observations are available right now.";

  const top = signals
    .filter((signal) => signal.value > 0)
    .sort((a, b) => b.score * b.weight - a.score * a.weight)[0];

  if (!top) return `${state}: validated sources are reachable, but no notable activity was observed.`;

  return `${state}: ${top.label.toLowerCase()} is the strongest contributor in the current validated observations.`;
}

function topFamily(datasets: SourceDataset[]) {
  const counts = new Map<string, number>();

  datasets.flatMap((dataset) => dataset.iocs).forEach((ioc) => {
    const family = ioc.malwareFamily || ioc.category;
    if (!family) return;
    counts.set(family, (counts.get(family) || 0) + 1);
  });

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function sourceBreakdown(datasets: SourceDataset[]) {
  return datasets.map((dataset) => ({
    source: dataset.source,
    totals: countTotals(dataset.iocs),
    status: dataset.status.status,
    retrievedAt: dataset.retrievedAt,
  }));
}

function emptyCollectorTotals(): IocTotals {
  return cloneTotals();
}

export function aggregateThreatWeather(
  datasets: SourceDataset[],
  statuses: SourceStatus[],
  totalConfiguredSources: number,
  mode: DataMode = "live",
  now = Date.now(),
): ThreatWeatherOutput {
  // Exclude stale, empty, and malformed datasets before scoring. The UI should
  // never turn invalid API responses into current-looking threat intelligence.
  const usableDatasets = datasets.filter(
    (dataset) => isDatasetFresh(dataset, now) && datasetHasValidatedContent(dataset),
  );
  const dedupedIocs = dedupeIocs(usableDatasets.flatMap((dataset) => dataset.iocs));
  const contributors = buildSignals(
    usableDatasets.map((dataset) => ({
      ...dataset,
      signals: {
        ...dataset.signals,
        iocVolume: dataset.signals.iocVolume ?? dataset.iocs.length,
      },
    })),
  );

  // Weighted score: each signal is normalized to 0-100 using an expected cap,
  // multiplied by its weight, then summed. Missing signals contribute 0 rather
  // than being invented or backfilled from sample data.
  const threatIndex =
    usableDatasets.length === 0
      ? null
      : Math.min(
          100,
          Math.round(
            contributors.reduce(
              (total, signal) => total + signal.score * signal.weight,
              0,
            ),
          ),
        );
  const weatherState = weatherStateForIndex(threatIndex);
  const latestFreshness =
    usableDatasets
      .map((dataset) => dataset.retrievedAt)
      .sort()
      .at(-1) || null;
  const availableSources = new Set(usableDatasets.map((dataset) => dataset.source)).size;
  const health =
    mode === "mock"
      ? "mock"
      : availableSources === 0
        ? "unavailable"
        : availableSources < totalConfiguredSources
          ? "partial"
          : "available";
  const cached = statuses
    .filter((status) => status.mode === "cached")
    .map((status) => status.retrievedAt)
    .filter(Boolean)
    .sort()[0] || null;

  return {
    updatedAt: new Date(now).toISOString(),
    mode,
    health,
    healthMessage:
      mode === "mock"
        ? "Local development mock data is enabled."
        : healthMessage(availableSources, totalConfiguredSources),
    weatherState,
    threatIndex,
    summary: summarize(weatherState, threatIndex, contributors),
    freshness: latestFreshness,
    usingCachedSince: cached,
    sourceStatuses: statuses,
    contributors,
    iocCollector: {
      totals: usableDatasets.length ? countTotals(dedupedIocs) : emptyCollectorTotals(),
      sourceBreakdown: sourceBreakdown(usableDatasets),
      deltas: {
        available: false,
        message: "Insufficient historical data",
      },
      topFamily: topFamily(usableDatasets),
      freshness: latestFreshness,
    },
  };
}

