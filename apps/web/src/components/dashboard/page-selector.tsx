"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SelectablePage {
  url: string;
  source: "homepage" | "sitemap" | "link" | "monitored";
}

const sourceLabels: Record<SelectablePage["source"], string> = {
  homepage: "Homepage",
  sitemap: "Sitemap",
  link: "Homepage link",
  monitored: "Currently monitored",
};

/**
 * Discovered-page selection list with search, manual add, and a plan-budget
 * counter. Used by the add-website wizard and the edit-pages screen.
 */
export function PageSelector({
  pages,
  setPages,
  selected,
  setSelected,
  pageBudget,
  warnings,
  truncated,
}: {
  pages: SelectablePage[];
  setPages: React.Dispatch<React.SetStateAction<SelectablePage[]>>;
  selected: Set<string>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
  pageBudget: number;
  warnings: string[];
  truncated: boolean;
}) {
  const [filter, setFilter] = useState("");
  const [manualUrl, setManualUrl] = useState("");

  const visible = useMemo(
    () =>
      filter.trim()
        ? pages.filter((p) => p.url.toLowerCase().includes(filter.trim().toLowerCase()))
        : pages,
    [pages, filter],
  );

  function toggle(pageUrl: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pageUrl)) {
        next.delete(pageUrl);
      } else if (next.size < pageBudget) {
        next.add(pageUrl);
      }
      return next;
    });
  }

  function addManual(e: React.FormEvent) {
    e.preventDefault();
    const value = manualUrl.trim();
    if (!value) return;
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    setPages((prev) =>
      prev.some((p) => p.url === candidate)
        ? prev
        : [...prev, { url: candidate, source: "link" }],
    );
    setSelected((prev) => (prev.size >= pageBudget ? prev : new Set(prev).add(candidate)));
    setManualUrl("");
  }

  function pathOf(url: string): string {
    try {
      const u = new URL(url);
      return u.pathname + u.search;
    } catch {
      return url;
    }
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Choose pages to monitor</h2>
          <p className="text-[13px] text-ink-secondary">
            {pages.length} page{pages.length === 1 ? "" : "s"} available
            {truncated && " (discovery capped at 200)"}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[13px] font-semibold",
            selected.size >= pageBudget
              ? "bg-warning-soft text-amber-700"
              : "bg-primary-soft text-primary",
          )}
        >
          {pageBudget === Infinity
            ? `${selected.size} selected`
            : `${selected.size} of ${pageBudget} selected`}
        </span>
      </div>

      {warnings.length > 0 && (
        <div className="mb-4 space-y-1 rounded-tile bg-warning-soft px-4 py-3">
          {warnings.map((w) => (
            <p key={w} className="flex items-start gap-2 text-[13px] text-amber-800">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {w}
            </p>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search pages"
            aria-label="Search pages"
            className="h-11 w-full rounded-full border border-line bg-card pl-11 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          className="h-11 rounded-full border border-line px-4 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          Clear selection
        </button>
      </div>

      <ul
        className="max-h-96 divide-y divide-line overflow-y-auto rounded-tile border border-line"
        aria-label="Pages"
      >
        {visible.map((page) => {
          const checked = selected.has(page.url);
          const disabled = !checked && selected.size >= pageBudget;
          const path = pathOf(page.url);
          return (
            <li key={page.url}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-surface",
                  disabled && "cursor-not-allowed opacity-45",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(page.url)}
                  className="size-4 accent-[#3556f4]"
                />
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">
                  {path === "/" ? "/ (homepage)" : path}
                </span>
                <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink-faint">
                  {sourceLabels[page.source]}
                </span>
              </label>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-ink-faint">
            No pages match your search.
          </li>
        )}
      </ul>

      <form onSubmit={addManual} className="mt-3 flex gap-2">
        <input
          type="text"
          inputMode="url"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          placeholder="Add a page manually: example.com/pricing"
          aria-label="Add a page manually"
          className="h-11 flex-1 rounded-full border border-line bg-card px-4 font-mono text-[13px] text-ink placeholder:font-sans placeholder:text-ink-faint focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <Plus className="size-4" aria-hidden /> Add
        </button>
      </form>
    </Card>
  );
}
