export default function KevTable({ vulnerabilities }: { vulnerabilities: any[] }) {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold tracking-[0.3em] text-[#3F6B5A]">
          CISA KEV
        </p>
        <h2 className="mt-2 text-3xl font-black">
          Latest known exploited vulnerabilities
        </h2>
        <p className="mt-2 text-[#466357]">
          Latest 20 entries from the official CISA Known Exploited Vulnerabilities catalog.
        </p>
      </div>

      <div className="max-h-[620px] overflow-y-auto rounded-2xl border border-[#8DA99B]/50 bg-white/50">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-[#8DA99B] text-[#243B32]">
            <tr>
              <th className="p-4">CVE</th>
              <th className="p-4">Vendor</th>
              <th className="p-4">Product</th>
              <th className="p-4">Vulnerability</th>
              <th className="p-4">Date Added</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Required Action</th>
            </tr>
          </thead>

          <tbody>
            {vulnerabilities.map((vuln) => (
              <tr key={vuln.cveID} className="border-t border-[#8DA99B]/40">
                <td className="p-4 font-bold">
                  <a
                    href={`https://nvd.nist.gov/vuln/detail/${vuln.cveID}`}
                    target="_blank"
                    className="text-[#3F6B5A] underline"
                  >
                    {vuln.cveID}
                  </a>
                </td>
                <td className="p-4">{vuln.vendorProject}</td>
                <td className="p-4">{vuln.product}</td>
                <td className="p-4 min-w-[360px]">
                  <p className="font-bold">{vuln.vulnerabilityName}</p>
                  <p className="mt-2 text-[#466357]">
                    {vuln.shortDescription}
                  </p>
                </td>
                <td className="p-4 whitespace-nowrap">{vuln.dateAdded}</td>
                <td className="p-4 whitespace-nowrap">{vuln.dueDate}</td>
                <td className="p-4 min-w-[420px] text-[#466357]">
                  {vuln.requiredAction}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}