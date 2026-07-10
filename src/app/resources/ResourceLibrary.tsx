"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Card } from "@/components/Card";
import { Icon } from "@/components/icons";
import { resourceCategories, type Resource } from "@/content/resources";

/**
 * Searchable education library (PDR §6.1) — client-side filter over the
 * content collection; no queries leave the browser.
 */
export function ResourceLibrary({ items }: { items: Resource[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const searchId = useId();
  const statusId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((r) => {
      const inCategory = category === "All" || r.category === category;
      if (!inCategory) return false;
      if (!q) return true;
      const haystack = `${r.title} ${r.summary} ${r.keyPoints.join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query, category]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-md">
          <label htmlFor={searchId} className="mb-1.5 block text-sm font-semibold text-starlight">
            Search the library
          </label>
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-silver"
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try 'blood pressure' or 'vaccines'…"
              aria-describedby={statusId}
              className="w-full rounded-full border border-silver/30 bg-navy/60 py-3 pl-12 pr-4 text-base text-starlight placeholder:text-silver/50 transition-colors hover:border-silver/50 focus:border-cyan"
            />
          </div>
        </div>

        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {["All", ...resourceCategories].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                category === c
                  ? "border-cyan bg-cyan/10 text-cyan"
                  : "border-silver/30 text-silver hover:border-silver/60"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <p id={statusId} role="status" className="mt-6 text-sm text-silver">
        {filtered.length} {filtered.length === 1 ? "article" : "articles"}
        {category !== "All" ? ` in ${category}` : ""}
        {query.trim() ? ` matching “${query.trim()}”` : ""}
      </p>

      {/* Results */}
      <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => (
          <li key={r.slug}>
            <Link href={`/resources/${r.slug}`} className="group block h-full rounded-2xl">
              <Card glow className="h-full">
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="rounded-full border border-cyan/40 px-2.5 py-1 font-semibold uppercase tracking-wider text-cyan">
                      {r.category}
                    </span>
                    <span className="text-silver">{r.readingMinutes} min read</span>
                  </div>
                  <h2 className="mt-4 text-lg leading-snug text-starlight group-hover:text-cyan">
                    {r.title}
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-silver">{r.summary}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan">
                    Read article <Icon name="arrow" className="h-4 w-4" />
                  </span>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <Card className="mt-6 max-w-xl">
          <p className="text-base text-silver">
            Nothing matches that search yet. The library grows every month — try a broader
            term, or{" "}
            <Link href="/contact" className="text-cyan underline underline-offset-2">
              tell us what you&rsquo;d like covered
            </Link>
            .
          </p>
        </Card>
      ) : null}
    </div>
  );
}
