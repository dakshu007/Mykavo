/**
 * Weekly report shaping (spec §37 "client-ready reports"). Pure functions
 * only — the worker sweep (apps/worker/src/report.ts) gathers the raw counts
 * and delegates ALL presentation decisions here (period label, severity
 * ordering, rounding, "all quiet" detection) so they are unit-testable
 * without a database. The output is exactly the input of the
 * `weeklyReportEmail` template in @fluxen/email.
 */

import { daysUntil, SSL_EXPIRY_THRESHOLD_DAYS } from "./health";

export type ReportSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Highest first — the order the email lists the breakdown in. */
export const REPORT_SEVERITY_ORDER: readonly ReportSeverity[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
];

export interface ReportSeverityCount {
  severity: ReportSeverity;
  count: number;
}

export interface ReportLighthouseScores {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}

/** Raw, unshaped numbers as gathered by the worker for one website. */
export interface ReportRawData {
  websiteName: string;
  websiteHost: string;
  periodStart: Date;
  periodEnd: Date;
  scansRun: number;
  scansFailed: number;
  /** Change-event counts keyed by severity; absent severities mean zero. */
  changesBySeverity: Partial<Record<ReportSeverity, number>>;
  /** 0–100 (unrounded) or null when no health checks exist in the window. */
  uptimePercent: number | null;
  /** Average response time of successful checks, null when none exist. */
  avgResponseTimeMs: number | null;
  /** Latest observed certificate expiry, null when unknown (http site). */
  sslValidTo: Date | null;
  lighthouse: ReportLighthouseScores | null;
  dashboardUrl: string;
}

/** Shaped template input — see `weeklyReportEmail` in @fluxen/email. */
export interface WeeklyReportModel {
  websiteName: string;
  websiteHost: string;
  /** e.g. "Jul 3 – Jul 10, 2026". */
  periodLabel: string;
  scansRun: number;
  scansFailed: number;
  totalChanges: number;
  /** Non-zero severities only, highest first. */
  changesBySeverity: ReportSeverityCount[];
  /** Rounded to one decimal, or null when unknown. */
  uptimePercent: number | null;
  /** Rounded to whole ms, or null when unknown. */
  avgResponseMs: number | null;
  /** Whole days until certificate expiry, or null when unknown. */
  sslDaysLeft: number | null;
  lighthouse: ReportLighthouseScores | null;
  /** True when there is nothing to worry about — the reassuring variant. */
  allQuiet: boolean;
  dashboardUrl: string;
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Jul 3 – Jul 10, 2026" (year once, from the period end). */
export function formatPeriodLabel(start: Date, end: Date): string {
  const year = end.toLocaleDateString("en-US", { year: "numeric", timeZone: "UTC" });
  return `${formatDay(start)} – ${formatDay(end)}, ${year}`;
}

/** Round to one decimal (100 stays exactly 100, never "100.0…1"). */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Shape raw weekly numbers into the email template input. "All quiet" means:
 * no changes detected, no failed scans, uptime unknown or effectively 100%
 * (>= 99.95 rounds to 100), and the SSL certificate (when known) is not
 * inside the expiry-warning window.
 */
export function buildReportModel(raw: ReportRawData, now: Date = raw.periodEnd): WeeklyReportModel {
  const changesBySeverity = REPORT_SEVERITY_ORDER.map((severity) => ({
    severity,
    count: raw.changesBySeverity[severity] ?? 0,
  })).filter((line) => line.count > 0);

  const totalChanges = changesBySeverity.reduce((sum, line) => sum + line.count, 0);
  const uptimePercent = raw.uptimePercent === null ? null : round1(raw.uptimePercent);
  const sslDaysLeft = raw.sslValidTo === null ? null : daysUntil(raw.sslValidTo, now);

  const allQuiet =
    totalChanges === 0 &&
    raw.scansFailed === 0 &&
    (raw.uptimePercent === null || raw.uptimePercent >= 99.95) &&
    (sslDaysLeft === null || sslDaysLeft > SSL_EXPIRY_THRESHOLD_DAYS);

  return {
    websiteName: raw.websiteName,
    websiteHost: raw.websiteHost,
    periodLabel: formatPeriodLabel(raw.periodStart, raw.periodEnd),
    scansRun: raw.scansRun,
    scansFailed: raw.scansFailed,
    totalChanges,
    changesBySeverity,
    uptimePercent,
    avgResponseMs: raw.avgResponseTimeMs === null ? null : Math.round(raw.avgResponseTimeMs),
    sslDaysLeft,
    lighthouse: raw.lighthouse,
    allQuiet,
    dashboardUrl: raw.dashboardUrl,
  };
}
