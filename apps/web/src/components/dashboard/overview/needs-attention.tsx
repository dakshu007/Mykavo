import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChangeSeverityBadge } from "@/components/dashboard/change-badges";
import type { AttentionBadge, AttentionGroup, AttentionResult, AttentionRow } from "./attention";
import { formatRelative, hostOf, plural } from "./format";

const problemTone = {
  critical: { chip: "bg-critical-soft text-critical-strong", dot: "bg-critical" },
  warning: { chip: "bg-warning-soft text-warning-strong", dot: "bg-warning" },
} as const;

/** Same shape as the severity badge, so both kinds of row line up. */
function RowBadge({ badge }: { badge: AttentionBadge }) {
  if (badge.type === "severity") {
    return <ChangeSeverityBadge severity={badge.severity} className="shrink-0" />;
  }
  const tone = problemTone[badge.tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        tone.chip,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden />
      {badge.label}
    </span>
  );
}

function Row({ row, websiteName, now }: { row: AttentionRow; websiteName: string; now: Date }) {
  return (
    <li className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="w-24 shrink-0 pt-px">
          <RowBadge badge={row.badge} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-5 text-ink">{row.title}</p>
          <p className="mt-0.5 text-xs leading-5 text-ink-secondary">
            {row.detail && <span className="break-words">{row.detail}</span>}
            {row.detail && row.at && <span aria-hidden> · </span>}
            {row.at && (
              <time dateTime={row.at.toISOString()} className="whitespace-nowrap text-ink-faint">
                {formatRelative(row.at, now)}
              </time>
            )}
          </p>
        </div>
      </div>
      <Link
        href={row.href}
        aria-label={`${row.actionLabel}: ${row.title} on ${websiteName}`}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-full border border-line bg-card px-4 text-[13px] font-medium text-ink transition-colors hover:border-ink-faint hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:self-center"
      >
        {row.actionLabel}
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </li>
  );
}

function Group({ group, now }: { group: AttentionGroup; now: Date }) {
  const headingId = `attention-${group.websiteId}`;
  return (
    <section aria-labelledby={headingId} className="pt-4 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={headingId} className="min-w-0 text-[13px] font-semibold text-ink">
          <Link
            href={`/dashboard/websites/${group.websiteId}`}
            className="rounded-sm hover:text-accent hover:underline"
          >
            {group.websiteName}
          </Link>
          <span className="ml-2 font-mono text-xs font-normal text-ink-faint">
            {hostOf(group.websiteUrl)}
          </span>
        </h3>
        {group.hiddenCount > 0 && (
          <Link
            href={`/dashboard/changes?website=${encodeURIComponent(group.websiteId)}`}
            className="rounded-sm text-xs font-medium text-accent hover:underline"
          >
            {plural(group.hiddenCount, "more item")} on this website
          </Link>
        )}
      </div>
      <ul className="divide-y divide-line">
        {group.rows.map((row) => (
          <Row key={row.key} row={row} websiteName={group.websiteName} now={now} />
        ))}
      </ul>
    </section>
  );
}

/**
 * The top of the Overview: what needs a person right now, grouped by website,
 * worst first, one action per row. Renders nothing when the list is empty;
 * the page shows the all-clear card instead.
 */
export function NeedsAttention({ attention, now }: { attention: AttentionResult; now: Date }) {
  if (attention.groups.length === 0) return null;
  const hidden = attention.totalCount - attention.shownCount;

  return (
    <section
      aria-labelledby="needs-attention-heading"
      className="rounded-card bg-card p-5 shadow-card sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 id="needs-attention-heading" className="text-[15px] font-semibold text-ink">
            Needs your attention
          </h2>
          <span className="rounded-full bg-critical-soft px-2 py-0.5 text-xs font-semibold text-critical-strong">
            {attention.totalCount}
            <span className="sr-only"> {attention.totalCount === 1 ? "item" : "items"}</span>
          </span>
        </div>
        <Link
          href="/dashboard/changes?website=all"
          className="inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-accent hover:underline"
        >
          View all changes <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="divide-y divide-line">
        {attention.groups.map((group) => (
          <Group key={group.websiteId} group={group} now={now} />
        ))}
      </div>

      {hidden > 0 && (
        <p className="mt-4 border-t border-line pt-4 text-[13px] text-ink-secondary">
          Showing {attention.shownCount} of {attention.totalCount}.{" "}
          <Link href="/dashboard/changes?website=all" className="font-medium text-accent hover:underline">
            See everything on the Changes page
          </Link>
        </p>
      )}
    </section>
  );
}
