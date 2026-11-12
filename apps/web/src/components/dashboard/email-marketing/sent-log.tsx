"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Megaphone, Pencil, Repeat2, Search, Send } from "lucide-react";
import type { DeliveryState, SendKind, SentGroup } from "@/app/dashboard/email-marketing/sent-log";
import { cn } from "@/lib/utils";

type Filter = "all" | "campaigns" | "automated" | "direct";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "campaigns", label: "Campaigns" },
  { key: "automated", label: "Automated" },
  { key: "direct", label: "One-off sends" },
];

function filterOf(kind: SendKind): Filter {
  if (kind === "campaign") return "campaigns";
  if (kind === "direct") return "direct";
  return "automated";
}

const KIND_LABEL: Record<SendKind, string> = {
  campaign: "Campaign",
  lifecycle: "Lifecycle",
  flow: "Flow",
  "product-update": "Product update",
  automated: "Automated",
  direct: "One-off",
};

const STATE: Record<DeliveryState, { label: string; tone: string }> = {
  clicked: { label: "Clicked", tone: "bg-success text-white" },
  opened: { label: "Opened", tone: "bg-success-soft text-success-strong" },
  delivered: { label: "Delivered", tone: "bg-info-soft text-ink" },
  sent: { label: "Sent", tone: "bg-surface text-ink-secondary" },
  bounced: { label: "Bounced", tone: "bg-critical-soft text-critical-strong" },
  blocked: { label: "Blocked", tone: "bg-critical-soft text-critical-strong" },
  spam: { label: "Spam report", tone: "bg-critical-soft text-critical-strong" },
};

