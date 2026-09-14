/**
 * Usage presentation: severity thresholds and number formatting.
 *
 * DUPLICATED from apps/web/src/config/quotas.ts and apps/web/src/lib/usage/
 * format.ts, because apps/mobile sits outside the pnpm workspace and cannot
 * import @mykavo/shared. That duplication is a real risk - if the web moves
 * its "getting full" line and this file does not, the phone says Healthy
 * while the dashboard says At capacity about the same number, and you trust
 * whichever you happened to open.
 *
 * usage.test.ts reads the web file and asserts the thresholds match, so the
 * drift fails a test rather than misinforming you.
 */

/**
 * Three steps, not four. In the web palette the two middle fills of a
 * four-step ramp measure a normal-vision OKLab deltaE of 4.1 and a
 * deuteranopia deltaE of 0.1 - indistinguishable - so a fourth level carried
 * no information. Kept identical here so both surfaces say the same word
 * about the same figure.
 */
export type UsageLevel = "ok" | "warning" | "critical";

/** `ratio` is used/limit, so 0.82 is 82%. */
export function usageLevel(ratio: number): UsageLevel {
  if (!Number.isFinite(ratio) || ratio < 0) return "ok";
  if (ratio >= 0.9) return "critical";
  if (ratio >= 0.7) return "warning";
  return "ok";
}

/** Plain words, so colour is never the only signal. */
export function usageLabel(level: UsageLevel): string {
  switch (level) {
    case "critical":
      return "At capacity";
    case "warning":
      return "Getting full";
    case "ok":
      return "Healthy";
  }
}

/** Binary units - what Postgres, R2 and Netlify all report in. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** exponent;
  const digits = value < 10 && exponent > 0 ? 1 : 0;
  return `${value.toFixed(digits)} ${units[exponent]}`;
}

export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "-";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return value.toLocaleString("en-US");
}

export function formatUsageValue(value: number, unit: "bytes" | "count"): string {
  return unit === "bytes" ? formatBytes(value) : formatCount(value);
}

/** Never rounds a real value down to "0%" - that reads as "nothing stored". */
export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio < 0) return "-";
  const pct = ratio * 100;
  if (pct > 0 && pct < 1) return "<1%";
  if (pct >= 1000) return ">999%";
  return `${Math.round(pct)}%`;
}

/** Fill width, clamped to the track: over-quota is said in words, not geometry. */
export function meterFraction(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  return Math.min(1, ratio);
}
