"use client";

import { useEffect, useMemo, useState } from "react";

type NewsItem = {
  source: string;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
};

type NewsResponse = {
  updatedAt?: string;
  pageSize?: number;
  items?: NewsItem[];
};

export default function NewsFeed() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) return items;

    return items.filter((item) =>
      [item.source, item.title, item.contentSnippet, item.pubDate]
        .join(" ")
        .toLowerCase()
        .includes(normalizedKeyword),
    );
  }, [items, keyword]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = filteredItems.slice(
    page * pageSize,
    page * pageSize + pageSize,
  );

  useEffect(() => {
    fetch("/api/news")
      .then((res) => {
        if (!res.ok) {
          throw new Error("News request failed");
        }

        return res.json() as Promise<NewsResponse>;
      })
      .then((data) => {
        setItems(data.items || []);
        setUpdatedAt(data.updatedAt || null);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.3em] text-[#3F6B5A]">
            GLOBAL BREACH NEWS
          </p>
          <h2 className="mt-2 text-3xl font-black">
            Recent public security news
          </h2>
          <p className="mt-2 text-[#466357]">
            Daily feed from credible cybersecurity reporting sources. Each card
            opens the original article. Search by source, title, or summary.
          </p>
        </div>

        <div className="text-sm font-semibold text-[#466357]">
          {status === "ready" && (
            <>
              <p>
                Page {page + 1} of {totalPages}
              </p>
              {updatedAt && (
                <p>
                  Updated{" "}
                  {new Intl.DateTimeFormat("en", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(updatedAt))}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-[#466357]">
            Search news
          </span>
          <input
            type="search"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(0);
            }}
            placeholder="Source, title, keyword..."
            className="w-full rounded-xl border border-[#8DA99B] bg-white/80 px-4 py-3 text-sm font-semibold text-[#243B32] outline-none focus:border-[#3F6B5A]"
          />
        </label>
      </div>

      <div className="min-h-[620px] space-y-4 rounded-2xl border border-[#8DA99B]/50 bg-white/50 p-4">
        {status === "loading" && (
          <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
            Loading current security news...
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
            News is temporarily unavailable. Try refreshing the dashboard.
          </div>
        )}

        {status === "ready" && visibleItems.length === 0 && (
          <div className="rounded-2xl bg-[#E6E4DE] p-5 text-[#466357]">
            {keyword.trim()
              ? "No articles match that keyword."
              : "No articles are available right now."}
          </div>
        )}

        {visibleItems.map((item) => (
          <a
            key={item.link}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl bg-[#E6E4DE] p-5 transition hover:bg-[#D6C89B]/70"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-[#3F6B5A]">
              {item.source}
            </p>

            <h3 className="mt-2 text-xl font-black text-[#243B32]">
              {item.title}
            </h3>

            <p className="mt-2 text-sm text-[#466357]">
              {item.contentSnippet}
            </p>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-[#466357]">
              <p>{item.pubDate}</p>
              <p>Open article</p>
            </div>
          </a>
        ))}
      </div>

      {status === "ready" && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
            className="rounded-xl border border-[#8DA99B] px-4 py-2 text-sm font-bold text-[#243B32] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <p className="text-sm font-semibold text-[#466357]">
            Showing {visibleItems.length} of {filteredItems.length}
          </p>
          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(totalPages - 1, current + 1))
            }
            disabled={page >= totalPages - 1}
            className="rounded-xl border border-[#8DA99B] px-4 py-2 text-sm font-bold text-[#243B32] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
