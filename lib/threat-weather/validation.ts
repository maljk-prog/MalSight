import type { IocTotals, IocType, NormalizedIoc, SourceDataset } from "./types";

export const EMPTY_TOTALS: IocTotals = {
  ip: 0,
  domain: 0,
  url: 0,
  hash: 0,
  email: 0,
};

const DOMAIN_RE =
  /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const HASH_RE = /^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cloneTotals() {
  return { ...EMPTY_TOTALS };
}

export function isValidIp(value: string) {
  const parts = value.trim().split(".");

  return (
    parts.length === 4 &&
    parts.every((part) => {
      if (!/^\d{1,3}$/.test(part)) return false;
      const number = Number(part);
      return number >= 0 && number <= 255 && String(number) === String(Number(part));
    })
  );
}

export function isValidDomain(value: string) {
  const domain = value.trim().toLowerCase();
  return DOMAIN_RE.test(domain) && !isValidIp(domain);
}

export function isValidUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function isValidHash(value: string) {
  return HASH_RE.test(value.trim());
}

export function isValidEmail(value: string) {
  return EMAIL_RE.test(value.trim());
}

export function normalizeIocValue(type: IocType, value: string) {
  const trimmed = value.trim();

  if (type === "domain") return trimmed.toLowerCase();
  if (type === "email") return trimmed.toLowerCase();
  if (type === "hash") return trimmed.toLowerCase();
  if (type === "url") {
    const url = new URL(trimmed);
    url.hash = "";
    return url.toString();
  }

  return trimmed;
}

export function isValidIoc(type: IocType, value: string) {
  if (!value || typeof value !== "string") return false;
  if (type === "ip") return isValidIp(value);
  if (type === "domain") return isValidDomain(value);
  if (type === "url") return isValidUrl(value);
  if (type === "hash") return isValidHash(value);
  if (type === "email") return isValidEmail(value);
  return false;
}

export function normalizeIoc(ioc: NormalizedIoc): NormalizedIoc | null {
  if (!isValidIoc(ioc.type, ioc.value)) return null;

  return {
    ...ioc,
    value: normalizeIocValue(ioc.type, ioc.value),
  };
}

export function isDatasetFresh(dataset: SourceDataset, now = Date.now()) {
  const retrievedAt = Date.parse(dataset.retrievedAt);

  return Number.isFinite(retrievedAt) && now - retrievedAt <= dataset.ttlMs;
}

export function datasetHasValidatedContent(dataset: SourceDataset) {
  return dataset.iocs.length > 0 || Object.values(dataset.signals).some((value) => Number(value) > 0);
}

export function dedupeIocs(iocs: NormalizedIoc[]) {
  const seen = new Map<string, NormalizedIoc>();

  iocs.forEach((ioc) => {
    const normalized = normalizeIoc(ioc);
    if (!normalized) return;

    const key = `${normalized.type}:${normalized.value}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, normalized);
      return;
    }

    seen.set(key, {
      ...existing,
      source: Array.from(new Set([...existing.source.split(", "), normalized.source])).join(", "),
      confidence:
        existing.confidence === "high" || normalized.confidence === "high"
          ? "high"
          : existing.confidence === "medium" || normalized.confidence === "medium"
            ? "medium"
            : "low",
    });
  });

  return Array.from(seen.values());
}

export function countTotals(iocs: NormalizedIoc[]) {
  const totals = cloneTotals();

  iocs.forEach((ioc) => {
    totals[ioc.type] += 1;
  });

  return totals;
}

