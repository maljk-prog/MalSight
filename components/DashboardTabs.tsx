"use client";

import { useState } from "react";
import ImpactChain from "./ImpactChain";
import KevTable from "./KevTable";
import NewsFeed from "./NewsFeed";
import ThreatMap from "./ThreatMap";

export default function DashboardTabs({ kevData }: { kevData: any }) {
  const [tab, setTab] = useState("kev");

  return (
    <section className="rounded-3xl border border-[#8DA99B]/60 bg-[#E6E4DE]/88 p-6 text-[#243B32] shadow-2xl shadow-[#13231D]/35 backdrop-blur">
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setTab("kev")}
          className={`rounded-full px-5 py-2 font-semibold ${
            tab === "kev" ? "bg-[#3F6B5A] text-white" : "bg-white/60"
          }`}
        >
          Exploited CVEs
        </button>

        <button
          onClick={() => setTab("news")}
          className={`rounded-full px-5 py-2 font-semibold ${
            tab === "news" ? "bg-[#3F6B5A] text-white" : "bg-white/60"
          }`}
        >
          Breach News
        </button>

        <button
          onClick={() => setTab("threat-map")}
          className={`rounded-full px-5 py-2 font-semibold ${
            tab === "threat-map" ? "bg-[#3F6B5A] text-white" : "bg-white/60"
          }`}
        >
          Threat Map
        </button>

        <button
          onClick={() => setTab("impact")}
          className={`rounded-full px-5 py-2 font-semibold ${
            tab === "impact" ? "bg-[#3F6B5A] text-white" : "bg-white/60"
          }`}
        >
          Impact Chain
        </button>
      </div>

      {tab === "kev" && <KevTable vulnerabilities={kevData.vulnerabilities} />}
      {tab === "news" && <NewsFeed />}
      {tab === "threat-map" && <ThreatMap />}
      {tab === "impact" && <ImpactChain />}
    </section>
  );
}
