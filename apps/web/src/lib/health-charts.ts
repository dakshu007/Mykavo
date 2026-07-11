/**
 * Pure math and formatting for the uptime/response-time charts on the website
 * detail page (components/charts/*). Scales, SVG path building, colour-band
 * thresholds, tick generation, formatting — no React, no DOM, fully
 * unit-testable, mirroring the audit-trend.ts pattern.
 */

// ---------- Window selection (?health= searchParam) ----------

export type HealthWindowDays = 7 | 30 | 90;

export const HEALTH_WINDOWS: readonly { days: HealthWindowDays; param: string; label: string }[] = [
  { days: 7, param: "7d", label: "7d" },
  { days: 30, param: "30d", label: "30d" },
  { days: 90, param: "90d", label: "90d" },
];

/** Parse the `?health=` searchParam; anything unrecognised falls back to 30d. */
export function parseHealthWindow(value: string | string[] | undefined): HealthWindowDays {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === "7d") return 7;
  if (v === "90d") return 90;
  return 30;
}

/**
 * Bucket width for the response-time series: ~170–180 buckets per window —
 * dense enough to show shape, small enough to render + hover cheaply.
 */
export function bucketMinutesForWindow(days: HealthWindowDays): number {
  if (days <= 7) return 60; // 168 buckets
  if (days <= 30) return 240; // 180 buckets
  return 720; // 180 buckets
}

// ---------- Uptime day bars ----------

export interface UptimeDay {
  /** UTC calendar day, "YYYY-MM-DD". */
  date: string;
  totalChecks: number;
  upChecks: number;
  /** 0–100, null when the day has no checks. */
  uptimePercent: number | null;
}

export type UptimeBand = "good" | "degraded" | "bad" | "empty";

/** Status-page thresholds: green ≥99.5%, amber ≥95%, red below, gray no data. */
export function uptimeBand(uptimePercent: number | null): UptimeBand {
  if (uptimePercent === null) return "empty";
  if (uptimePercent >= 99.5) return "good";
  if (uptimePercent >= 95) return "degraded";
  return "bad";
}

/** Check-weighted uptime across the whole window; null when never checked. */
export function overallUptime(days: readonly UptimeDay[]): number | null {
  let total = 0;
  let up = 0;
  for (const d of days) {
    total += d.totalChecks;
    up += d.upChecks;
  }
  return total > 0 ? (up / total) * 100 : null;
}

/**
 * "100%", "99.98%", "97.5%", "0%" — at most two decimals, trailing zeros
 * dropped. A window with any downtime never rounds up to "100%".
 */
export function formatPercent(p: number | null): string {
  if (p === null) return "—";
  if (p === 100) return "100%";
  let rounded = Math.round(p * 100) / 100;
  if (rounded === 100) rounded = 99.99;
  return `${rounded}%`;
}

/** "Jul 9" from a "YYYY-MM-DD" UTC day (no local-timezone drift). */
export function formatDayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Accessible one-sentence summary of the uptime strip. */
export function uptimeStripSummary(days: readonly UptimeDay[], windowDays: number): string {
  const overall = overallUptime(days);
  if (overall === null) return `No uptime checks recorded in the last ${windowDays} days.`;
  const checked = days.filter((d) => d.totalChecks > 0).length;
  const outageDays = days.filter((d) => uptimeBand(d.uptimePercent) === "bad").length;
  const outages =
    outageDays > 0 ? `, ${outageDays} day${outageDays === 1 ? "" : "s"} below 95%` : "";
  return `${formatPercent(overall)} uptime over the last ${windowDays} days, ${checked} of ${days.length} days with checks${outages}.`;
}

// ---------- Duration + milliseconds formatting ----------

