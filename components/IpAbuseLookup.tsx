"use client";

import { useState, type FormEvent } from "react";

type LookupResponse = {
  error?: string;
  ip: string;
  searchedAt: string;
  assessment: string;
  abuseScore: number | null;
  abuseScoreKind: "signal coverage" | null;
  abuseScoreSource: string | null;
  warning: string;
  sourceStatus: Record<string, string>;
  categories: {
    key: string;
    label: string;
    detected: boolean;
    source: string;
  }[];
  dshield: null | {
    reports: number;
    targets: number;
    firstSeen: string | null;
    lastSeen: string | null;
    hostname: string | null;
    network: string | null;
    asn: string | null;
    asName: string | null;
    countryCode: string | null;
    abuseContact: string | null;
    comment: string | null;
    threatFeeds: {
      name: string;
      firstSeen: string | null;
      lastSeen: string | null;
    }[];
  };
  geo: null | {
    country: string | null;
    countryCode: string | null;
    region: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
    asn: number | null;
    organization: string | null;
    domain: string | null;
  };
  rdap: null | {
    name: string | null;
    handle: string | null;
    startAddress: string | null;
    endAddress: string | null;
    countryCode: string | null;
    type: string | null;
  };
  outpost: null | {
    detectedSignals: string[];
    checkedSignals: {
      key: string;
      label: string;
      detected: boolean;
    }[];
    totalSignals: number;
    signalCoverageScore: number;
  };
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function valueOrUnknown(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "Not returned" : String(value);
}

function scoreColor(score: number) {
  if (score >= 75) return "bg-[#B3261E]";
  if (score >= 40) return "bg-[#D97706]";
  if (score > 0) return "bg-[#D6A800]";
  return "bg-[#3F6B5A]";
}

export default function IpAbuseLookup() {
  const [ip, setIp] = useState("");
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`/api/ip-lookup?ip=${encodeURIComponent(ip.trim())}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as LookupResponse;
      if (!response.ok) throw new Error(payload.error || "IP lookup failed");
      setResult(payload);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "IP lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.24em] text-[#3F6B5A]">IP REPUTATION LOOKUP</p>
          <h3 className="mt-2 text-2xl font-black text-[#243B32]">Investigate a public IP address</h3>
          <p className="mt-1 max-w-3xl text-sm font-semibold text-[#466357]">
            Resolve ownership and location, then compare the address with observed DShield activity.
          </p>
        </div>

        <form onSubmit={submit} className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="ip-reputation-search">Public IPv4 or IPv6 address</label>
          <input
            id="ip-reputation-search"
            value={ip}
            onChange={(event) => setIp(event.target.value)}
            placeholder="Example: 185.94.111.1"
            className="min-w-0 flex-1 rounded-xl border border-[#8DA99B] bg-white/80 px-4 py-3 font-mono text-sm text-[#243B32] outline-none focus:ring-2 focus:ring-[#3F6B5A]"
          />
          <button
            type="submit"
            disabled={loading || !ip.trim()}
            className="rounded-xl bg-[#3F6B5A] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Searching…" : "Search IP"}
          </button>
        </form>
      </div>

      {error && <p className="mt-4 rounded-xl bg-[#B3261E]/10 p-3 text-sm font-bold text-[#B3261E]">{error}</p>}

      {result && (
        <details open className="mt-4 rounded-2xl border border-[#8DA99B]/50 bg-[#E6E4DE]/75 p-4">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-xl font-black text-[#243B32]">{result.ip}</p>
                <p className="mt-1 text-sm font-bold text-[#3F6B5A]">{result.assessment}</p>
              </div>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black text-[#466357]">Click to collapse</span>
            </div>
          </summary>

          <section className="mt-4 rounded-xl bg-white/75 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#3F6B5A]">Abuse meter</p>
                <div className="mt-1 flex items-end gap-2">
                  <p className="text-4xl font-black text-[#243B32]">
                    {result.abuseScore === null
                      ? "Unavailable"
                      : `${result.abuseScore}%`}
                  </p>
                  {result.abuseScore !== null && <p className="pb-1 text-sm font-bold text-[#466357]">{result.abuseScoreKind}</p>}
                </div>
                <p className="mt-1 text-xs font-semibold text-[#466357]">
                  {result.abuseScoreSource || "No score-bearing reputation source returned a result."}
                </p>
              </div>
              <div className="max-w-md rounded-xl bg-[#E6E4DE] p-3 text-sm text-[#466357]">
                <p className="font-black text-[#243B32]">DShield evidence</p>
                <p className="mt-1 font-semibold">
                  {result.dshield
                    ? `${formatNumber(result.dshield.reports)} reports, ${formatNumber(result.dshield.targets)} distinct targets, and ${formatNumber(result.dshield.threatFeeds.length)} associated threat feeds returned.`
                    : "DShield did not return evidence for this lookup."}
                </p>
                <p className="mt-2 font-semibold">
                  {result.abuseScoreKind === "signal coverage"
                    ? `The meter checked ${result.categories.length} reputation and telemetry categories. This percentage is coverage of detected checks, not a probability that the address is malicious.`
                    : "DShield observations remain visible even if the reputation provider is temporarily unavailable."}
                </p>
              </div>
            </div>
            <div className="mt-4 h-4 overflow-hidden rounded-full border border-[#8DA99B]/50 bg-[#E6E4DE]">
              <div
                className={`h-full rounded-full transition-all ${result.abuseScore === null ? "bg-[#8DA99B]/35" : scoreColor(result.abuseScore)}`}
                style={{ width: result.abuseScore === null ? "0%" : `${result.abuseScore}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-bold text-[#466357]">
              <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
            {result.categories.length > 0 && (
              <details className="mt-4 rounded-xl border border-[#8DA99B]/40 bg-[#E6E4DE]/70 p-3">
                <summary className="cursor-pointer text-sm font-black text-[#243B32]">
                  Categories checked ({result.categories.filter((category) => category.detected).length} of {result.categories.length} detected)
                </summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {result.categories.map((signal) => (
                    <div key={signal.key} className="flex items-center justify-between gap-3 rounded-lg bg-white/75 px-3 py-2 text-sm">
                      <span>
                        <span className="block font-bold text-[#243B32]">{signal.label}</span>
                        <span className="block text-[10px] font-semibold text-[#466357]">{signal.source}</span>
                      </span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${signal.detected ? "bg-[#B3261E]/15 text-[#B3261E]" : "bg-[#3F6B5A]/10 text-[#3F6B5A]"}`}>
                        {signal.detected ? "Detected" : "Not detected"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs font-semibold text-[#466357]">
                  These checks combine Outpost reputation categories with separately labelled DShield and registration evidence. A detected check is investigation context, not proof of malicious intent.
                </p>
              </details>
            )}
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl bg-white/70 p-4">
              <h4 className="font-black text-[#243B32]">Resolution and ownership</h4>
              <dl className="mt-3 space-y-2 text-sm text-[#466357]">
                <div><dt className="font-bold">Location</dt><dd>{[result.geo?.city, result.geo?.region, result.geo?.country].filter(Boolean).join(", ") || "Not returned"}</dd></div>
                <div><dt className="font-bold">Organization</dt><dd>{valueOrUnknown(result.geo?.organization)}</dd></div>
                <div><dt className="font-bold">ASN</dt><dd>{result.geo?.asn ? `AS${result.geo.asn}` : valueOrUnknown(result.dshield?.asn)}</dd></div>
                <div><dt className="font-bold">Domain / hostname</dt><dd>{valueOrUnknown(result.geo?.domain || result.dshield?.hostname)}</dd></div>
                <div><dt className="font-bold">Registered network</dt><dd>{valueOrUnknown(result.rdap?.name || result.dshield?.network)}</dd></div>
                <div><dt className="font-bold">Address range</dt><dd className="break-all">{result.rdap?.startAddress && result.rdap?.endAddress ? `${result.rdap.startAddress} – ${result.rdap.endAddress}` : "Not returned"}</dd></div>
              </dl>
              <p className="mt-3 text-xs font-semibold text-[#466357]">Sources: RDAP registration and ipwho.is GeoIP/ASN enrichment.</p>
            </section>

            <section className="rounded-xl bg-white/70 p-4">
              <h4 className="font-black text-[#243B32]">SANS ISC / DShield observations</h4>
              {result.dshield ? (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-[#E6E4DE] p-3"><p className="text-2xl font-black text-[#243B32]">{formatNumber(result.dshield.reports)}</p><p className="text-xs font-bold text-[#466357]">Reports</p></div>
                    <div className="rounded-lg bg-[#E6E4DE] p-3"><p className="text-2xl font-black text-[#243B32]">{formatNumber(result.dshield.targets)}</p><p className="text-xs font-bold text-[#466357]">Distinct targets</p></div>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm text-[#466357]">
                    <div><dt className="font-bold">First observed</dt><dd>{valueOrUnknown(result.dshield.firstSeen)}</dd></div>
                    <div><dt className="font-bold">Last observed</dt><dd>{valueOrUnknown(result.dshield.lastSeen)}</dd></div>
                    <div><dt className="font-bold">Abuse contact</dt><dd className="break-all">{valueOrUnknown(result.dshield.abuseContact)}</dd></div>
                  </dl>
                  {result.dshield.threatFeeds.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-bold text-[#243B32]">Associated threat feeds</p>
                      <div className="mt-2 max-h-36 space-y-2 overflow-y-auto">
                        {result.dshield.threatFeeds.map((feed) => (
                          <div key={feed.name} className="rounded-lg bg-[#E6E4DE] p-2 text-xs text-[#466357]">
                            <p className="font-black text-[#243B32]">{feed.name}</p>
                            <p className="mt-1">First {valueOrUnknown(feed.firstSeen)} · Last {valueOrUnknown(feed.lastSeen)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : <p className="mt-3 text-sm text-[#466357]">DShield did not return lookup details.</p>}
              <p className="mt-3 text-xs font-semibold text-[#466357]">Reports are observations, not proof that the current address owner is malicious.</p>
            </section>

          </div>

          <p className="mt-4 rounded-xl bg-[#FFF3B0]/25 p-3 text-xs font-semibold text-[#5B4B22]">{result.warning}</p>
        </details>
      )}
    </div>
  );
}
