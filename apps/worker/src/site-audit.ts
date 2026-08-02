/**
 * Site Audit job: crawl a website with the fetch-only auditor and persist
 * the aggregated result. Heavyweight-ish (up to ~10 min of polite fetching)
 * so the queue runs one at a time. Idempotent: a re-delivered job for a
 * finished audit is a no-op.
 */

import { prisma, Prisma } from "@mykavo/database";
import { runSiteAudit, DEFAULT_LIMITS } from "@mykavo/seo-audit";
import { assertSafeUrl } from "@mykavo/shared/ssrf";
import type { SiteAuditJob } from "@mykavo/shared";
import { logger } from "./logger";

export async function runSiteAuditJob(job: SiteAuditJob): Promise<void> {
  const audit = await prisma.siteAudit.findUnique({
    where: { id: job.siteAuditId },
    include: { website: { select: { id: true, url: true, workspaceId: true } } },
  });
  if (!audit) {
    logger.warn("site audit not found - skipping", { siteAuditId: job.siteAuditId });
    return;
  }
  if (audit.status === "COMPLETED" || audit.status === "FAILED") {
    logger.info("site audit already finished - skipping", { siteAuditId: audit.id });
    return;
  }

  await prisma.siteAudit.update({
    where: { id: audit.id },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    // The URL was validated at enqueue time; re-validate at execution time
    // (spec §59: the scanning environment trusts nothing).
    await assertSafeUrl(audit.website.url);
    const result = await runSiteAudit(audit.website.url, {
      ...DEFAULT_LIMITS,
      maxPages: Math.max(1, Math.min(job.maxPages, 2000)),
    });

    await prisma.siteAudit.update({
      where: { id: audit.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        pagesCrawled: result.pagesCrawled,
        urlsDiscovered: result.urlsDiscovered,
        healthScore: result.healthScore,
        errorCount: result.errorCount,
        warningCount: result.warningCount,
        noticeCount: result.noticeCount,
        pagesWithErrors: result.pagesWithErrors,
        stoppedReason: result.stoppedReason,
        issues: result.issues as unknown as Prisma.InputJsonValue,
      },
    });

    // Retention: keep the 10 most recent audits per website (free-tier DB).
    const stale = await prisma.siteAudit.findMany({
      where: { websiteId: audit.website.id },
      orderBy: { createdAt: "desc" },
      skip: 10,
      select: { id: true },
    });
    if (stale.length > 0)
      await prisma.siteAudit.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });

    logger.info("site audit completed", {
      siteAuditId: audit.id,
      websiteId: audit.website.id,
      workspaceId: audit.website.workspaceId,
      pages: result.pagesCrawled,
      healthScore: result.healthScore,
      errors: result.errorCount,
      warnings: result.warningCount,
      stoppedReason: result.stoppedReason,
    });
  } catch (err) {
    await prisma.siteAudit.update({
      where: { id: audit.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: err instanceof Error ? err.message.slice(0, 500) : String(err),
      },
    });
    logger.error("site audit failed", { siteAuditId: audit.id, websiteId: audit.website.id }, err);
  }
}
