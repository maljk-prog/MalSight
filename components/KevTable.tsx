"use client";

import DashboardViewHero from "./DashboardViewHero";

import { useEffect, useMemo, useState } from "react";

type KevVulnerability = {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse?: string;
  notes?: string;
};

type ProductGroup = {
  name: string;
  vulnerabilities: KevVulnerability[];
};

type VendorGroup = {
  name: string;
  count: number;
  products: ProductGroup[];
};

type CveLookup = {
  id: string;
  status: string;
  published: string | null;
  lastModified: string | null;
  description: string;
  score: number | null;
  severity: string | null;
  vector: string | null;
  weaknesses: string[];
  references: { url: string; source: string; tags: string[] }[];
  inCisaKev: boolean;
  source: string;
};

function sortByLatest(a: KevVulnerability, b: KevVulnerability) {
  return b.dateAdded.localeCompare(a.dateAdded);
}

function isAddedWithinLast30Days(vulnerability: KevVulnerability) {
  const addedAt = Date.parse(vulnerability.dateAdded);

  if (!Number.isFinite(addedAt)) return false;

  return Date.now() - addedAt <= 30 * 24 * 60 * 60 * 1000;
}

function preferredVendorReference(lookup: CveLookup | null, cveId: string) {
  if (!lookup || lookup.id.toUpperCase() !== cveId.toUpperCase()) return null;
  return lookup.references.find((reference) =>
    reference.tags.some((tag) => /vendor advisory|patch/i.test(tag)),
  ) || null;
}

function ransomwareStatus(value?: string) {
  if (/^known$/i.test(value || "")) {
    return "Confirmed by CISA: used in known ransomware campaigns.";
  }
  if (/^unknown$/i.test(value || "") || !value) {
    return "Not confirmed by CISA: its KEV catalog does not currently identify known ransomware campaign use.";
  }
  return value;
}

