/**
 * Public status page helpers - pure functions used by /status/[token].
 * No I/O here: the page resolves the opaque token to a website id
 * server-side, runs one grouped rollup query over health_check, and renders
 * through these. Kept pure so thresholds and formatting are unit-testable.
 */

/** One row of the per-UTC-day health rollup query (already aggregated). */
export interface DayRollupRow {
  /** UTC calendar day, "YYYY-MM-DD". */
  day: string;
  /** Total checks recorded that day. */
  total: number;
  /** Checks that observed the site up. */
  up: number;
}

/** One bar of the 90-day uptime strip. */
export interface DayBucket {
  /** UTC calendar day, "YYYY-MM-DD". */
  date: string;
  /** Uptime percentage (0–100) for the day, null when it has no checks. */
  uptimePercent: number | null;
}

/** Color band for one day bar. Always rendered with a text legend. */
export type DayLevel = "operational" | "degraded" | "down" | "empty";

/** Threshold mapping: green ≥99.5%, amber ≥95%, red below, gray no data. */
export function dayLevel(uptimePercent: number | null): DayLevel {
  if (uptimePercent === null) return "empty";
  if (uptimePercent >= 99.5) return "operational";
  if (uptimePercent >= 95) return "degraded";
  return "down";
}

/**
 * "100%" when the value rounds there, otherwise two decimals ("99.98%").
 * "-" when no checks exist in the window.
 */
export function formatUptime(percent: number | null): string {
  if (percent === null) return "-";
  const fixed = percent.toFixed(2);
  return fixed === "100.00" ? "100%" : `${fixed}%`;
}

/**
 * Compact incident duration: "< 1m", "42m", "1h 5m", "2d 4h". Zero-valued
 * trailing units are dropped; sub-minute incidents never show "0m".
 */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return "< 1m";
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

/**
 * Expand rollup rows into a dense oldest→newest bucket list covering the
 * last `days` UTC days ending today. Days without checks (retention pruned,
 * monitoring not yet running) get uptimePercent null → gray bars.
 */
export function buildDayBuckets(
  rows: DayRollupRow[],
  days: number,
  now: Date,
): DayBucket[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(todayUtc - i * 86_400_000).toISOString().slice(0, 10);
    const row = byDay.get(date);
    buckets.push({
      date,
      uptimePercent: row && row.total > 0 ? (row.up / row.total) * 100 : null,
    });
  }
  return buckets;
}

/** "Jul 11, 2026" for a "YYYY-MM-DD" UTC day (no local-timezone drift). */
export function formatUtcDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Per-bar tooltip: "Jul 11, 2026 · 99.98% uptime" or "… · no data". */
export function dayTooltip(bucket: DayBucket): string {
  const value =
    bucket.uptimePercent === null
      ? "no data"
      : `${formatUptime(bucket.uptimePercent)} uptime`;
  return `${formatUtcDay(bucket.date)} · ${value}`;
}
