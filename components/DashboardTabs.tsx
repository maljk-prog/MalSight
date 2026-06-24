"use client";

import { useState } from "react";
import KevTable from "./KevTable";
import NewsFeed from "./NewsFeed";

export default function DashboardTabs({ kevData }: { kevData: any }) {
  const [tab, setTab] = useState("kev");

  return (
    <section className="rounded-3xl border border-[#8DA99B]/40 bg-[#E6E4DE]/90 p-6 text-[#243B32] shadow-2xl">
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setTab("kev")}
          className={`rounded-full px-5 py-2 font-semibold ${
            tab === "kev" ? "bg-[#3F6B5A] text-white" : "bg-white/60"
          }`}
        >
          CISA KEV
        </button>

        <button
          onClick={() => setTab("news")}
          className={`rounded-full px-5 py-2 font-semibold ${
            tab === "news" ? "bg-[#3F6B5A] text-white" : "bg-white/60"
          }`}
        >
          Breach News
        </button>
      </div>

      {tab === "kev" && <KevTable vulnerabilities={kevData.vulnerabilities.slice(0, 20)} />}
      {tab === "news" && <NewsFeed />}
    </section>
  );
}