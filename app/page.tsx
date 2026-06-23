import KevTable from "@/components/KevTable";

const CISA_KEV_FEED = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

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

type KevFeed = {
  title: string;
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: KevVulnerability[];
};

async function getKevData(): Promise<KevFeed> {
  const response = await fetch(CISA_KEV_FEED, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("Unable to load CISA KEV feed");
  }

  return response.json();
}

export default async function Home() {
  const data = await getKevData();
  const latestVulnerabilities = [...data.vulnerabilities]
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .slice(0, 20);

  return (
    <main className="min-h-screen px-5 py-8 md:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/20 backdrop-blur md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
              Daily security intelligence for defenders
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">MalSight</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              A lightweight SOC-focused dashboard starting with live CISA Known Exploited Vulnerabilities data.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm md:min-w-80">
            <div className="rounded-2xl border border-white/10 bg-panel/80 p-4">
              <p className="text-slate-400">Catalog version</p>
              <p className="mt-1 text-xl font-semibold text-white">{data.catalogVersion}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-panel/80 p-4">
              <p className="text-slate-400">Total KEVs</p>
              <p className="mt-1 text-xl font-semibold text-white">{data.count.toLocaleString()}</p>
            </div>
          </div>
        </header>

        <KevTable vulnerabilities={latestVulnerabilities} />

        <footer className="mt-6 text-center text-xs text-slate-500">
          Data source: CISA Known Exploited Vulnerabilities Catalog. Built for educational and portfolio purposes.
        </footer>
      </div>
    </main>
  );
}
