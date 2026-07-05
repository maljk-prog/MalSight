import DashboardTabs from "../components/DashboardTabs";
import HeroLiveFeatures from "../components/HeroLiveFeatures";
import SocRpgBackdrop from "../components/SocRpgBackdrop";
import ThemeSwitcher from "../components/ThemeSwitcher";

const CISA_KEV_FEED =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

async function getKevData() {
  try {
    const res = await fetch(CISA_KEV_FEED, { next: { revalidate: 86400 } });

    if (!res.ok) {
      throw new Error("CISA KEV feed request failed");
    }

    return res.json();
  } catch {
    return {
      count: 0,
      vulnerabilities: [],
    };
  }
}

export default async function Home() {
  const kevData = await getKevData();

  return (
    <main className="cyber-background min-h-screen px-3 py-6 text-[#243B32] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="relative z-10 mx-auto max-w-7xl space-y-8">
        <header className="theme-hero relative min-h-[620px] overflow-hidden rounded-3xl border border-[#8DA99B]/70 bg-[#13231D] p-4 shadow-2xl shadow-[#13231D]/40 sm:p-8">
          <SocRpgBackdrop />
          <div className="theme-hero-tint absolute inset-0 z-[1] bg-[#C8DDD2]/34 backdrop-blur-[1px]" />
          <div className="theme-hero-panel absolute inset-0 z-[2] flex flex-col justify-end border border-[#C8DDD2]/30 bg-[#C8DDD2]/48 p-4 pb-8 shadow-inner shadow-[#13231D]/25 sm:p-8 sm:pb-10">
            <ThemeSwitcher />
            <div>
              <div className="max-w-xl">
                <p className="theme-eyebrow mb-4 inline-flex rounded-full border border-[#3F6B5A]/70 bg-[#E6E4DE]/55 px-4 py-2 text-sm font-semibold text-[#243B32] shadow-sm shadow-[#13231D]/10">
                  Daily security intelligence for defenders
                </p>

                <h1 className="theme-title text-6xl font-black tracking-tight text-[#243B32]">
                  MalSight
                </h1>

                <p className="theme-copy mt-4 max-w-3xl text-lg text-[#243B32]">
                  A tiny SOC making sense of today's cyber landscape.
                </p>
              </div>

              <HeroLiveFeatures />
            </div>
          </div>
        </header>

        <DashboardTabs kevData={kevData} />
      </div>
    </main>
  );
}
