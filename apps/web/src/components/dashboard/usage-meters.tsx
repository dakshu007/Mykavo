"use client";

import { useCallback, useState } from "react";
import {
  CheckCircle2,
  OctagonAlert,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { usageLevel, usageLabel, type UsageLevel } from "@/config/quotas";
import { formatValue, formatPercent, meterWidth } from "@/lib/usage/format";
import type { UsageReport, UsageMeter, UsageStat, MetricState } from "@/lib/usage/collect";
import { cn } from "@/lib/utils";

/**
 * The "All Usage" panel.
 *
 * Form choice: a **meter** per quota, not a chart. Each figure is one ratio
 * against one limit, and the question is "is this about to run out?" - a bar
 * against a track answers that in one glance, where a pie of two slices or a
 * bar chart of unrelated units does not.
 *
 * Severity is carried by THREE channels, never colour alone: the fill colour,
 * an icon, and a word ("Running low"). The track is the soft step of the same
 * status ramp, so the state reads across the whole bar rather than only the
 * filled part.
 *
 * Fetched client-side rather than server-rendered because the bucket walk can
 * take seconds: the page frame and the admin gate resolve immediately, and
 * the numbers arrive when they arrive.
 */

/**
 * Fill colours, chosen by measurement rather than by taste.
 *
 * Two constraints had to hold at once, and most obvious choices fail one:
 *
 *  - WCAG 1.4.11 needs 3:1 between the fill and its track, or the bar reads
 *    as empty. The BASE status colours fail this in light mode (warning
 *    1.95:1, orange 2.47:1, success 2.94:1).
 *  - Adjacent levels must be tellable apart. warning-strong and
 *    orange-strong measure a normal-vision deltaE of 4.1, which is why this
 *    ramp has three steps rather than four (see usageLevel).
 *
 * What passes: success-strong, a meter-specific amber, and critical-strong -
 * 3.56:1 to 5.59:1 on their tracks in light, 7.34:1 to 10.66:1 in dark, with
 * normal-vision separation of deltaE 17.2 and full CVD separation in dark.
 * theme-contrast.test.ts asserts every fill/track pairing in both themes.
 */
const LEVEL_STYLES: Record<UsageLevel, { fill: string; track: string; text: string; Icon: typeof CheckCircle2 }> = {
  ok: {
    fill: "bg-success-strong",
    track: "bg-success-soft",
    text: "text-success-strong",
    Icon: CheckCircle2,
  },
  warning: {
    fill: "bg-meter-warning",
    track: "bg-warning-soft",
    text: "text-warning-strong",
    Icon: TriangleAlert,
  },
  critical: {
    fill: "bg-critical-strong",
    track: "bg-critical-soft",
    text: "text-critical-strong",
    Icon: OctagonAlert,
  },
};

/**
 * A row with no number, and why.
 *
 * Deliberately renders NO track. An empty grey bar here read as a meter at
 * 0% - "nothing used" - which is the opposite of "we could not find out".
 * The words carry it instead, with no icon: a circle-slash glyph at 14px was
 * indistinguishable from a tick, so a failed reading looked like a pass.
 */
function MissingRow({ meter }: { meter: UsageMeter }) {
  const unconfigured = meter.state === "unconfigured";
  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[13px] font-medium text-ink">{meter.label}</span>
        <span className="text-[12px] font-medium text-ink-secondary">
          {unconfigured ? "Not configured" : "Could not read"}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-ink-secondary">
        <span className="text-ink-faint">{meter.provider}.</span> {meter.detail}
      </p>
    </li>
  );
}

