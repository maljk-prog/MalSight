export const dynamic = "force-dynamic";

const CVE_ID = /^CVE-\d{4}-\d{4,7}$/i;
const NVD_API = "https://services.nvd.nist.gov/rest/json/cves/2.0";

type NvdMetric = {
  cvssData?: { baseScore?: number; baseSeverity?: string; vectorString?: string };
};

function englishDescription(cve: Record<string, any>) {
  return cve.descriptions?.find((item: { lang?: string }) => item.lang === "en")?.value ||
    "No English description is available from NVD.";
}

function primaryMetric(cve: Record<string, any>): NvdMetric | undefined {
  const metrics = cve.metrics || {};
  return metrics.cvssMetricV40?.[0] || metrics.cvssMetricV31?.[0] ||
    metrics.cvssMetricV30?.[0] || metrics.cvssMetricV2?.[0];
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim().toUpperCase() || "";
  if (!CVE_ID.test(id)) {
    return Response.json({ error: "Enter a valid CVE ID." }, { status: 400 });
  }

  try {
    const response = await fetch(`${NVD_API}?cveId=${encodeURIComponent(id)}`, {
      headers: { "User-Agent": "MalSight CVE lookup contact: github.com/maljk-prog/MalSight" },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error(`NVD returned HTTP ${response.status}`);

    const payload = await response.json();
    const cve = payload.vulnerabilities?.[0]?.cve as Record<string, any> | undefined;
    if (!cve || cve.id?.toUpperCase() !== id) {
      return Response.json({ error: `${id} was not found in NVD.` }, { status: 404 });
    }

    const metric = primaryMetric(cve)?.cvssData;
    const weaknesses = (cve.weaknesses || [])
      .flatMap((item: Record<string, any>) => item.description || [])
      .filter((item: { lang?: string }) => item.lang === "en")
      .map((item: { value: string }) => item.value);
    const references = (cve.references || []).slice(0, 8).map((item: Record<string, any>) => ({
      url: item.url,
      source: item.source || "External reference",
      tags: Array.isArray(item.tags) ? item.tags : [],
    }));
    const inCisaKev = (cve.references || []).some((item: Record<string, any>) =>
      /cisa\.gov\/known-exploited-vulnerabilities-catalog/i.test(item.url || ""),
    );

    return Response.json({
      id: cve.id,
      status: cve.vulnStatus || "Unknown",
      published: cve.published || null,
      lastModified: cve.lastModified || null,
      description: englishDescription(cve),
      score: metric?.baseScore ?? null,
      severity: metric?.baseSeverity || null,
      vector: metric?.vectorString || null,
      weaknesses: Array.from(new Set(weaknesses)),
      references,
      inCisaKev,
      source: "NIST National Vulnerability Database",
    });
  } catch {
    return Response.json(
      { error: "NVD is temporarily unavailable. Try this CVE again shortly." },
      { status: 503 },
    );
  }
}
