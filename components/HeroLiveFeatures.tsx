"use client";

import { useState } from "react";

const LIVE_FEATURES = [
  {
    title: "Threat Weather",
    description: "Summarizes validated indicators from reachable public feeds, with freshness, source health, and no fabricated fallback data.",
  },
  {
    title: "Exploited CVEs",
    description: "Browse the current CISA KEV catalog and retrieve any exact CVE from NIST NVD, whether or not CISA lists it as exploited.",
  },
  {
    title: "Breach News",
    description: "Review current public security reporting grouped into related stories, with article CVEs linked directly to the CVE view.",
  },
  {
    title: "Threat Map",
    description: "Explore publicly reported source-IP activity by location, network, category, and timeframe, with on-demand public-IP context.",
  },
  {
    title: "Impact Chain",
    description: "Translate recent attack and breach reporting into clearly labeled, hypothetical downstream effects on people and communities.",
  },
  {
    title: "Cooler Talk",
    description: "Follow security-focused public-interest and news signals, with measured context instead of treating attention as proof of an incident.",
  },
  {
    title: "Training Grounds",
    description: "Practice knowledge checks or work through 10–20-step intrusion investigations with evidence, scoping, containment, and ATT&CK context.",
  },
];

export default function HeroLiveFeatures() {
  const [showLiveFeatures, setShowLiveFeatures] = useState(false);

  return (
    <div className="mt-14 grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-end">
      <button
        type="button"
        onClick={() => setShowLiveFeatures((current) => !current)}
        className={`hero-live-trigger rounded-2xl border px-4 py-3 text-left backdrop-blur transition ${
          showLiveFeatures
            ? "is-open shadow-lg shadow-[#243B32]/10"
            : ""
        }`}
      >
        <span className="block text-xs font-black uppercase tracking-[0.2em]">
          Click to view
        </span>
        <span className="mt-1 block text-xl font-black">
          What&apos;s live now
        </span>
        <span className="mt-1 block text-xs font-semibold opacity-85">
          {showLiveFeatures ? "Hide feature details" : `${LIVE_FEATURES.length} working views and tools`}
        </span>
      </button>

      <div className="min-w-0">
        <div
          className={`hero-live-scroll flex min-h-[118px] gap-3 overflow-x-auto overscroll-x-contain rounded-2xl pb-2 pr-2 transition ${
          showLiveFeatures
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          aria-hidden={!showLiveFeatures}
        >
          {LIVE_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="hero-live-card min-h-24 min-w-[230px] max-w-[230px] rounded-2xl border p-4 backdrop-blur"
            >
              <p className="hero-live-card-title font-black">{feature.title}</p>
              <p className="hero-live-card-copy mt-2 text-sm font-semibold leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
