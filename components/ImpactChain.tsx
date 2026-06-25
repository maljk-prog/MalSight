"use client";

import { useEffect, useState } from "react";

type ImpactItem = {
  source: string;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  industry: string;
  affectedSystem: string;
  protectedAsset: string;
  threatEvent: string;
  exposure: string;
  ciaImpact: string;
  likelihood: string;
  riskResponse: string;
  simpleAnalogy: string;
  humanImpact: string[];
};

type ImpactResponse = {
  updatedAt?: string;
  disclaimer?: string;
  items?: ImpactItem[];
};

export default function ImpactChain() {
  const [items, setItems] = useState<ImpactItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    fetch("/api/impact-chain")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Impact chain request failed");
        }

        return response.json() as Promise<ImpactResponse>;
      })
      .then((payload) => {
        setItems(payload.items || []);
        setUpdatedAt(payload.updatedAt || null);
        setDisclaimer(payload.disclaimer || "");
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.3em] text-[#3F6B5A]">
            HUMAN IMPACT CHAINS
          </p>
          <h2 className="mt-2 text-3xl font-black">
            Five breaches through a human lens
          </h2>
          <p className="mt-2 max-w-3xl text-[#466357]">
            Recent breach and attack reporting translated into hypothetical
            downstream effects on people, households, workers, and communities,
            with a light risk-management lens.
          </p>
        </div>

        {updatedAt && (
          <p className="text-sm font-semibold text-[#466357]">
            Updated{" "}
            {new Intl.DateTimeFormat("en", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date(updatedAt))}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
        {status === "loading" && (
          <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
            Building this month&apos;s impact chains...
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
            Impact chains are temporarily unavailable. Try refreshing the
            dashboard.
          </div>
        )}

        {status === "ready" && items.length === 0 && (
          <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
            No recent breach-like stories are available right now.
          </div>
        )}

        {status === "ready" && (
          <div className="space-y-4">
            {items.map((item, index) => (
              <details
                key={item.link}
                className="rounded-2xl bg-[#E6E4DE] p-5"
                open={index === 0}
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-[#3F6B5A]">
                        {item.industry}
                      </p>
                      <h3 className="mt-2 text-2xl font-black text-[#243B32]">
                        {item.title}
                      </h3>
                      <p className="mt-2 max-w-4xl text-sm text-[#466357]">
                        {item.contentSnippet}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-xl border border-[#8DA99B] bg-white/55 px-4 py-3 text-sm font-bold text-[#243B32]">
                      Chain #{index + 1}
                    </div>
                  </div>
                </summary>

                <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
                  <div className="rounded-xl border border-[#8DA99B]/50 bg-white/60 p-4">
                    <p className="text-sm font-bold text-[#243B32]">
                      Source report
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#466357]">
                      {item.source} · {item.pubDate}
                    </p>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex rounded-xl bg-[#3F6B5A] px-4 py-2 text-sm font-bold text-white"
                    >
                      Open article
                    </a>
                    <p className="mt-5 text-sm font-bold text-[#243B32]">
                      Asset at risk
                    </p>
                    <p className="mt-2 text-sm text-[#466357]">
                      {item.protectedAsset}
                    </p>

                    <p className="mt-5 text-sm font-bold text-[#243B32]">
                      Affected layer
                    </p>
                    <p className="mt-2 text-sm text-[#466357]">
                      {item.affectedSystem}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#8DA99B]/50 bg-white/60 p-4">
                    <div className="mb-4 rounded-xl bg-[#F5F4EF] p-4">
                      <p className="text-sm font-bold text-[#243B32]">
                        Risk lens
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-[#3F6B5A]">
                            Threat event
                          </p>
                          <p className="mt-1 text-sm text-[#466357]">
                            {item.threatEvent}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-[#3F6B5A]">
                            Exposure
                          </p>
                          <p className="mt-1 text-sm text-[#466357]">
                            {item.exposure}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-[#3F6B5A]">
                            CIA impact
                          </p>
                          <p className="mt-1 text-sm text-[#466357]">
                            {item.ciaImpact}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-[#3F6B5A]">
                            Likelihood
                          </p>
                          <p className="mt-1 text-sm text-[#466357]">
                            {item.likelihood}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-bold uppercase tracking-widest text-[#3F6B5A]">
                        Risk response
                      </p>
                      <p className="mt-1 text-sm text-[#466357]">
                        {item.riskResponse}
                      </p>
                    </div>

                    <div className="mb-4 rounded-xl border border-[#D6C89B]/70 bg-[#F5F4EF] p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#3F6B5A]">
                        Simplified analogy
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#466357]">
                        {item.simpleAnalogy}
                      </p>
                    </div>

                    <p className="text-sm font-bold text-[#243B32]">
                      Hypothetical impact chain
                    </p>
                    <div className="mt-4 space-y-3">
                      {item.humanImpact.map((impact, impactIndex) => (
                        <div
                          key={impact}
                          className="grid gap-3 md:grid-cols-[42px_1fr]"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3F6B5A] text-sm font-black text-white">
                            {impactIndex + 1}
                          </div>
                          <div className="rounded-xl bg-[#F5F4EF] p-4 text-[#466357]">
                            {impact}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            ))}

            {disclaimer && (
              <p className="rounded-2xl bg-[#F5F4EF] p-4 text-sm font-semibold text-[#466357]">
                {disclaimer}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
