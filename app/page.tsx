import DashboardTabs from "../components/DashboardTabs";

const CISA_KEV_FEED =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

export default async function Home() {
  const res = await fetch(CISA_KEV_FEED, { next: { revalidate: 86400 } });
  const kevData = await res.json();

  return (
    <main className="min-h-screen bg-[#E6E4DE] px-8 py-10 text-[#243B32]">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-3xl border border-[#8DA99B] bg-[#C8DDD2] p-10 shadow-xl">
          <p className="mb-4 inline-flex rounded-full border border-[#3F6B5A] px-4 py-2 text-sm font-semibold text-[#243B32]">
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
            <div className="rounded-2xl bg-[#E6E4DE] p-5">
              <p className="text-sm text-[#243B32]">Catalog version</p>
              <p className="text-2xl font-bold text-[#243B32]">
                {kevData.catalogVersion}
              </p>
            </div>

            <div className="rounded-2xl bg-[#E6E4DE] p-5">
              <p className="text-sm text-[#243B32]">Total KEVs</p>
              <p className="text-2xl font-bold text-[#243B32]">
                {kevData.count.toLocaleString()}
              </p>
            </div>
          </div>
        </header>

        <DashboardTabs kevData={kevData} />
      </div>
    </main>
  );
}
