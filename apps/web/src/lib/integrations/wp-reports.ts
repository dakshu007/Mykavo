/**
 * Client reports in the WordPress plugin (1.3.0 Reports tab): the live
 * white-label report at /r/[token] - the same 30-day window the report page
 * shows - summed up in a few numbers. Pure; unit-tested.
 */

import { isRollbackReport } from "./wp-features";

export interface ReportSummaryInput {
  /** Update reports in the window, with their items. */
  updates: { items: unknown }[];
  uptimePercent: number | null;
  sslValidTo: Date | null;
  changesCaught: number;
  aiVisits: number;
  now: Date;
}

export interface ReportSummary {
  updates: number;
  rollbacks: number;
  uptimePermille?: number;
  sslDaysLeft?: number;
  changesCaught: number;
  aiVisits: number;
}

export function buildReportSummary(input: ReportSummaryInput): ReportSummary {
  const rollbacks = input.updates.filter((u) => isRollbackReport(u.items)).length;
  const summary: ReportSummary = {
    updates: input.updates.length - rollbacks,
    rollbacks,
    changesCaught: input.changesCaught,
    aiVisits: input.aiVisits,
  };
  if (input.uptimePercent !== null) {
    // Floored, like the report page: 99.96% must never read as 100%.
    summary.uptimePermille = Math.floor(input.uptimePercent * 10);
  }
  if (input.sslValidTo) {
    summary.sslDaysLeft = Math.max(0, Math.floor((input.sslValidTo.getTime() - input.now.getTime()) / 86_400_000));
  }
  return summary;
}
