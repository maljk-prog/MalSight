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

type KevTableProps = {
  vulnerabilities: KevVulnerability[];
};

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function KevTable({ vulnerabilities }: KevTableProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-panel/90 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="flex flex-col gap-3 border-b border-white/10 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-accent">CISA KEV</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Latest known exploited vulnerabilities</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Latest 20 entries from the official CISA Known Exploited Vulnerabilities catalog.
          </p>
        </div>
        <div className="rounded-2xl bg-panelSoft px-4 py-3 text-sm text-slate-300">
          <span className="block text-2xl font-bold text-white">{vulnerabilities.length}</span>
          entries loaded
        </div>
      </div>

      <div className="max-h-[560px] overflow-auto">
        <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-panelSoft text-xs uppercase tracking-wider text-slate-300">
            <tr>
              <th className="px-5 py-4 font-semibold">CVE</th>
              <th className="px-5 py-4 font-semibold">Vendor</th>
              <th className="px-5 py-4 font-semibold">Product</th>
              <th className="px-5 py-4 font-semibold">Vulnerability</th>
              <th className="px-5 py-4 font-semibold">Date Added</th>
              <th className="px-5 py-4 font-semibold">Due Date</th>
              <th className="px-5 py-4 font-semibold">Ransomware Use</th>
              <th className="px-5 py-4 font-semibold">Required Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {vulnerabilities.map((vuln) => (
              <tr key={vuln.cveID} className="transition hover:bg-white/[0.04]">
                <td className="whitespace-nowrap px-5 py-4 font-mono font-semibold text-accent">
                  <a
                    href={`https://nvd.nist.gov/vuln/detail/${vuln.cveID}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {vuln.cveID}
                  </a>
                </td>
                <td className="px-5 py-4 text-slate-100">{vuln.vendorProject || "—"}</td>
                <td className="px-5 py-4 text-slate-300">{vuln.product || "—"}</td>
                <td className="px-5 py-4 text-slate-100">
                  <div className="font-medium">{vuln.vulnerabilityName || "—"}</div>
                  <div className="mt-1 line-clamp-2 max-w-md text-xs leading-5 text-slate-400">
                    {vuln.shortDescription || "No description provided."}
                  </div>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-300">{formatDate(vuln.dateAdded)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-300">{formatDate(vuln.dueDate)}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                    {vuln.knownRansomwareCampaignUse || "Unknown"}
                  </span>
                </td>
                <td className="max-w-sm px-5 py-4 text-xs leading-5 text-slate-300">
                  {vuln.requiredAction || "Apply vendor guidance."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
