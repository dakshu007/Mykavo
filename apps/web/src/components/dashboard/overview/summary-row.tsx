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
    { label: "Websites monitored", value: websites, note: `${plural(monitoredPages, "page")} watched` },
    {
      label: "Healthy",
      value: health.healthy,
      note: healthNote,
      warn: health.needsAttention > 0,
    },
    { label: "Scans completed", value: scansLast7Days, note: "Last 7 days" },
    { label: "Changes caught", value: changesLast30Days, note: "Last 30 days" },
  ];

  return (
    <section aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="sr-only">
        Summary
      </h2>
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col rounded-tile bg-card px-4 py-3.5 shadow-card sm:px-5 sm:py-4">
            <dt className="text-[12px] font-medium text-ink-secondary sm:text-[13px]">{t.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
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
          </div>
        ))}
      </dl>
    </section>
  );
}
