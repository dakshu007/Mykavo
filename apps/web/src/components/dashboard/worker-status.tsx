import { Activity, AlertTriangle, CircleCheck, CircleHelp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import type { WorkerLiveness, WorkerState } from "@/lib/usage/worker-health";

/**
 * Worker status, on the admin usage page.
 *
 * Deliberately the FIRST card, above the usage meters. A quota that is 40%
 * used is a thing to note next month; a worker that stopped four days ago is
 * the only fact on the page that matters, and it should not be something you
 * scroll to find.
 */

const PRESENTATION: Record<
  WorkerState,
  { label: string; icon: typeof CircleCheck; chip: string; icons: string }
> = {
  healthy: {
    label: "Running",
    icon: CircleCheck,
    chip: "bg-success-soft text-success-strong",
    icons: "text-success",
  },
  stale: {
    label: "Late",
    icon: AlertTriangle,
    chip: "bg-warning-soft text-warning-strong",
    icons: "text-warning",
  },
  down: {
    label: "Not running",
    icon: AlertTriangle,
    chip: "bg-critical-soft text-critical-strong",
    icons: "text-critical",
  },
  unknown: {
    label: "Unknown",
    icon: CircleHelp,
    chip: "bg-surface text-ink-secondary",
    icons: "text-ink-faint",
  },
};

function humanAge(minutes: number | null): string {
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
  const Icon = look.icon;

  return (
    <Card>
      <CardHeader
        icon={Activity}
        title="Scan worker"
        action={
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${look.chip}`}>
            {look.label}
          </span>
        }
      />
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-5 shrink-0 ${look.icons}`} aria-hidden />
        <div>
          <p className="text-[15px] font-medium text-ink">
            Last health check {humanAge(liveness.minutesAgo)}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-ink-secondary">{liveness.detail}</p>
          {liveness.lastSeenAt && (
            <p className="mt-1.5 font-mono text-[11.5px] text-ink-faint">
              {liveness.lastSeenAt}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
