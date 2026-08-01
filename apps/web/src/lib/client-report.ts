/**
 * Pure helpers for the public client report (/r/[token]) - the agency-facing
 * "here's what your retainer bought you" document. Kept free of Prisma so the
 * shaping and formatting logic is unit-testable.
 */

export const REPORT_WINDOW_DAYS = 30;

export type ReportSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

/** Fixed display order - most severe first. */
export const REPORT_SEVERITIES: ReportSeverity[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
];

export interface SeverityRow {
  severity: ReportSeverity;
  label: string;
  count: number;
  /** 0-100 share of the largest bucket, for proportional bars. */
  barPercent: number;
}

const SEVERITY_LABELS: Record<ReportSeverity, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  INFO: "Info",
};

/**
 * Rows for the severity breakdown, in fixed order, with bar widths scaled to
 * the largest bucket. Unknown severities from groupBy are ignored.
 */
export function buildSeverityRows(
  counts: { severity: string; count: number }[],
): SeverityRow[] {
  const bySeverity = new Map(counts.map((c) => [c.severity, c.count]));
  const max = Math.max(1, ...REPORT_SEVERITIES.map((s) => bySeverity.get(s) ?? 0));
  return REPORT_SEVERITIES.map((severity) => {
    const count = bySeverity.get(severity) ?? 0;
    return {
      severity,
      label: SEVERITY_LABELS[severity],
      count,
      barPercent: Math.round((count / max) * 100),
    };
  });
}

/** "Jul 2 – Aug 1, 2026" (UTC) for the report period header. */
export function formatReportPeriod(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  };
  const startLabel = start.toLocaleDateString("en-US", opts);
  const endLabel = end.toLocaleDateString("en-US", {
    ...opts,
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

/** "99.98%" / "100%" - trims noise, never rounds a partial outage to 100%. */
export function formatReportUptime(percent: number | null): string {
  if (percent === null) return "–";
  if (percent === 100) return "100%";
  // 99.999 must not display as 100% - floor at two decimals instead.
  const floored = Math.floor(percent * 100) / 100;
  return `${floored.toFixed(2)}%`;
}

/** SSL badge copy from days-until-expiry. */
export function sslSummary(validTo: Date | null, now: Date): {
  label: string;
  tone: "ok" | "warn" | "none";
} {
  if (!validTo) return { label: "Not monitored", tone: "none" };
  const daysLeft = Math.floor((validTo.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return { label: "Certificate expired", tone: "warn" };
  if (daysLeft <= 14) return { label: `Expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`, tone: "warn" };
  return { label: `Valid - renews in ${daysLeft} days`, tone: "ok" };
}

/** Accept exactly #rrggbb (case-insensitive). Anything else is rejected. */
export function isValidBrandColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/**
 * Readable text color (dark ink or white) for chips sitting on the brand
 * accent - WCAG-ish relative luminance cut at 0.55.
 */
export function contrastTextClass(hexColor: string): "text-white" | "text-[#101010]" {
  const r = parseInt(hexColor.slice(1, 3), 16) / 255;
  const g = parseInt(hexColor.slice(3, 5), 16) / 255;
  const b = parseInt(hexColor.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? "text-[#101010]" : "text-white";
}
