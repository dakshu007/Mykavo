import {
  formatDayLabel,
  formatPercent,
  overallUptime,
  uptimeBand,
  uptimeStripSummary,
  type UptimeBand,
  type UptimeDay,
} from "@/lib/health-charts";

/**
 * Status-page uptime strip: one rounded bar per UTC day, coloured by that
 * day's uptime band. Pure presentational server component — hand-rolled SVG,
 * responsive via viewBox. Colour is never the only signal: the legend names
 * each band's threshold and every bar carries a text label (`<title>` on
 * hover, aria-label on keyboard focus).
 */

/** Band colors — success/warning/critical/line tokens, so they follow the theme. */
const BAND_CLASSES: Record<UptimeBand, { bar: string; dot: string }> = {
  good: { bar: "fill-success", dot: "bg-success" },
  degraded: { bar: "fill-warning", dot: "bg-warning" },
  bad: { bar: "fill-critical", dot: "bg-critical" },
  empty: { bar: "fill-line", dot: "bg-line" },
};

const BAND_LEGEND: readonly { band: UptimeBand; label: string }[] = [
  { band: "good", label: "≥ 99.5%" },
  { band: "degraded", label: "95–99.5%" },
  { band: "bad", label: "< 95%" },
  { band: "empty", label: "no data" },
];

// Fixed-width viewBox so the strip keeps the same rendered height for every
// window length (7 fat bars or 90 thin ones), scaling to the card width.
const STRIP_W = 900;
const STRIP_H = 36;

function barLabel(day: UptimeDay): string {
  if (day.totalChecks === 0) return `${formatDayLabel(day.date)}: no checks`;
  return `${formatDayLabel(day.date)}: ${formatPercent(day.uptimePercent)} uptime, ${day.totalChecks} check${day.totalChecks === 1 ? "" : "s"}`;
}

export function UptimeBars({
  days,
  windowDays,
}: {
  /** One entry per day, oldest → newest (today last). */
  days: UptimeDay[];
  windowDays: number;
}) {
  if (days.length === 0) return null;

  const overall = overallUptime(days);
  const pitch = STRIP_W / days.length;
  const barWidth = pitch * 0.7;
  const inset = (pitch - barWidth) / 2;
  const radius = Math.min(3, barWidth / 2);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[13px] text-ink-secondary">
          {overall === null ? (
            <>No checks in the last {windowDays} days</>
          ) : (
            <>
              <span className="font-semibold text-ink tabular-nums">
                {formatPercent(overall)}
              </span>{" "}
              uptime · last {windowDays} days
            </>
          )}
        </p>
        <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
          {BAND_LEGEND.map(({ band, label }) => (
            <li
              key={band}
              className="flex items-center gap-1.5 text-[11px] text-ink-secondary"
            >
              <span
                aria-hidden
                className={`inline-block size-2 rounded-full ${BAND_CLASSES[band].dot}`}
              />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <svg
        viewBox={`0 0 ${STRIP_W} ${STRIP_H}`}
        className="mt-2.5 block w-full"
        role="img"
        aria-label={uptimeStripSummary(days, windowDays)}
      >
        {days.map((day, i) => {
          const label = barLabel(day);
          return (
            <rect
              key={day.date}
              x={(i * pitch + inset).toFixed(1)}
              y={0}
              width={barWidth.toFixed(1)}
              height={STRIP_H}
              rx={radius}
              tabIndex={0}
              aria-label={label}
              className={`${BAND_CLASSES[uptimeBand(day.uptimePercent)].bar} outline-none focus-visible:stroke-primary focus-visible:stroke-2`}
            >
              <title>{label}</title>
            </rect>
          );
        })}
      </svg>

      <div className="mt-1.5 flex justify-between text-[11px] text-ink-faint">
        <span>{formatDayLabel(days[0].date)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}