function MeterRow({ meter }: { meter: UsageMeter }) {
  if (!Number.isFinite(meter.used)) return <MissingRow meter={meter} />;

  const ratio = meter.limit > 0 ? meter.used / meter.limit : 0;
  const level = usageLevel(ratio);
  const { fill, track, text, Icon } = LEVEL_STYLES[level];
  const partial = meter.state === "partial";
  const used = formatValue(meter.used, meter.unit);
  const limit = Number.isFinite(meter.limit)
    ? formatValue(meter.limit, meter.unit)
    : "no cap";

  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[13px] font-medium text-ink">{meter.label}</span>
        <span className="text-[13px] text-ink-secondary">
          {/* tabular-nums: these sit in a column and must align vertically. */}
          <span className="font-semibold text-ink tabular-nums">
            {partial ? "≥" : ""}
            {used}
          </span>
          <span className="text-ink-faint"> / {limit}</span>
        </span>
      </div>

      <div
        className={cn("mt-2 h-1.5 overflow-hidden rounded-full", track)}
        role="meter"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${meter.label}: ${formatPercent(ratio)} of ${limit} used`}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", fill)}
          style={{ width: `${meterWidth(ratio)}%` }}
        />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
        <span className={cn("inline-flex items-center gap-1 font-medium", text)}>
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {usageLabel(level)}
        </span>
        <span className="text-ink-secondary tabular-nums">{formatPercent(ratio)}</span>
        <span className="text-ink-secondary">
          {partial && <strong className="font-semibold text-orange-strong">Partial. </strong>}
          {meter.detail}
        </span>
      </div>
    </li>
  );
}

function StatRow({ stat }: { stat: UsageStat }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2.5">
      <span className="text-[13px] text-ink">{stat.label}</span>
      <span className="text-[13px] font-semibold text-ink tabular-nums">
        {stat.value === null ? "-" : formatValue(stat.value, stat.unit)}
      </span>
      {stat.detail && (
        <span className="w-full text-[12px] text-ink-secondary">{stat.detail}</span>
      )}
    </li>
  );
}

function stateRank(state: MetricState): number {
  // Readable rows first, problems last - a page whose top row is an error
  // reads as broken even when nine other things are fine.
  return state === "measured" || state === "partial" ? 0 : 1;
}

export function UsageMeters({ initial }: { initial: UsageReport }) {
  const [report, setReport] = useState<UsageReport>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Re-measure on demand.
   *
   * There is deliberately no mount effect: the server component renders the
   * first report, so the page arrives with real numbers instead of a spinner
   * that resolves into them. This runs only from the Refresh button, where a
   * synchronous setState is exactly what an event handler is for.
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/usage", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      setReport((await res.json()) as UsageReport);
    } catch (err) {
      // The previous report stays on screen - stale numbers with a visible
      // error beat an empty page, because the last reading is still the best
      // information available.
      setError(err instanceof Error ? err.message : "Could not re-measure.");
    } finally {
      setLoading(false);
    }
  }, []);

  const meters = [...report.meters].sort((a, b) => stateRank(a.state) - stateRank(b.state));

  return (
    <div className="space-y-7">
      <section>
        <div className="mb-1 flex items-center justify-between gap-3">
          <h4 className="text-[13px] font-semibold text-ink">Quotas</h4>
          <div className="flex items-center gap-2">
            {error && (
              <span className="text-[12px] text-critical-strong" role="status">
                {error}
              </span>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-secondary hover:bg-primary-soft disabled:opacity-60"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
              {loading ? "Measuring" : "Refresh"}
            </button>
          </div>
        </div>
        <ul className="divide-y divide-line">
          {meters.map((m) => (
            <MeterRow key={m.id} meter={m} />
          ))}
        </ul>
      </section>

      {report.stats.length > 0 && (
        <section>
          <h4 className="mb-1 text-[13px] font-semibold text-ink">Volume</h4>
          <p className="mb-1 text-[12px] text-ink-secondary">
            No caps on these. They are what the quotas above are made of, so this is where
            growth shows up first.
          </p>
          <ul className="divide-y divide-line">
            {report.stats.map((s) => (
              <StatRow key={s.id} stat={s} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h4 className="mb-1 text-[13px] font-semibold text-ink">No limit to watch</h4>
        <ul className="divide-y divide-line">
          {report.uncapped.map((item) => (
            <li key={item.label} className="py-2.5">
              <span className="text-[13px] text-ink">{item.label}</span>
              <p className="text-[12px] text-ink-secondary">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-line pt-3 text-[12px] text-ink-secondary">
        <p>
          Measured{" "}
          <time dateTime={report.generatedAt}>
            {new Date(report.generatedAt).toLocaleString()}
          </time>
          . Caps are configured in <code className="text-ink">apps/web/src/config/quotas.ts</code>{" "}
          and overridable by environment variable — check them against each provider&apos;s own
          dashboard, because an out-of-date cap makes a meter read low.
        </p>
        {report.problems.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {report.problems.map((p) => (
              <li key={p} className="text-critical-strong">
                {p}
              </li>
            ))}
          </ul>
        )}
      </footer>
    </div>
  );
}
