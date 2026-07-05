"use client";

import { useState } from "react";

const LIVE_FEATURES = [
  {
    title: "Exploited CVEs",
    description: "Browse impacted vendors or the latest CISA additions.",
  },
  {
    title: "Breach News",
    description: "Review current cybersecurity headlines in one feed.",
  },
  {
    title: "Threat Map",
    description: "Inspect public source-IP telemetry by country and IP.",
  },
  {
    title: "Impact Chain",
    description: "Walk through how a vulnerability can become business impact.",
  },
  {
    title: "Cooler Talk",
    description: "Track search chatter, public panic, and a weekly cyber topic.",
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
          What is live so far
        </span>
        <span className="mt-1 block text-xs font-semibold opacity-85">
          {showLiveFeatures ? "Hide dashboard views" : "Show dashboard views"}
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
