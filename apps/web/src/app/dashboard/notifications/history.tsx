import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HistoryItem {
  id: string;
  subject: string;
  status: "PENDING" | "SENT" | "FAILED";
  channel: string;
  recipient: string;
  website: string | null;
  error: string | null;
  /** ISO timestamp. */
  at: string;
}

const CHANNEL_LABEL: Record<string, string> = {
  EMAIL: "Email",
  SLACK: "Slack",
  DISCORD: "Discord",
  WEBHOOK: "Webhook",
  MICROSOFT_TEAMS: "Teams",
  PUSH: "Push",
};

const STATUS = {
  SENT: { label: "Sent", icon: CheckCircle2, tone: "text-success" },
  FAILED: { label: "Failed", icon: XCircle, tone: "text-critical" },
  PENDING: { label: "Sending", icon: Clock3, tone: "text-ink-faint" },
} as const;

/** Day heading in UTC, so the server and every reader agree on the grouping. */
function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

/** The recent alert log, grouped by day, one row per message. */
export function NotificationHistory({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-secondary">
        Nothing sent yet. When a scan finds an important change, the grouped summary is sent to your
        recipients and channels and logged here.
      </p>
    );
  }

  const groups: { day: string; rows: HistoryItem[] }[] = [];
  for (const item of items) {
    const day = dayKey(item.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.rows.push(item);
    else groups.push({ day, rows: [item] });
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.day}>
          <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">{g.day}</p>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {g.rows.map((n) => {
              const s = STATUS[n.status];
              const Icon = s.icon;
              return (
                <li key={n.id} className="flex items-start gap-3 px-4 py-3">
                  <Icon className={cn("mt-0.5 size-4.5 shrink-0", s.tone)} aria-label={s.label} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{n.subject}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-faint">
                      <span className="rounded bg-ink/[0.06] px-1.5 py-px font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-secondary">
                        {CHANNEL_LABEL[n.channel] ?? n.channel}
                      </span>
                      {n.website && <span className="text-ink-secondary">{n.website}</span>}
                      <span className="truncate">{n.recipient}</span>
                    </p>
                    {n.error && <p className="mt-1 text-xs text-critical-strong">{n.error}</p>}
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-ink-faint">{timeOf(n.at)} UTC</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
