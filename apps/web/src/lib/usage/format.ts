/**
 * Presentation helpers for the usage page. Pure and server-import-free so
 * they can be unit-tested and used from a client component alike.
 */

/**
 * Bytes as the largest unit that keeps the number readable.
 *
 * Binary units (1024) because that is what Postgres, R2 and Netlify all
 * report in, and mixing conventions here would make a 500 MB cap look like
 * it had 24 MB of headroom it does not have.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** exponent;
  // One decimal below 10 ("1.4 GB"), none above ("420 MB") - enough
  // precision to see movement without implying more than we measured.
  const digits = value < 10 && exponent > 0 ? 1 : 0;
  return `${value.toFixed(digits)} ${units[exponent]}`;
}

/** Counts with thousands separators; compact past a million. */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "-";
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  return value.toLocaleString("en-US");
}

export type UsageUnit = "bytes" | "count";

export function formatValue(value: number, unit: UsageUnit): string {
  return unit === "bytes" ? formatBytes(value) : formatCount(value);
}

/**
 * Percentage for display. Deliberately not rounded to zero when tiny: "0%"
 * next to a 400 MB database reads as "nothing stored", so anything above
 * zero shows at least "<1%".
 */
export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio < 0) return "-";
  const pct = ratio * 100;
  if (pct > 0 && pct < 1) return "<1%";
  if (pct >= 1000) return ">999%";
  return `${Math.round(pct)}%`;
}

/**
 * Width for the meter fill, clamped to the track.
 *
 * Over-quota is clamped at 100% rather than overflowing, because the number
 * and the "At capacity" label already say it is over - a fill escaping its
 * track just looks like a rendering bug.
 */
export function meterWidth(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  return Math.min(100, ratio * 100);
}