/** "< 1m", "42m", "3h 5m", "2d 4h" — compact incident-duration text. */
export function formatDuration(ms: number): string {
  if (ms < 60_000) return "< 1m";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

/** "412 ms", "2.1 s", "2 s" — response-time label. */
export function formatMs(v: number): string {
  if (v >= 1000) {
    const s = (v / 1000).toFixed(1);
    return `${s.endsWith(".0") ? s.slice(0, -2) : s} s`;
  }
  return `${Math.round(v)} ms`;
}

// ---------- Linear scales + nice ticks ----------

/** Index → x across [left, right]; a single point sits in the middle. */
export function xAt(i: number, n: number, left: number, right: number): number {
  if (n <= 1) return (left + right) / 2;
  return left + (i / (n - 1)) * (right - left);
}

/** Value → y (SVG y grows downward); a zero-height domain pins to the bottom. */
export function yAt(value: number, yMax: number, top: number, bottom: number): number {
  if (yMax <= 0) return bottom;
  return bottom - (value / yMax) * (bottom - top);
}

/**
 * Ticks from 0 upward in a "nice" step (1/2/5 × 10^k) so response-time axes
 * read 0/50/100… or 0/200/400… The last tick is always ≥ maxValue, making it
 * a safe y-domain max. Degenerate input (≤ 0, NaN) → [0, 1].
 */
export function niceTicks(maxValue: number, targetCount = 4): number[] {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return [0, 1];
  const rawStep = maxValue / Math.max(1, targetCount);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step =
    [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? 10 * magnitude;
  const ticks: number[] = [];
  const count = Math.ceil((maxValue - 1e-9) / step);
  for (let i = 0; i <= count; i++) {
    // Round away float-accumulation noise (0.30000000000000004).
    ticks.push(Math.round(i * step * 1e6) / 1e6);
  }
  return ticks;
}

// ---------- Path building (line + area with gaps) ----------

export interface XY {
  x: number;
  y: number;
}

/**
 * Split a time series into contiguous runs of scaled points. A run breaks on
 * null values AND on time gaps wider than maxGapMs (missing buckets — the
 * site was down or unmonitored, so the line must not bridge the hole).
 */
export function splitTimeSegments(
  points: readonly { t: number; v: number | null }[],
  maxGapMs: number,
  toX: (t: number) => number,
  toY: (v: number) => number,
): XY[][] {
  const segments: XY[][] = [];
  let current: XY[] = [];
  let prevT: number | null = null;
  for (const p of points) {
    const gap = prevT !== null && p.t - prevT > maxGapMs;
    if (p.v === null || gap) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      if (p.v === null) {
        prevT = p.t;
        continue;
      }
    }
    current.push({ x: toX(p.t), y: toY(p.v) });
    prevT = p.t;
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

const fmt = (n: number): string => (Math.round(n * 10) / 10).toString();

/** "M x y L x y …" for one contiguous segment; "" for an empty one. */
export function linePath(segment: readonly XY[]): string {
  return segment.map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p.x)} ${fmt(p.y)}`).join(" ");
}

/** Closed fill path for one segment, dropped to the baseline on both ends. */
export function areaPath(segment: readonly XY[], baselineY: number): string {
  if (segment.length === 0) return "";
  const first = segment[0];
  const last = segment[segment.length - 1];
  return `${linePath(segment)} L${fmt(last.x)} ${fmt(baselineY)} L${fmt(first.x)} ${fmt(baselineY)} Z`;
}

// ---------- Response-time summary ----------

export interface ResponseTimeStats {
  avgMs: number;
  peakMs: number;
  minMs: number;
  /** Number of buckets that actually carry a value. */
  samples: number;
}

/** Aggregate stats over the visible buckets; null when no bucket has data. */
export function responseTimeStats(
  values: readonly (number | null)[],
): ResponseTimeStats | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  let sum = 0;
  let peak = -Infinity;
  let min = Infinity;
  for (const v of present) {
    sum += v;
    if (v > peak) peak = v;
    if (v < min) min = v;
  }
  return { avgMs: sum / present.length, peakMs: peak, minMs: min, samples: present.length };
}

/** Accessible chart summary: "Average response time 412 ms …, peak 2.1 s." */
export function responseTimeSummary(
  values: readonly (number | null)[],
  windowDays: number,
): string {
  const stats = responseTimeStats(values);
  if (!stats) return `No response-time data in the last ${windowDays} days.`;
  return `Average response time ${formatMs(stats.avgMs)} over the last ${windowDays} days, peak ${formatMs(stats.peakMs)}.`;
}

/** Hover label for one bucket: "Jul 9, 2:00 PM — 412 ms". */
export function formatBucketLabel(isoOrMs: string | number, avgMs: number | null): string {
  const when = new Date(isoOrMs).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${when} — ${avgMs === null ? "no successful checks" : formatMs(avgMs)}`;
}

/** Axis label for a timestamp: with time for short windows, date-only beyond. */
export function formatAxisTime(ms: number, windowDays: number): string {
  const d = new Date(ms);
  if (windowDays <= 7) {
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