/** Relative to the server's clock, so server and browser render the same text. */
function ago(iso: string | null, now: number): string {
  if (!iso) return "";
  const diff = now - new Date(iso).getTime();
  const future = diff < 0;
  const mins = Math.round(Math.abs(diff) / 60_000);
  const text = mins < 60 ? `${Math.max(1, mins)}m` : mins < 48 * 60 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 1440)}d`;
  return future ? `in ${text}` : `${text} ago`;
}

type Bucket = "day" | "week" | "earlier" | "unsent";
const BUCKET_LABEL: Record<Bucket, string> = {
  day: "Last 24 hours",
  week: "Last 7 days",
  earlier: "Earlier",
  unsent: "Not sent yet",
};

function bucketOf(g: SentGroup, now: number): Bucket {
  if (g.kind === "campaign" && g.status !== "sent") return "unsent";
  const age = now - new Date(g.at ?? 0).getTime();
  if (age < 86_400_000) return "day";
  if (age < 7 * 86_400_000) return "week";
  return "earlier";
}

function KindIcon({ kind }: { kind: SendKind }) {
  const Icon = kind === "campaign" ? Megaphone : kind === "direct" ? Send : Repeat2;
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-xl border",
        kind === "campaign" && "border-ink bg-primary text-[#16181d]",
        kind === "direct" && "border-line bg-ink text-ink-inverse",
        kind !== "campaign" && kind !== "direct" && "border-line bg-surface text-ink-secondary",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  );
}

/** Sent, delivered, opened, clicked as one compact row of figures. */
function Funnel({ g }: { g: SentGroup }) {
  const cells: { label: string; value: number; strong?: boolean }[] = [
    { label: "Sent", value: g.recipients, strong: true },
    { label: "Delivered", value: g.delivered },
    { label: "Opened", value: g.opened },
    { label: "Clicked", value: g.clicked },
  ];
  return (
    <dl className="grid w-full grid-cols-4 gap-2 text-left sm:w-[260px] sm:gap-3 sm:text-right">
      {cells.map((c) => (
        <div key={c.label}>
          <dt className="font-mono text-[9px] font-medium uppercase tracking-[0.06em] text-ink-faint sm:text-[9.5px] sm:tracking-[0.12em]">{c.label}</dt>
          <dd className={cn("mt-0.5 text-[15px] tabular-nums", c.strong ? "font-semibold text-ink" : c.value > 0 ? "font-medium text-ink" : "text-ink-faint")}>
            {c.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CampaignStatus({ status, at, now }: { status: string | null; at: string | null; now: number }) {
  if (!status) return null;
  const label = status === "queued" ? `Scheduled ${ago(at, now)}` : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        status === "sent" ? "bg-success-soft text-success-strong" : status === "queued" ? "bg-info-soft text-ink" : "bg-surface text-ink-secondary",
      )}
    >
      {label}
    </span>
  );
}

function Row({ g, now }: { g: SentGroup; now: number }) {
  const hasPeople = g.people.length > 0;
  const head = (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <KindIcon kind={g.kind} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-[14px] font-semibold text-ink">{g.title}</span>
            <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-secondary">
              {KIND_LABEL[g.kind]}
            </span>
            {g.kind === "campaign" && <CampaignStatus status={g.status} at={g.at} now={now} />}
            {g.problems > 0 && (
              <span className="rounded-full bg-critical-soft px-2 py-0.5 text-[11px] font-semibold text-critical-strong">
                {g.problems} not delivered
              </span>
            )}
            {g.unsubscribed > 0 && (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning-strong">
                {g.unsubscribed} unsubscribed
              </span>
            )}
          </p>
          {g.subject && g.subject !== g.title && (
            <p className="mt-0.5 truncate text-[12.5px] text-ink-secondary">
              {g.subject}
              {g.moreSubjects > 0 && <span className="text-ink-faint"> +{g.moreSubjects} personalised</span>}
            </p>
          )}
          <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-faint" title={g.at ?? undefined}>
            {g.kind === "campaign" && g.status !== "sent" ? (g.status === "draft" ? `Created ${ago(g.at, now)}` : "") : `Sent ${ago(g.at, now)}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-3 sm:border-t-0 sm:pt-0">
        {g.kind === "campaign" && g.status !== "sent" ? (
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint sm:w-[260px] sm:text-right">Not sent yet</span>
        ) : (
          <Funnel g={g} />
        )}
        {g.kind === "campaign" && g.status === "draft" && g.campaignId !== null ? (
          <Link
            href={`/dashboard/email-marketing/${g.campaignId}`}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-line px-3 text-[12px] font-semibold text-ink transition-colors hover:border-ink"
          >
            <Pencil className="size-3" aria-hidden /> Edit
          </Link>
        ) : (
          <span className="inline-flex size-8 shrink-0 items-center justify-center text-ink-faint">
            {hasPeople && <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />}
          </span>
        )}
      </div>
    </div>
  );

  if (!hasPeople) return <li className="border-t border-line first:border-t-0">{head}</li>;
  return (
    <li className="border-t border-line first:border-t-0">
      <details className="group">
        <summary className="cursor-pointer list-none transition-colors hover:bg-ink/[0.025] [&::-webkit-details-marker]:hidden">
          {head}
        </summary>
        <ul className="mx-4 mb-4 overflow-hidden rounded-xl border border-line bg-surface/60">
          {g.people.map((p, i) => (
            <li key={`${p.email}-${i}`} className="flex items-center gap-3 border-t border-line px-3 py-2 text-[12.5px] first:border-t-0">
              <span className="min-w-0 flex-1 truncate font-mono text-ink">{p.email}</span>
              {p.unsubscribed && (
                <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10.5px] font-semibold text-warning-strong">Unsubscribed</span>
              )}
              <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", STATE[p.state].tone)}>{STATE[p.state].label}</span>
              <span className="w-16 shrink-0 text-right font-mono text-[11px] text-ink-faint" title={p.at}>
                {ago(p.at, now)}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

/**
 * The sent log: every send in one list, newest first, bucketed by age.
 * Filter by kind or search a subject, title or address; a send with
 * per-person data opens to show where each email got to.
 */
export function SentLogList({ groups, nowIso }: { groups: SentGroup[]; nowIso: string }) {
  const now = new Date(nowIso).getTime();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: groups.length, campaigns: 0, automated: 0, direct: 0 };
    for (const g of groups) c[filterOf(g.kind)]++;
    return c;
  }, [groups]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      if (filter !== "all" && filterOf(g.kind) !== filter) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        (g.subject ?? "").toLowerCase().includes(q) ||
        g.people.some((p) => p.email.includes(q))
      );
    });
  }, [groups, filter, query]);

  const buckets = useMemo(() => {
    const order: Bucket[] = ["unsent", "day", "week", "earlier"];
    const map = new Map<Bucket, SentGroup[]>();
    for (const g of shown) {
      const b = bucketOf(g, now);
      map.set(b, [...(map.get(b) ?? []), g]);
    }
    return order.filter((b) => map.has(b)).map((b) => ({ bucket: b, rows: map.get(b) ?? [] }));
  }, [shown, now]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors",
                filter === f.key ? "border-ink bg-ink text-ink-inverse" : "border-line text-ink-secondary hover:border-ink hover:text-ink",
              )}
            >
              {f.label}
              <span className={cn("font-mono text-[10.5px]", filter === f.key ? "text-ink-inverse/70" : "text-ink-faint")}>{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <label className="relative block sm:w-64">
          <span className="sr-only">Search sends</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject or email"
            className="h-9 w-full rounded-full border border-line bg-card pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
          />
        </label>
      </div>

      {buckets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-ink-secondary">
          {groups.length === 0 ? "Nothing has been sent through Brevo in the last 30 days." : "No sends match."}
        </p>
      ) : (
        <div className="space-y-5">
          {buckets.map(({ bucket, rows }) => (
            <section key={bucket}>
              <h3 className="mb-2 flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                {BUCKET_LABEL[bucket]}
                <span className="h-px flex-1 bg-line" aria-hidden />
                <span>{rows.length}</span>
              </h3>
              <ul className="overflow-hidden rounded-2xl border border-line bg-card">
                {rows.map((g) => (
                  <Row key={g.id} g={g} now={now} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
