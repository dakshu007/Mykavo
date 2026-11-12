import type { WorkerLiveness, WorkerState } from "@/lib/usage/worker-health";
import { cn } from "@/lib/utils";

/**
 * Scan worker status, at the very top of the admin usage page.
 *
 * Written as the page's instrument line (the same mono status line the
 * Overview opens with) rather than a card: when the worker is running there
 * is nothing to read but "running, last check 2 minutes ago". When it is late
 * or down, the line turns into a coloured banner with the reason, because a
 * worker that stopped is the one fact on this page that matters today, and
 * it must not be something you scroll to find.
 *
 * Rendered in its own Suspense slot by the page: two queries, so it paints
 * long before the usage figures (whose storage walk takes seconds).
 */

const PRESENTATION: Record<WorkerState, { label: string; dot: string; text: string; banner: string | null }> = {
  healthy: { label: "Scan worker running", dot: "bg-success", text: "text-success-strong", banner: null },
  stale: {
    label: "Scan worker is late",
    dot: "bg-warning",
    text: "text-warning-strong",
    banner: "border-warning/40 bg-warning-soft",
  },
  down: {
    label: "Scan worker is not running",
    dot: "bg-critical",
    text: "text-critical-strong",
    banner: "border-critical/40 bg-critical-soft",
  },
  unknown: { label: "Scan worker status unknown", dot: "bg-ink-faint", text: "text-ink-secondary", banner: null },
};

export function humanAge(minutes: number | null): string {
  if (minutes === null) return "never";
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function WorkerStatus({ liveness }: { liveness: WorkerLiveness }) {
  const look = PRESENTATION[liveness.state];
  const live = liveness.state === "healthy";

  const line = (
    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
      <span className={cn("inline-flex items-center gap-1.5", look.text)}>
        <span className="relative flex size-2">
          {live && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
          )}
          <span className={cn("relative inline-flex size-2 rounded-full", look.dot)} />
        </span>
        {look.label}
      </span>
      <span aria-hidden>/</span>
      <span>Last health check {humanAge(liveness.minutesAgo)}</span>
      {liveness.lastSeenAt && (
        <>
          <span aria-hidden className="hidden sm:inline">
            /
          </span>
          <time dateTime={liveness.lastSeenAt} className="hidden normal-case tracking-normal sm:inline">
            {liveness.lastSeenAt}
          </time>
        </>
      )}
    </p>
  );

  if (!look.banner) {
    return (
      <div title={liveness.detail} role="status">
        {line}
        <p className="sr-only">{liveness.detail}</p>
      </div>
    );
  }

  return (
    <div role="alert" className={cn("w-full rounded-2xl border px-4 py-3.5 sm:px-5", look.banner)}>
      {line}
      <p className={cn("mt-1.5 text-[14px] font-medium", look.text)}>{liveness.detail}</p>
    </div>
  );
}
