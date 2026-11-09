import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WebsiteStatusBadge } from "@/components/dashboard/website-status";
import { PULSE_SCANS, type OverviewWebsite, type ScanPulse } from "./load-overview";
import { formatRelative, hostOf, plural } from "./format";
import { formatUntil } from "./situation";

/** How many websites the Overview lists before "View all". */
export const OVERVIEW_WEBSITE_LIMIT = 5;

function uptimeLabel(up: boolean | null): string {
  return up === null ? "Uptime not checked yet" : up ? "Up" : "Down";
}

/**
 * The quick jump list the Overview has always had: each website with its
 * uptime dot, page count and monitoring status.
 */
export function WebsitesList({ websites, now = new Date() }: { websites: OverviewWebsite[]; now?: Date }) {
  if (websites.length === 0) return null;

  return (
    <section aria-labelledby="overview-websites-heading" className="rounded-card bg-card p-5 shadow-card sm:p-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 id="overview-websites-heading" className="text-[15px] font-semibold text-ink">
            Your websites
          </h2>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">
            Pulse / last {PULSE_SCANS} scans
          </span>
        </div>
        <Link
          href="/dashboard/websites"
          className="inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-accent hover:underline"
        >
          View all <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <ul className="divide-y divide-line">
        {websites.slice(0, OVERVIEW_WEBSITE_LIMIT).map((w) => (
          <li key={w.id}>
            <Link href={`/dashboard/websites/${w.id}`} className="group flex items-center gap-4 rounded-lg py-3">
              <span
                role="img"
                aria-label={uptimeLabel(w.up)}
                title={uptimeLabel(w.up)}
                className={cn(
                  "inline-block size-2.5 shrink-0 rounded-full",
                  w.up === null ? "bg-line" : w.up ? "bg-success" : "bg-critical",
                )}
              />
              <div className="min-w-0 flex-1 sm:max-w-[260px]">
                <p className="truncate text-sm font-medium text-ink group-hover:text-accent">{w.name}</p>
                <p className="truncate font-mono text-xs text-ink-faint">
                  {hostOf(w.url)} · {plural(w.monitoredPages, "page")}
                </p>
              </div>
              <PulseStrip history={w.history ?? []} now={now} />
              <div className="hidden w-28 shrink-0 text-right font-mono text-[11px] leading-4 text-ink-faint lg:block">
                {w.status === "ACTIVE" && w.nextScanAt ? (
                  <>
                    <span className="block uppercase tracking-[0.1em]">Next scan</span>
                    <span className="text-ink-secondary">{formatUntil(w.nextScanAt, now)}</span>
                  </>
                ) : null}
              </div>
              <WebsiteStatusBadge status={w.status} className="shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
      <PulseLegend />
    </section>
  );
}

const CELL: Record<NonNullable<ScanPulse["severity"]> | "CLEAN" | "FAILED", string> = {
  CLEAN: "bg-success/70",
  INFO: "bg-success/70",
  LOW: "bg-primary",
  MEDIUM: "bg-warning",
  HIGH: "bg-[#f97316]",
  CRITICAL: "bg-critical",
  FAILED: "bg-transparent ring-1 ring-inset ring-critical",
};

const CELL_LABEL: Record<keyof typeof CELL, string> = {
  CLEAN: "no changes",
  INFO: "no important changes",
  LOW: "low changes",
  MEDIUM: "medium changes",
  HIGH: "high changes",
  CRITICAL: "critical changes",
  FAILED: "scan failed",
};

function cellKind(scan: ScanPulse): keyof typeof CELL {
  if (scan.status === "FAILED") return "FAILED";
  return scan.severity ?? "CLEAN";
}

/**
 * The last scans as a row of small bars, oldest on the left: green when a
 * scan found nothing, then yellow to red by the worst change it found, and an
 * outline for a scan that failed. Empty slots before the first scan stay
 * faint, so a new website reads as "just started", not "broken".
 */
function PulseStrip({ history, now }: { history: ScanPulse[]; now: Date }) {
  const empty = Math.max(0, PULSE_SCANS - history.length);
  const issues = history.filter((h) => cellKind(h) !== "CLEAN" && cellKind(h) !== "INFO").length;
  return (
    <span
      role="img"
      aria-label={`Last ${history.length} scans: ${issues === 0 ? "all clear" : `${plural(issues, "scan")} found changes`}`}
      className="hidden flex-1 items-end gap-[3px] sm:flex"
    >
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e${i}`} className="h-5 min-w-[3px] max-w-[7px] flex-1 rounded-[2px] bg-ink/[0.06]" />
      ))}
      {history.map((scan, i) => {
        const kind = cellKind(scan);
        const latest = i === history.length - 1;
        return (
          <span
            key={scan.at.toISOString() + i}
            title={`${formatRelative(scan.at, now)}: ${CELL_LABEL[kind]}`}
            className={cn(
              "min-w-[3px] max-w-[7px] flex-1 rounded-[2px] transition-transform group-hover:scale-y-110",
              latest ? "h-7 outline-2 outline-offset-1 outline-ink/70 outline" : "h-5",
              CELL[kind],
            )}
          />
        );
      })}
    </span>
  );
}

/** Colour key for the pulse strips, shown once under the list. */
export function PulseLegend() {
  const keys: (keyof typeof CELL)[] = ["CLEAN", "LOW", "MEDIUM", "HIGH", "CRITICAL", "FAILED"];
  const names: Record<string, string> = { CLEAN: "Clean", LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical", FAILED: "Failed" };
  return (
    <p className="mt-3 hidden flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint sm:flex">
      {keys.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className={cn("h-3 w-[5px] rounded-[2px]", CELL[k])} aria-hidden />
          {names[k]}
        </span>
      ))}
    </p>
  );
}
