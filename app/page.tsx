import DashboardTabs from "../components/DashboardTabs";
import SocRpgBackdrop from "../components/SocRpgBackdrop";

const CISA_KEV_FEED =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

export default async function Home() {
  const res = await fetch(CISA_KEV_FEED, { next: { revalidate: 86400 } });
  const kevData = await res.json();

  return (
    <main className="cyber-background min-h-screen px-8 py-10 text-[#243B32]">
      <div className="relative z-10 mx-auto max-w-7xl space-y-8">
        <header className="relative min-h-[360px] overflow-hidden rounded-3xl border border-[#8DA99B]/70 bg-[#C8DDD2]/92 p-10 shadow-2xl shadow-[#13231D]/40 backdrop-blur">
          <SocRpgBackdrop />
          <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#C8DDD2]/92 via-[#C8DDD2]/72 to-[#C8DDD2]/10" />
          <div className="relative z-[2] max-w-4xl">
            <p className="mb-4 inline-flex rounded-full border border-[#3F6B5A] bg-[#E6E4DE]/70 px-4 py-2 text-sm font-semibold text-[#243B32]">
              Daily security intelligence for defenders
            </p>

            <h1 className="text-6xl font-black tracking-tight text-[#243B32]">
              MalSight
            </h1>

            <p className="mt-4 max-w-3xl text-lg text-[#243B32]">
              A lightweight SOC-focused dashboard for live exploited vulnerabilities,
              breach news, and defender-focused intelligence.
            </p>

            <div className="mt-8 flex gap-4">
              <div className="rounded-2xl bg-[#E6E4DE]/85 p-5 shadow-lg shadow-[#243B32]/10">
                <p className="text-sm text-[#243B32]">Catalog version</p>
                <p className="text-2xl font-bold text-[#243B32]">
                  {kevData.catalogVersion}
                </p>
              </div>

              <div className="rounded-2xl bg-[#E6E4DE]/85 p-5 shadow-lg shadow-[#243B32]/10">
                <p className="text-sm text-[#243B32]">Total exploited CVEs</p>
                <p className="text-2xl font-bold text-[#243B32]">
                  {kevData.count.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </header>

        <DashboardTabs kevData={kevData} />
      </div>
    </main>
  );
}
