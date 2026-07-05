export type IocType = "ip" | "domain" | "url" | "hash" | "email";

export type DataMode = "live" | "cached" | "none" | "mock";

export type SourceValidationStatus =
  | "validated"
  | "failed"
  | "empty"
  | "malformed"
  | "stale"
  | "mock";

export type SourceStatus = {
  name: string;
  configured: boolean;
  mode: DataMode;
  status: SourceValidationStatus;
  retrievedAt: string | null;
  itemCount: number;
  message: string;
};

export type NormalizedIoc = {
  type: IocType;
  value: string;
  source: string;
  firstSeen: string | null;
  lastSeen: string | null;
  malwareFamily?: string;
  category?: string;
  confidence: "high" | "medium" | "low";
};

export type SourceDataset = {
  source: string;
  retrievedAt: string;
  ttlMs: number;
  iocs: NormalizedIoc[];
  signals: Partial<Record<ThreatSignalName, number>>;
  status: SourceStatus;
};

export type ThreatSignalName =
  | "criticalCves"
  | "knownExploitedCves"
  | "iocVolume"
  | "phishingActivity"
  | "malwareSubmissions"
  | "internetScanning"
  | "publicConcern";

export type ThreatSignal = {
  name: ThreatSignalName;
  label: string;
  value: number;
  score: number;
  weight: number;
  sourceNames: string[];
  note: string;
};

export type ThreatWeatherState =
  | "Clear"
  | "Mostly Clear"
  | "Moderate Activity"
  | "Elevated Risk"
  | "Threat Storm"
  | "Critical Threat";

export type IocTotals = Record<IocType, number>;

export type ThreatWeatherOutput = {
  updatedAt: string;
  mode: DataMode;
  health: "available" | "partial" | "unavailable" | "mock";
  healthMessage: string;
  weatherState: ThreatWeatherState;
  threatIndex: number | null;
  summary: string;
  freshness: string | null;
  usingCachedSince: string | null;
  sourceStatuses: SourceStatus[];
  contributors: ThreatSignal[];
  iocCollector: {
    totals: IocTotals;
    sourceBreakdown: {
      source: string;
      totals: IocTotals;
      status: SourceValidationStatus;
      retrievedAt: string | null;
    }[];
    deltas: {
      available: boolean;
      message: string;
      totals?: Partial<IocTotals>;
    };
    topFamily: string | null;
    freshness: string | null;
  };
};

