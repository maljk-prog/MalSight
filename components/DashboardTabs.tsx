"use client";

import { useState } from "react";
import CoolerTalk from "./CoolerTalk";
import ImpactChain from "./ImpactChain";
import KevTable from "./KevTable";
import NewsFeed from "./NewsFeed";
import ThreatMap from "./ThreatMap";
import ThreatWeatherPanel from "./ThreatWeatherPanel";

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

type KevData = {
  count: number;
  vulnerabilities: KevVulnerability[];
};

export default function DashboardTabs({ kevData }: { kevData: KevData }) {
  const [tab, setTab] = useState("home");
  const [selectedCve, setSelectedCve] = useState("");
  const [selectedNewsCve, setSelectedNewsCve] = useState("");
  const tabs = [
    { id: "home", label: "Home" },
    { id: "news", label: "Breach News" },
    { id: "threat-map", label: "Threat Map" },
    { id: "impact", label: "Impact Chain" },
    { id: "cooler-talk", label: "Cooler Talk" },
    { id: "kev", label: "Exploited CVEs" },
  ];

  return (
    <section className="theme-dashboard overflow-hidden rounded-3xl border border-[#8DA99B]/60 bg-[#E6E4DE]/88 text-[#243B32] shadow-2xl shadow-[#13231D]/35 backdrop-blur">
      <div className="theme-dashboard-bar flex flex-col gap-4 border-b border-[#8DA99B]/45 bg-[#F5F4EF]/70 px-3 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="theme-kicker text-sm font-black tracking-[0.28em] text-[#3F6B5A]">
            DASHBOARD
          </p>
          <p className="theme-muted mt-1 text-sm font-semibold text-[#466357]">
            Live intelligence views for defenders
          </p>
        </div>

        <nav className="flex flex-wrap gap-2" aria-label="Dashboard views">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`theme-tab-button rounded-full px-5 py-2 text-sm font-bold transition ${
                tab === item.id
                  ? "is-active bg-[#3F6B5A] text-white shadow-lg shadow-[#243B32]/15"
                  : "border border-[#8DA99B]/55 bg-white/55 text-[#243B32] hover:bg-white/80"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="theme-dashboard-content p-3 sm:p-6">
        {tab === "home" && <DashboardHome />}
        {tab === "kev" && (
          <KevTable
            vulnerabilities={kevData.vulnerabilities}
            selectedCve={selectedCve}
            onOpenNewsForCve={(cve) => {
              setSelectedNewsCve(cve);
              setTab("news");
            }}
          />
        )}
        {tab === "news" && (
          <NewsFeed
            selectedCve={selectedNewsCve}
            onSelectCve={(cve) => {
              setSelectedCve(cve);
              setTab("kev");
            }}
          />
        )}
        {tab === "threat-map" && <ThreatMap />}
        {tab === "impact" && <ImpactChain />}
        {tab === "cooler-talk" && <CoolerTalk />}
      </div>
    </section>
  );
}

function DashboardHome() {
  return (
    <div className="space-y-6">
      <div className="theme-home-panel rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-6">
        <p className="theme-kicker text-sm font-black tracking-[0.3em] text-[#3F6B5A]">
          MALSIGHT HOME
        </p>
        <h2 className="theme-title mt-2 text-3xl font-black text-[#243B32]">
          A focused SOC dashboard for vulnerability and threat awareness
        </h2>
        <p className="theme-muted mt-3 text-[#466357]">
          MalSight brings exploited CVE tracking, breach reporting, public
          attack telemetry, and impact-chain analysis into one compact defender
          workspace. Use the navigation above to move between the current
          intelligence views.
        </p>
      </div>

      <ThreatWeatherPanel />
    </div>
  );
}
