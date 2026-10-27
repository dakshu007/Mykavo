/**
 * "Email me a free site audit" from the homepage.
 *
 * Crawls the visitor's site with the same fetch-only auditor customers use
 * (capped at the Free plan's page limit), then emails the report: score,
 * counts and the few most damaging issues in full, with the rest unlocked by
 * a free account. A crawl that could not say anything true - blocked by a
 * firewall, site down - gets an honest "we could not audit it" instead of a
 * confident report about our own failed requests.
 *
 * Idempotent: only a QUEUED row is processed, so a redelivered job never
 * crawls or emails twice.
 */

import { prisma } from "@mykavo/database";
import { auditReportEmail, auditUnavailableEmail, sendEmail } from "@mykavo/email";
import {
  AUDIT_CHECK_COUNT,
  DEFAULT_LIMITS,
  runSiteAudit,
  summarizeAuditReport,
  type AuditResult,
} from "@mykavo/seo-audit";
import type { LeadAuditJob } from "@mykavo/shared";
import { TRIAL_DAYS } from "@mykavo/shared/plan-tier";
import { assertSafeUrl } from "@mykavo/shared/ssrf";
import { logger } from "./logger";

/** A visitor is waiting on their inbox: shorter than a customer's audit. */
const LEAD_AUDIT_MAX_MS = 5 * 60 * 1000;

function appUrl(path: string): string {
  const base = (process.env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function runLeadAuditJob(job: LeadAuditJob): Promise<void> {
  const claimed = await prisma.auditLead.updateMany({
    where: { id: job.leadId, status: "QUEUED" },
    data: { status: "RUNNING" },
  });
  if (claimed.count === 0) return;
  const lead = await prisma.auditLead.findUnique({ where: { id: job.leadId } });
  if (!lead) return;

  const log = { leadId: lead.id, host: lead.host };
  let result: AuditResult | null = null;
  try {
    await assertSafeUrl(lead.url);
    result = await runSiteAudit(lead.url, {
      ...DEFAULT_LIMITS,
      maxPages: Math.max(1, Math.min(job.maxPages, 500)),
      maxDurationMs: LEAD_AUDIT_MAX_MS,
    });
  } catch (err) {
    logger.warn("lead audit crawl failed", { ...log, error: err instanceof Error ? err.message : String(err) });
  }

  const summary = result ? summarizeAuditReport(result) : null;
  const message =
    result && summary?.trustworthy
      ? auditReportEmail({
          host: lead.host,
          pagesCrawled: result.pagesCrawled,
          healthScore: result.healthScore,
          checkCount: AUDIT_CHECK_COUNT,
          errorCount: result.errorCount,
          warningCount: result.warningCount,
          noticeCount: result.noticeCount,
          issues: summary.shown.map((i) => ({
            title: i.title,
            severity: i.severity,
            explain: i.explain,
            fix: i.fix,
            count: i.count,
            exampleUrl: i.exampleUrl,
          })),
          hidden: {
            types: summary.hidden.types,
            errors: summary.hidden.problems.ERROR,
            warnings: summary.hidden.problems.WARNING,
            notices: summary.hidden.problems.NOTICE,
          },
          fullReportUrl: appUrl(job.fullReportPath),
          proUrl: appUrl(job.proPath),
          trialDays: TRIAL_DAYS > 0 ? TRIAL_DAYS : null,
          proAuditPages: job.proAuditPages,
        })
      : auditUnavailableEmail({ host: lead.host, monitorUrl: appUrl(job.fullReportPath) });

  const sent = await sendEmail({ to: [lead.email], subject: message.subject, html: message.html, text: message.text });

  await prisma.auditLead.update({
    where: { id: lead.id },
    data: {
      status: result ? "COMPLETED" : "FAILED",
      completedAt: new Date(),
      pagesCrawled: result?.pagesCrawled ?? 0,
      healthScore: result && summary?.trustworthy ? result.healthScore : null,
      errorCount: result?.errorCount ?? 0,
      warningCount: result?.warningCount ?? 0,
      noticeCount: result?.noticeCount ?? 0,
      emailedAt: sent.ok ? new Date() : null,
      errorMessage: sent.ok ? null : `email: ${String(sent.error).slice(0, 300)}`,
    },
  });

  logger.info("lead audit finished", {
    ...log,
    pages: result?.pagesCrawled ?? 0,
    healthScore: result?.healthScore ?? null,
    trustworthy: summary?.trustworthy ?? false,
    emailed: sent.ok,
  });
}
