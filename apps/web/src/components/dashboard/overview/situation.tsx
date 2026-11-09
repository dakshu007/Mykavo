import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Greeting } from "@/components/dashboard/greeting";
import type { Greeting as GreetingText } from "@/lib/greeting";
import type { AttentionResult } from "./attention";
import { formatRelative, plural } from "./format";

/** "in 2h 41m" / "in 12m" / "due now", for the status line. */
export function formatUntil(at: Date, now: Date): string {
  const mins = Math.round((at.getTime() - now.getTime()) / 60_000);
  if (mins <= 0) return "due now";
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `in ${hours}h ${String(mins % 60).padStart(2, "0")}m`;
  return `in ${Math.round(hours / 24)}d`;
}

/** Shown and counted rows by severity, for the sentence under the headline. */
function criticalCount(attention: AttentionResult): number {
  let n = 0;
  for (const g of attention.groups) {
    for (const r of g.rows) {
      if (r.badge.type === "severity" ? r.badge.severity === "CRITICAL" : r.badge.tone === "critical") n++;
    }
  }
  return n;
}

/**
 * The top of the Overview, written as a sentence instead of a dashboard
 * header: how many websites need you, out of how many, and where to start.
 * Above it, a mono status line that reads like an instrument: monitoring is
 * live, when the last scan finished and when the next one runs.
 */
export function Situation({
  firstName,
  initialGreeting,
  websites,
  attention,
  lastScan,
  nextScan,
  now,
}: {
  firstName: string;
  initialGreeting: GreetingText;
  websites: number;
  attention: AttentionResult;
  lastScan: { at: Date; websiteName: string } | null;
  nextScan: { at: Date; websiteName: string } | null;
  now: Date;
}) {
  const needing = attention.websiteIds.size;
  const critical = criticalCount(attention);
  const first = attention.groups[0];

  return (
    <header className="pt-1">
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
        {websites > 0 && (
          <span className="inline-flex items-center gap-1.5 text-success-strong">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            Live
          </span>
        )}
        <span>Monitoring {plural(websites, "website")}</span>
        {lastScan && (
          <>
            <span aria-hidden>/</span>
            <span>Last scan {formatRelative(lastScan.at, now)}</span>
          </>
        )}
        {nextScan && (
          <>
            <span aria-hidden>/</span>
            <span>Next {formatUntil(nextScan.at, now)}</span>
          </>
        )}
      </p>

      <p className="mt-5 text-[17px] text-ink-secondary">
        <Greeting name={firstName} initialGreeting={initialGreeting} className="" />.
      </p>
      <h1 className="mt-1 max-w-3xl pb-2 text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-[44px]">
        {websites === 0 ? (
          <>Let&apos;s watch your first website.</>
        ) : needing > 0 ? (
          <>
            <span className="mk-highlight">
              {needing} of {plural(websites, "website")}
            </span>{" "}
            {needing === 1 ? "needs" : "need"} you.
          </>
        ) : (
          <>
            {websites === 1 ? "Your website looks" : `All ${websites} websites look`}{" "}
            <span className="mk-highlight">exactly right</span>.
          </>
        )}
      </h1>
      {needing > 0 && first && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[15px] text-ink-secondary">
          <span>
            {plural(attention.totalCount, "open item")}
            {critical > 0 ? `, ${critical} critical` : ""}.
          </span>
          <Link
            href={`/dashboard/websites/${first.websiteId}`}
            className="group inline-flex items-center gap-1 font-medium text-ink underline decoration-primary decoration-2 underline-offset-4 hover:decoration-ink"
          >
            Start with {first.websiteName}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </p>
      )}
    </header>
  );
}
