import { GitCompareArrows, Globe, History, ShieldCheck } from "lucide-react";
import type { WebsiteHealthSummary } from "./attention";
import { plural } from "./format";

/**
 * Compact numbers under the attention list. Plain figures with one line of
 * context each; no charts, because a trend line here would answer a question
 * nobody opening the Overview is asking.
 */
export function SummaryRow({
  websites,
  monitoredPages,
  health,
  scansLast7Days,
  changesLast30Days,
}: {
  websites: number;
  monitoredPages: number;
  health: WebsiteHealthSummary;
  scansLast7Days: number;
  changesLast30Days: number;
}) {
  const healthNote =
    health.needsAttention > 0
      ? `${health.needsAttention} need${health.needsAttention === 1 ? "s" : ""} attention`
      : health.settingUp > 0
        ? `${health.settingUp} setting up`
        : health.paused > 0
          ? `${health.paused} paused`
          : "None need attention";

  const tiles = [
    {
      label: "Websites monitored",
      value: websites,
      note: `${plural(monitoredPages, "page")} watched`,
      icon: Globe,
      accent: "bg-primary",
    },
    {
      label: "Healthy",
      value: health.healthy,
      note: healthNote,
      warn: health.needsAttention > 0,
      icon: ShieldCheck,
      accent: health.needsAttention > 0 ? "bg-critical" : "bg-success",
    },
    { label: "Scans completed", value: scansLast7Days, note: "Last 7 days", icon: History, accent: "bg-ink" },
    {
      label: "Changes caught",
      value: changesLast30Days,
      note: "Last 30 days",
      icon: GitCompareArrows,
      accent: "bg-info",
    },
  ];

  return (
    <section aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="sr-only">
        Summary
      </h2>
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.label}
              className="relative flex flex-col overflow-hidden rounded-xl border border-line bg-card px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5 sm:pt-4"
            >
              <div className="flex items-start justify-between gap-2">
                <dt className="text-[12px] font-medium text-ink-secondary sm:text-[13px]">{t.label}</dt>
                <Icon className="size-4 shrink-0 text-ink-faint" aria-hidden />
              </div>
              <dd className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink sm:text-[28px]">
                {t.value}
              </dd>
              <dd
                className={
                  t.warn
                    ? "mt-0.5 text-xs font-medium text-warning-strong"
                    : "mt-0.5 text-xs text-ink-faint"
                }
              >
                {t.note}
              </dd>
              {/* A thin colour key along the bottom edge, one per figure. */}
              <span aria-hidden className={`absolute inset-x-0 bottom-0 h-[3px] ${t.accent} opacity-80`} />
            </div>
          );
        })}
      </dl>
    </section>
  );
}
