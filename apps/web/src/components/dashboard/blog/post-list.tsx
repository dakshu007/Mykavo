"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, PenLine, Search, X } from "lucide-react";
import { PostStatusBadge } from "@/components/blog/status-badge";
import { DeletePostButton } from "@/components/blog/delete-post-button";
import { cn } from "@/lib/utils";
import { slotOf, type BoardRow } from "./blog-board";

type Filter = "all" | "PUBLISHED" | "SCHEDULED" | "DRAFT";

// Every date on this page is shown in UTC, the clock posts are scheduled
// in, so server and browser render the same text.
const monthFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const monShort = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const dayNum = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function ago(iso: string, now: number): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function until(iso: string, now: number): string {
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - now) / 60_000));
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 48) return `in ${h}h ${String(mins % 60).padStart(2, "0")}m`;
  return `in ${Math.round(h / 24)}d`;
}

interface Group {
  key: string;
  title: string;
  note?: string;
  rows: BoardRow[];
  /** Month groups fold away; only the latest one starts open. */
  month?: boolean;
}

function group(rows: BoardRow[]): Group[] {
  const scheduled = rows
    .filter((r) => r.display === "SCHEDULED")
    .sort((a, b) => Date.parse(a.publishedAt ?? "") - Date.parse(b.publishedAt ?? ""));
  const drafts = rows.filter((r) => r.display === "DRAFT").sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const live = rows
    .filter((r) => r.display === "PUBLISHED")
    .sort((a, b) => Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""));

  const groups: Group[] = [];
  if (scheduled.length) groups.push({ key: "scheduled", title: "Up next", note: "Goes live on its own", rows: scheduled });
  if (drafts.length) groups.push({ key: "drafts", title: "Drafts", note: "Private until published", rows: drafts });
  const byMonth = new Map<string, BoardRow[]>();
  for (const r of live) {
    const k = monthFormat.format(new Date(r.publishedAt ?? r.updatedAt));
    const list = byMonth.get(k) ?? [];
    list.push(r);
    byMonth.set(k, list);
  }
  for (const [k, list] of byMonth) groups.push({ key: k, title: k, rows: list, month: true });
  return groups;
}

/**
 * Every post, searchable and filterable by status, grouped the way the
 * work happens: what goes live next, what is still a draft, then what is
 * live, month by month. Each row keeps the old actions: view, edit, delete.
 */
