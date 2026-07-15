"use client";

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

function sortByLatest(a: KevVulnerability, b: KevVulnerability) {
  return b.dateAdded.localeCompare(a.dateAdded);
}

function isAddedWithinLast30Days(vulnerability: KevVulnerability) {
  const addedAt = Date.parse(vulnerability.dateAdded);

  if (!Number.isFinite(addedAt)) return false;

  return Date.now() - addedAt <= 30 * 24 * 60 * 60 * 1000;
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

  useEffect(() => {
    if (!selectedCve) return;

    setKeyword(selectedCve);
    setSelectedLetter("Top 15");
  }, [selectedCve]);
  const normalizedKeyword = keyword.trim().toLowerCase();
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
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.3em] text-[#3F6B5A]">
            EXPLOITED CVEs
          </p>
          <h2 className="mt-2 text-3xl font-black">
            Known exploited CVEs by vendor
          </h2>
          <p className="mt-2 text-[#466357]">
            CISA KEV is a curated list of CVEs known to be exploited in the
            wild. Browse them by vendor, jump by letter, or search by keyword.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-sm font-semibold text-[#243B32]">
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
        </div>
      </div>

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

        <div className="flex flex-wrap gap-2">
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
        </div>

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
            No exploited CVEs match that keyword.
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
                          </div>

                          <div>
                            <p className="font-bold text-[#243B32]">
                              Known ransomware use
                            </p>
                            <p className="mt-1">
                              {vulnerability.knownRansomwareCampaignUse ||
                                "Unknown"}
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
