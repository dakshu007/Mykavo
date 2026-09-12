"use client";

import { useId, useMemo, useState } from "react";

/**
 * Search Console performance: impressions and clicks as SMALL MULTIPLES with
 * one shared crosshair.
 *
 * The chart this replaces drew both series in one plot, each normalized to its
 * own full height - clicks peaking at 8, impressions at 157. That is a
 * dual-axis chart, and the alignment between the two scales was arbitrary, so
 * every apparent crossing and divergence was an artefact of the rendering
 * rather than anything in the data. Two panels stacked on a shared x-axis say
 * the true thing: each series is readable on its own scale, and they are
 * compared by vertical alignment in time, which is real.
 *
 * The crosshair is what makes them one chart rather than two: a single
 * pointer position reads out every value for that day across both panels, so
 * "impressions rose but clicks did not" is a glance, not an inference.
 */

export interface DayPoint {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

const W = 720;
const PANEL_H = 96;
const GAP = 14;
const PAD_TOP = 8;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Area path for one series, scaled to its own panel. */
function buildPaths(values: number[], top: number) {
  const max = Math.max(1, ...values);
  const x = (i: number) => (values.length > 1 ? (i / (values.length - 1)) * W : W / 2);
  const y = (v: number) => top + PANEL_H - (v / max) * (PANEL_H - PAD_TOP);
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = values.length
    ? `M ${x(0).toFixed(1)} ${top + PANEL_H} ${line.slice(1)} L ${x(values.length - 1).toFixed(1)} ${top + PANEL_H} Z`
    : "";
  return { line, area, x, y, max };
}

export function SearchPerformanceChart({ daily }: { daily: DayPoint[] }) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  const impressions = useMemo(() => buildPaths(daily.map((d) => d.impressions), 0), [daily]);
  const clicks = useMemo(
    () => buildPaths(daily.map((d) => d.clicks), PANEL_H + GAP),
    [daily],
  );

  if (daily.length === 0) {
    return <p className="py-6 text-sm text-ink-secondary">No Search Console data for this range yet.</p>;
  }

  const totalH = PANEL_H * 2 + GAP;
  const point = active === null ? null : daily[active];

  /** Nearest day to the pointer. Readers aim at a date, never at a 2px line. */
  function locate(clientX: number, rect: DOMRect) {
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * (daily.length - 1));
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${totalH}`}
        className="w-full touch-none"
        role="img"
        aria-label={`Impressions and clicks per day from ${shortDate(daily[0].date)} to ${shortDate(daily[daily.length - 1].date)}`}
        onPointerMove={(e) => setActive(locate(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-gold)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-chart-gold)" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Baselines, hairline and recessive - they orient, they do not compete. */}
        <line x1="0" y1={PANEL_H} x2={W} y2={PANEL_H} stroke="var(--color-line)" strokeWidth="1" />
        <line x1="0" y1={totalH} x2={W} y2={totalH} stroke="var(--color-line)" strokeWidth="1" />

        {/* Impressions: reach. A filled area, because volume is the point. */}
        <path d={impressions.area} fill={`url(#${gradientId})`} />
        <path
          d={impressions.line}
          fill="none"
          stroke="var(--color-chart-gold)"
          strokeWidth="1.5"
          strokeOpacity="0.55"
          strokeLinejoin="round"
        />

        {/* Clicks: the outcome. Drawn solid, because this is the one that matters. */}
        <path d={clicks.area} fill={`url(#${gradientId})`} />
        <path
          d={clicks.line}
          fill="none"
          stroke="var(--color-chart-gold)"
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {active !== null && (
          <g pointerEvents="none">
            <line
              x1={impressions.x(active)}
              y1="0"
              x2={impressions.x(active)}
              y2={totalH}
              stroke="var(--color-ink)"
              strokeWidth="1"
              strokeOpacity="0.25"
            />
            {/* A 2px surface ring keeps the dot legible over the fill. */}
            <circle
              cx={impressions.x(active)}
              cy={impressions.y(daily[active].impressions)}
              r="4"
              fill="var(--color-chart-gold)"
              stroke="var(--color-card)"
              strokeWidth="2"
            />
            <circle
              cx={clicks.x(active)}
              cy={clicks.y(daily[active].clicks)}
              r="4.5"
              fill="var(--color-chart-gold)"
              stroke="var(--color-card)"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Panel labels sit on the plot: with one series each, a legend box would
          be a label doing a legend's job. */}
      <span className="pointer-events-none absolute left-0 top-0 text-[11px] font-medium text-ink-faint">
        Impressions · peak {fmt(impressions.max)}
      </span>
      <span
        className="pointer-events-none absolute left-0 text-[11px] font-medium text-ink-faint"
        style={{ top: `${((PANEL_H + GAP) / totalH) * 100}%` }}
      >
        Clicks · peak {fmt(clicks.max)}
      </span>

      <div className="mt-2 flex items-baseline justify-between text-[11px] text-ink-faint">
        <span>{shortDate(daily[0].date)}</span>
        {/* Values lead, labels follow: the reader has the date and wants numbers. */}
        <span aria-live="polite" className="tabular-nums">
          {point ? (
            <span className="text-ink">
              <span className="font-semibold">{shortDate(point.date)}</span>
              {" · "}
              <span className="font-semibold">{fmt(point.clicks)}</span> clicks
              {" · "}
              <span className="font-semibold">{fmt(point.impressions)}</span> impressions
              {" · "}
              {(point.ctr * 100).toFixed(1)}% CTR
              {" · pos "}
              {point.position.toFixed(1)}
            </span>
          ) : (
            <span>Hover the chart for any day&apos;s numbers</span>
          )}
        </span>
        <span>{shortDate(daily[daily.length - 1].date)}</span>
      </div>

      {/* Reachable without hovering, and the keyboard path to the same values. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] text-ink-faint hover:text-ink-secondary">
          View as table
        </summary>
        <div className="mt-2 max-h-56 overflow-auto">
          <table className="w-full text-left text-[12px] tabular-nums">
            <thead className="sticky top-0 bg-card text-ink-faint">
              <tr>
                <th scope="col" className="py-1 pr-3 font-medium">Date</th>
                <th scope="col" className="py-1 pr-3 font-medium">Clicks</th>
                <th scope="col" className="py-1 pr-3 font-medium">Impressions</th>
                <th scope="col" className="py-1 pr-3 font-medium">CTR</th>
                <th scope="col" className="py-1 font-medium">Position</th>
              </tr>
            </thead>
            <tbody className="text-ink-secondary">
              {daily.map((d) => (
                <tr key={d.date} className="border-t border-line">
                  <td className="py-1 pr-3">{shortDate(d.date)}</td>
                  <td className="py-1 pr-3">{fmt(d.clicks)}</td>
                  <td className="py-1 pr-3">{fmt(d.impressions)}</td>
                  <td className="py-1 pr-3">{(d.ctr * 100).toFixed(1)}%</td>
                  <td className="py-1">{d.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