export function PostList({ rows, now }: { rows: BoardRow[]; now: number }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  // Months the reader opened or closed by hand; the rest follow the default
  // (the latest month open, older months folded, everything open while
  // searching or filtering).
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const counts = useMemo(
    () => ({
      all: rows.length,
      PUBLISHED: rows.filter((r) => r.display === "PUBLISHED").length,
      SCHEDULED: rows.filter((r) => r.display === "SCHEDULED").length,
      DRAFT: rows.filter((r) => r.display === "DRAFT").length,
    }),
    [rows],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = rows.filter(
      (r) =>
        (filter === "all" || r.display === filter) &&
        (!q || r.title.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q)),
    );
    return group(visible);
  }, [rows, filter, query]);

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "PUBLISHED", label: "Live" },
    { id: "SCHEDULED", label: "Scheduled" },
    { id: "DRAFT", label: "Drafts" },
  ];

  return (
    <section aria-labelledby="blog-posts" className="rounded-2xl border border-line bg-card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">Posts</p>
          <h2 id="blog-posts" className="mt-1 text-[16px] font-semibold tracking-tight text-ink">
            Every post, newest first
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          role="tablist"
          aria-label="Filter by status"
          className="flex max-w-full gap-1 self-start overflow-x-auto rounded-full bg-ink/[0.05] p-1 [scrollbar-width:none]"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={filter === t.id}
              onClick={() => setFilter(t.id)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors",
                filter === t.id ? "bg-card text-ink shadow-[0_1px_2px_rgb(0_0_0/8%)]" : "text-ink-secondary hover:text-ink",
              )}
            >
              {t.label}
              <span className="font-mono text-[11px] tabular-nums text-ink-faint">{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <label className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <span className="sr-only">Search posts</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or slug"
            className="h-10 w-full rounded-full border border-line bg-transparent pl-9 pr-9 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-ink"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </label>
      </div>

      {groups.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13.5px] text-ink-secondary">
          No posts match{query ? ` "${query}"` : ""}.
        </p>
      ) : (
        <div className="mt-6 space-y-7">
          {groups.map((g) => {
            const firstMonth = groups.find((x) => x.month)?.key === g.key;
            const narrowed = filter !== "all" || query.trim() !== "";
            const open = !g.month || (toggled[g.key] ?? (firstMonth || narrowed));
            const heading = (
              <>
                {g.title}
                <span className="rounded-full bg-ink/[0.06] px-1.5 text-ink-secondary">{g.rows.length}</span>
                <span className="h-px flex-1 bg-line" aria-hidden />
                {g.note && <span className="normal-case tracking-normal">{g.note}</span>}
              </>
            );
            return (
              <section key={g.key} aria-label={g.title}>
                <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                  {g.month ? (
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setToggled((t) => ({ ...t, [g.key]: !open }))}
                      className="flex w-full items-center gap-2 text-left uppercase hover:text-ink"
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} aria-hidden />
                      {heading}
                    </button>
                  ) : (
                    <span className="flex items-center gap-2">{heading}</span>
                  )}
                </h3>
                {open && (
                  <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                    {g.rows.map((r) => (
                      <Row key={r.id} row={r} now={now} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Row({ row, now }: { row: BoardRow; now: number }) {
  const at = row.publishedAt ? new Date(row.publishedAt) : null;
  const tileDate = at ?? new Date(row.updatedAt);
  const scheduled = row.display === "SCHEDULED";
  const draft = row.display === "DRAFT";

  return (
    <li className={cn("group flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4", scheduled && "bg-primary-soft/40")}>
      {/* Date tile */}
      <div
        aria-hidden
        className={cn(
          "flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border leading-none",
          scheduled ? "border-ink bg-primary text-[#16181d]" : draft ? "border-dashed border-line text-ink-faint" : "border-line text-ink",
        )}
      >
        <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]">{monShort.format(tileDate)}</span>
        <span className="mt-1 text-[18px] font-semibold tabular-nums">{dayNum.format(tileDate)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/dashboard/blog/${row.id}/edit`}
          className="block truncate text-[14px] font-medium text-ink hover:underline hover:decoration-primary hover:decoration-2 hover:underline-offset-4"
        >
          {row.title}
        </Link>
        <p className="mt-0.5 flex min-w-0 items-center gap-2 text-[12px] text-ink-faint">
          <span className="truncate font-mono">/blog/{row.slug}</span>
          <span className="hidden shrink-0 sm:inline" aria-hidden>
            /
          </span>
          <span className="hidden shrink-0 sm:inline">
            {scheduled && row.publishedAt ? `Goes live ${until(row.publishedAt, now)}` : `Edited ${ago(row.updatedAt, now)}`}
          </span>
        </p>
      </div>

      {at && row.publishedAt && (
        <span
          title={fullDate.format(at)}
          className="hidden shrink-0 rounded-full border border-line px-2.5 py-1 font-mono text-[11px] tabular-nums text-ink-secondary md:inline-flex"
        >
          {slotOf(row.publishedAt) === "morning" ? "AM" : "PM"} {timeFormat.format(at)} UTC
        </span>
      )}

      <PostStatusBadge status={row.display} className="hidden shrink-0 sm:inline-flex" />

      <div className="flex shrink-0 items-center gap-0.5">
        {row.display === "PUBLISHED" && (
          <Link
            href={`/blog/${row.slug}`}
            target="_blank"
            aria-label={`View "${row.title}" on the public blog`}
            className="inline-flex size-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <ExternalLink className="size-4" aria-hidden />
          </Link>
        )}
        <Link
          href={`/dashboard/blog/${row.id}/edit`}
          aria-label={`Edit "${row.title}"`}
          className="inline-flex size-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <PenLine className="size-4" aria-hidden />
        </Link>
        <DeletePostButton postId={row.id} title={row.title} />
      </div>
    </li>
  );
}