function groupByVendor(vulnerabilities: KevVulnerability[]) {
  const vendors = new Map<string, Map<string, KevVulnerability[]>>();

  vulnerabilities.forEach((vulnerability) => {
    const vendor = vulnerability.vendorProject || "Unknown vendor";
    const product = vulnerability.product || "Unknown product";

    if (!vendors.has(vendor)) {
      vendors.set(vendor, new Map());
    }

    const products = vendors.get(vendor)!;

    if (!products.has(product)) {
      products.set(product, []);
    }

    products.get(product)!.push(vulnerability);
  });

  return Array.from(vendors, ([name, products]) => {
    const productGroups = Array.from(products, ([productName, items]) => ({
      name: productName,
      vulnerabilities: items.sort(sortByLatest),
    })).sort((a, b) => b.vulnerabilities.length - a.vulnerabilities.length);

    return {
      name,
      count: productGroups.reduce(
        (total, product) => total + product.vulnerabilities.length,
        0,
      ),
      products: productGroups,
    };
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export default function KevTable({
  vulnerabilities,
  selectedCve = "",
  onOpenNewsForCve,
}: {
  vulnerabilities: KevVulnerability[];
  selectedCve?: string;
  onOpenNewsForCve?: (cve: string) => void;
}) {
  const [selectedLetter, setSelectedLetter] = useState("Top 15");
  const [keyword, setKeyword] = useState("");
  const [lookup, setLookup] = useState<CveLookup | null>(null);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    if (!selectedCve) return;

    setKeyword(selectedCve);
    setSelectedLetter("Top 15");
  }, [selectedCve]);
  const normalizedKeyword = keyword.trim().toLowerCase();
  const searchedCve =
    keyword.trim().toUpperCase().match(/^CVE-\d{4}-\d{4,7}$/)?.[0] || "";
  const matchingVulnerabilities = useMemo(() => {
    if (!normalizedKeyword) return vulnerabilities;

    return vulnerabilities.filter((vulnerability) =>
      [
        vulnerability.cveID,
        vulnerability.vendorProject,
        vulnerability.product,
        vulnerability.vulnerabilityName,
        vulnerability.shortDescription,
        vulnerability.requiredAction,
        vulnerability.dueDate,
        vulnerability.knownRansomwareCampaignUse,
        vulnerability.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedKeyword),
    );
  }, [normalizedKeyword, vulnerabilities]);

  useEffect(() => {
    setLookup(null);
    setLookupError("");
    if (!searchedCve) {
      setLookupStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLookupStatus("loading");
      try {
        const response = await fetch(`/api/cve?id=${encodeURIComponent(searchedCve)}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "CVE lookup failed.");
        setLookup(payload as CveLookup);
        setLookupStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        setLookupError(error instanceof Error ? error.message : "CVE lookup failed.");
        setLookupStatus("error");
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchedCve]);
  const vendorGroups = useMemo(
    () => groupByVendor(matchingVulnerabilities),
    [matchingVulnerabilities],
  );
  const recentVulnerabilities = useMemo(
    () =>
      vulnerabilities
        .filter(isAddedWithinLast30Days)
        .sort(sortByLatest)
        .slice(0, 15),
    [vulnerabilities],
  );
  const recentVendorGroups = useMemo(
    () => groupByVendor(recentVulnerabilities),
    [recentVulnerabilities],
  );

  const letters = useMemo(
    () =>
      Array.from(
        new Set(
          vendorGroups.map((vendor) => vendor.name.charAt(0).toUpperCase()),
        ),
      ).sort(),
    [vendorGroups],
  );
  const visibleVendorGroups =
    normalizedKeyword
      ? vendorGroups
      : selectedLetter === "Recent 15"
      ? recentVendorGroups
      : selectedLetter === "Top 15"
      ? vendorGroups.slice(0, 15)
      : vendorGroups.filter(
          (vendor) => vendor.name.charAt(0).toUpperCase() === selectedLetter,
        );
  const productCount = vendorGroups.reduce(
    (total, vendor) => total + vendor.products.length,
    0,
  );

  return (
    <div>
      <DashboardViewHero eyebrow="EXPLOITED CVEs · CISA KEV + NIST NVD" title="Known exploited CVEs by vendor" description="Browse CISA's catalog of vulnerabilities known to be exploited in the wild, or enter any exact CVE ID to retrieve its NIST NVD record—even when it is not in KEV." aside={<div className="grid grid-cols-3 gap-3 text-center text-sm font-semibold">
          <div className="rounded-2xl bg-white/60 p-3">
            <p className="text-2xl font-black">{vendorGroups.length}</p>
            <p>Vendors</p>
          </div>
          <div className="rounded-2xl bg-white/60 p-3">
            <p className="text-2xl font-black">{productCount}</p>
            <p>Products</p>
          </div>
          <div className="rounded-2xl bg-white/60 p-3">
            <p className="text-2xl font-black">
              {matchingVulnerabilities.length}
            </p>
            <p>CVEs</p>
          </div>
        </div>} />

      <div className="mb-4 rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
        <div className="mb-4 grid gap-4">
          <div>
            <p className="text-sm font-bold text-[#466357]">
              Browse vendors
            </p>
            <h3 className="mt-1 text-2xl font-black text-[#243B32]">
              {selectedLetter === "Recent 15" && !normalizedKeyword
                ? "15 Most Recent"
                : selectedLetter === "Top 15" && !normalizedKeyword
                ? "Top 15 Impacted"
                : normalizedKeyword
                  ? "Keyword matches"
                  : `${selectedLetter} vendors`}
            </h3>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#466357]">
              Search exploited CVEs
            </span>
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Vendor, product, CVE, action..."
              className="w-full rounded-xl border border-[#8DA99B] bg-white/80 px-4 py-3 text-sm font-semibold text-[#243B32] outline-none focus:border-[#3F6B5A]"
            />
          </label>
        </div>

        {!normalizedKeyword && <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedLetter("Top 15");
              setKeyword("");
            }}
            className={`rounded-xl border px-4 py-2 text-sm font-bold ${
              selectedLetter === "Top 15"
                ? "border-[#3F6B5A] bg-[#3F6B5A] text-white"
                : "border-[#8DA99B] text-[#243B32]"
            }`}
          >
            Top 15 Impacted
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedLetter("Recent 15");
              setKeyword("");
            }}
            className={`rounded-xl border px-4 py-2 text-sm font-bold ${
              selectedLetter === "Recent 15"
                ? "border-[#3F6B5A] bg-[#3F6B5A] text-white"
                : "border-[#8DA99B] text-[#243B32]"
            }`}
          >
            15 Most Recent
          </button>

          {letters.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => {
                setSelectedLetter(letter);
                setKeyword("");
              }}
              className={`h-10 w-10 rounded-xl border text-sm font-bold ${
                selectedLetter === letter
                  ? "border-[#3F6B5A] bg-[#3F6B5A] text-white"
                  : "border-[#8DA99B] text-[#243B32]"
              }`}
              aria-label={`Show vendors starting with ${letter}`}
            >
              {letter}
            </button>
          ))}
        </div>}

        <p className="mt-3 text-sm font-semibold text-[#466357]">
          Showing {visibleVendorGroups.length} vendors and{" "}
          {selectedLetter === "Recent 15" && !normalizedKeyword
            ? recentVulnerabilities.length
            : matchingVulnerabilities.length} CVEs
          {normalizedKeyword
            ? ` matching "${keyword.trim()}"`
            : selectedLetter === "Recent 15"
              ? " added to CISA KEV in the last 30 days"
            : selectedLetter === "Top 15"
              ? " in Top 15 Impacted"
              : ` under ${selectedLetter}`}
        </p>
        {selectedLetter === "Recent 15" &&
          !normalizedKeyword &&
          recentVulnerabilities.length === 0 && (
            <p className="mt-2 rounded-xl border border-[#D6C89B]/60 bg-[#FFF3B0]/25 p-3 text-sm font-bold text-[#5B4B22]">
              No exploited CVEs were newly added to CISA KEV in the last 30
              days.
            </p>
          )}
      </div>

      <div className="space-y-4 rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
        {visibleVendorGroups.length === 0 && (
          <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
            {searchedCve ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xl font-black text-[#243B32]">{searchedCve}</p>
                  <span className="cve-kev-status rounded-full px-3 py-1 text-xs font-black">
                    {lookupStatus === "ready"
                      ? lookup?.inCisaKev ? "CONFIRMED IN CISA KEV" : "NOT IN CISA KEV"
                      : "CHECKING CISA KEV"}
                  </span>
                </div>
                <p className="mt-2 font-semibold">
                  {lookupStatus === "ready" && lookup?.inCisaKev
                    ? "NVD confirms that CISA lists this vulnerability as known to be actively exploited."
                    : lookupStatus === "ready"
                      ? "CISA has not added this CVE to its known-exploited catalog. That is not proof that exploitation has never occurred."
                      : "Checking authoritative vulnerability and exploitation records..."}
                </p>
                {lookupStatus === "loading" && (
                  <p className="mt-4 font-bold text-[#3F6B5A]">Loading the NIST NVD record...</p>
                )}
                {lookupStatus === "error" && (
                  <p className="mt-4 rounded-xl border border-[#B3261E]/30 bg-white/60 p-3 font-bold text-[#B3261E]">
                    {lookupError}
                  </p>
                )}
                {lookupStatus === "ready" && lookup && (
                  <article className="mt-4 rounded-xl border border-[#8DA99B]/60 bg-white/70 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#3F6B5A] px-3 py-1 text-xs font-black text-white">
                        NVD {lookup.status.toUpperCase()}
                      </span>
                      {lookup.score !== null && (
                        <span className="rounded-full border border-[#3F6B5A] px-3 py-1 text-xs font-black text-[#3F6B5A]">
                          CVSS {lookup.score} {lookup.severity || ""}
                        </span>
                      )}
                    </div>
                    <p className="mt-4 leading-relaxed">{lookup.description}</p>
                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      <p><b>Published:</b> {lookup.published?.slice(0, 10) || "Unknown"}</p>
                      <p><b>Last modified:</b> {lookup.lastModified?.slice(0, 10) || "Unknown"}</p>
                      <p><b>Weakness:</b> {lookup.weaknesses.join(", ") || "Not classified"}</p>
                      <p className="break-all"><b>Vector:</b> {lookup.vector || "Not scored"}</p>
                    </div>
                    {lookup.references.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-black text-[#243B32]">Primary references</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {lookup.references.slice(0, 4).map((reference) => (
                            <a key={reference.url} href={reference.url} target="_blank" rel="noopener noreferrer"
                              className="rounded-lg border border-[#8DA99B] bg-white px-3 py-2 text-xs font-bold text-[#3F6B5A]">
                              {reference.tags[0] || reference.source}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {onOpenNewsForCve && (
                    <button
                      type="button"
                      onClick={() => onOpenNewsForCve(searchedCve)}
                      className="rounded-xl border border-[#3F6B5A] bg-white/70 px-4 py-2 text-sm font-bold text-[#3F6B5A]"
                    >
                      Public reports and news
                    </button>
                  )}
                  <a
                    href={`https://nvd.nist.gov/vuln/detail/${searchedCve}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-[#3F6B5A] px-4 py-2 text-sm font-bold text-white"
                  >
                    Open NVD record
                  </a>
                  <a
                    href={`https://www.cve.org/CVERecord?id=${searchedCve}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-[#3F6B5A] px-4 py-2 text-sm font-bold text-[#3F6B5A]"
                  >
                    Open CVE record
                  </a>
                </div>
              </>
            ) : (
              "No CISA KEV entries match that keyword. Enter an exact CVE ID to search the full NVD database."
            )}
          </div>
        )}

        {visibleVendorGroups.map((vendor) => (
          <details
            key={vendor.name}
            className="rounded-2xl bg-[#E6E4DE] p-4"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[#243B32]">
              <span>
                <span className="block text-xl font-black">{vendor.name}</span>
                <span className="text-sm font-semibold text-[#466357]">
                  {vendor.products.length} products
                </span>
              </span>
              <span className="rounded-full bg-[#3F6B5A] px-3 py-1 text-sm font-bold text-white">
                {vendor.count} CVEs
              </span>
            </summary>

            <div className="mt-4 space-y-3">
              {vendor.products.map((product) => (
                <details
                  key={`${vendor.name}-${product.name}`}
                  className="rounded-xl border border-[#8DA99B]/50 bg-white/60 p-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <span>
                      <span className="block font-black text-[#243B32]">
                        {product.name}
                      </span>
                      <span className="text-sm font-semibold text-[#466357]">
                        Latest added {product.vulnerabilities[0]?.dateAdded}
                      </span>
                    </span>
                    <span className="rounded-full border border-[#3F6B5A] px-3 py-1 text-sm font-bold text-[#3F6B5A]">
                      {product.vulnerabilities.length}
                    </span>
                  </summary>

                  <div className="mt-4 space-y-3">
                    {product.vulnerabilities.map((vulnerability) => (
                      <article
                        key={vulnerability.cveID}
                        className="rounded-xl bg-[#F5F4EF] p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <a
                              href={`https://nvd.nist.gov/vuln/detail/${vulnerability.cveID}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-lg font-black text-[#3F6B5A] underline"
                            >
                              {vulnerability.cveID}
                            </a>
                            {onOpenNewsForCve && (
                              <button
                                type="button"
                                onClick={() => onOpenNewsForCve(vulnerability.cveID)}
                                className="mt-3 inline-flex rounded-full border border-[#3F6B5A]/55 bg-white/70 px-3 py-1 text-xs font-black text-[#3F6B5A] transition hover:bg-white"
                              >
                                Public reports and news
                              </button>
                            )}
                            <h3 className="mt-2 text-xl font-black text-[#243B32]">
                              {vulnerability.vulnerabilityName}
                            </h3>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm text-[#466357]">
                            <p>
                              <span className="font-bold text-[#243B32]">
                                Added:
                              </span>{" "}
                              {vulnerability.dateAdded}
                            </p>
                            <p>
                              <span className="font-bold text-[#243B32]">
                                Due:
                              </span>{" "}
                              {vulnerability.dueDate}
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 text-[#466357]">
                          {vulnerability.shortDescription}
                        </p>

                        <div className="mt-4 grid gap-3 text-sm text-[#466357] md:grid-cols-2">
                          <div>
                            <p className="font-bold text-[#243B32]">
                              Required action
                            </p>
                            <p className="mt-1">{vulnerability.requiredAction}</p>
                            {preferredVendorReference(lookup, vulnerability.cveID) && (
                              <p className="mt-2 rounded-lg border border-[#8DA99B]/60 bg-white/70 p-2">
                                <span className="font-bold text-[#243B32]">Vendor guidance: </span>
                                Review and apply the security update listed in the{" "}
                                <a
                                  href={preferredVendorReference(lookup, vulnerability.cveID)!.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-[#3F6B5A] underline"
                                >
                                  vendor advisory
                                </a>
                                {" "}for every affected system.
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="font-bold text-[#243B32]">
                              Known ransomware use
                            </p>
                            <p className="mt-1">
                              {ransomwareStatus(vulnerability.knownRansomwareCampaignUse)}
                            </p>
                          </div>
                        </div>

                        {vulnerability.notes && (
                          <p className="mt-3 text-sm text-[#466357]">
                            {vulnerability.notes}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
