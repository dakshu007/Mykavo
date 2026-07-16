/**
 * Weekly Lighthouse audit sweep. Runs on a pg-boss cron every AUDIT_CRON
 * (default Tuesday 06:00 UTC): for every ACTIVE website, create one QUEUED
 * PerformanceAudit row for the homepage and enqueue the existing
 * LIGHTHOUSE_AUDIT job - hands-off performance monitoring so the drop alert
 * (lighthouse-audit.ts) has a fresh score to compare every week. No Lighthouse
 * logic lives here; this module only creates rows and enqueues jobs.
 */

import type { PgBoss } from "pg-boss";
import { prisma } from "@mykavo/database";
import { LIGHTHOUSE_AUDIT_QUEUE, type LighthouseAuditJob } from "@mykavo/shared";
import { logger } from "./logger";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Skip websites audited (or queued) within this window - keeps the sweep
 * idempotent across restarts and avoids doubling up with a manual audit the
 * user ran days earlier.
 */
const RECENT_AUDIT_WINDOW_MS = 5 * DAY_MS;

/**
 * Seconds between each enqueued job's earliest start. Audits already process
 * serially (batchSize 1); the stagger just spreads the CPU-heavy Chrome runs
 * instead of stacking the whole backlog the moment the cron fires.
 */
const STAGGER_SECONDS = 60;

/** Enqueue a weekly homepage audit for every eligible ACTIVE website. */
export async function runAuditSweep(boss: PgBoss): Promise<void> {
  const websites = await prisma.website.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, url: true, workspaceId: true },
    orderBy: { createdAt: "asc" },
  });
  if (websites.length === 0) {
    logger.info("audit sweep finished", { websites: 0, enqueued: 0, skipped: 0, failures: 0 });
    return;
  }

  const freshSince = new Date(Date.now() - RECENT_AUDIT_WINDOW_MS);
  let enqueued = 0;
  let skipped = 0;
  let failures = 0;

  for (const website of websites) {
    try {
      // Any audit created in the window - manual, scheduled, even a failed
      // one - counts. Re-running a failed audit right away would likely fail
      // again; the next weekly sweep retries naturally.
      const recent = await prisma.performanceAudit.findFirst({
        where: { websiteId: website.id, createdAt: { gte: freshSince } },
        select: { id: true },
      });
      if (recent) {
        skipped++;
        continue;
      }

      // Mirror the web audit route (no path → homepage): the row's url is the
      // website URL exactly as stored, status QUEUED, completed by the worker.
      const audit = await prisma.performanceAudit.create({
        data: { websiteId: website.id, url: website.url, status: "QUEUED" },
      });
      const job: LighthouseAuditJob = { auditId: audit.id };
      await boss.send(LIGHTHOUSE_AUDIT_QUEUE, { ...job }, { startAfter: enqueued * STAGGER_SECONDS });
      enqueued++;
    } catch (err) {
      failures++;
      logger.error(
        "audit sweep failed for website",
        { websiteId: website.id, workspaceId: website.workspaceId },
        err as Error,
      );
    }
  }

  logger.info("audit sweep finished", {
    websites: websites.length,
    enqueued,
    skipped,
    failures,
  });
}
