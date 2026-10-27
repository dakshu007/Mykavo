/**
 * The free audit report emailed from the homepage: which issues to show in
 * full, and what to summarise behind the signup.
 *
 * Shows a few issues completely - title, why it matters, how to fix it and a
 * real URL from the site - because a report that withholds everything is
 * worthless and nobody signs up to see more of nothing. The rest is counted
 * honestly by severity and unlocked in the dashboard.
 *
 * Ordered like pickLeadFinding: the curated "lead with this" list first,
 * then severity, then how widespread. Pure, so it is tested without crawling.
 */

import { LEAD_WITH, NEVER_LEAD, auditIsTrustworthy } from "./lead";
import { AUDIT_CHECKS, SEVERITY_ORDER, type AuditCategory, type AuditSeverity } from "./registry";
import type { AuditResult } from "./crawl";

export interface AuditIssueSummary {
  checkId: string;
  title: string;
  explain: string;
  fix: string;
  severity: AuditSeverity;
  category: AuditCategory;
  /** Affected URLs (or occurrences) across the crawl. */
  count: number;
  exampleUrl: string | null;
}

export interface AuditReportSummary {
  /** False when the crawl was blocked or too thin to say anything true. */
  trustworthy: boolean;
  shown: AuditIssueSummary[];
  /** Issue types not shown, and how many problems they cover, by severity. */
  hidden: { types: number; problems: Record<AuditSeverity, number> };
}

export const FREE_REPORT_ISSUES = 3;

export function summarizeAuditReport(result: AuditResult, shownCount = FREE_REPORT_ISSUES): AuditReportSummary {
  const ranked = result.issues
    .map((group) => {
      const def = AUDIT_CHECKS[group.checkId];
      // Our own request failing says nothing about the site; never report it.
      if (!def || NEVER_LEAD.has(group.checkId)) return null;
      const leadIndex = LEAD_WITH.indexOf(group.checkId);
      const summary: AuditIssueSummary = {
        checkId: group.checkId,
        title: def.title,
        explain: def.explain,
        fix: def.fix,
        severity: def.severity,
        category: def.category,
        count: group.count,
        exampleUrl: group.urls[0]?.url ?? null,
      };
      return {
        summary,
        rank: [leadIndex === -1 ? 1 : 0, leadIndex === -1 ? 0 : leadIndex, -SEVERITY_ORDER[def.severity], -group.count],
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => {
      for (let i = 0; i < a.rank.length; i++) {
        if (a.rank[i] !== b.rank[i]) return a.rank[i] - b.rank[i];
      }
      return 0;
    })
    .map((x) => x.summary);

  const shown = ranked.slice(0, shownCount);
  const rest = ranked.slice(shownCount);
  const problems: Record<AuditSeverity, number> = { ERROR: 0, WARNING: 0, NOTICE: 0 };
  for (const issue of rest) problems[issue.severity] += issue.count;

  return {
    trustworthy: auditIsTrustworthy(result),
    shown,
    hidden: { types: rest.length, problems },
  };
}
