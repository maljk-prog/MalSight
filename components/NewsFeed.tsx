"use client";

import { useEffect, useState } from "react";

export default function NewsFeed() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => setItems(data.items || []));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold tracking-[0.3em] text-[#3F6B5A]">
          GLOBAL BREACH NEWS
        </p>
        <h2 className="mt-2 text-3xl font-black">
          Recent public security news
        </h2>
        <p className="mt-2 text-[#466357]">
          Scrollable feed of recent cybersecurity and breach-related reporting.
        </p>
      </div>

      <div className="max-h-[620px] space-y-4 overflow-y-auto rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
        {items.map((item, index) => (
          <a
            key={index}
            href={item.link}
            target="_blank"
            className="block rounded-2xl bg-[#E6E4DE] p-5 transition hover:bg-[#D6C89B]/70"
          >
            {item.image && (
              <img
                src={item.image}
                alt=""
                className="mb-4 h-40 w-full rounded-xl object-cover"
              />
            )}

            <p className="text-xs font-bold uppercase tracking-widest text-[#3F6B5A]">
              {item.source}
            </p>

            <h3 className="mt-2 text-xl font-black text-[#243B32]">
              {item.title}
            </h3>

            <p className="mt-2 text-sm text-[#466357]">
              {item.contentSnippet}
            </p>

            <p className="mt-3 text-xs text-[#466357]">
              {item.pubDate}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}