/**
 * Central scheduler sweep (spec §40). Runs on a pg-boss cron (no per-website
 * cron jobs). Finds ACTIVE websites whose nextScanAt has passed, claims each
 * with a guarded update (DB-level lock against concurrent sweeps), and
 * enqueues a SCHEDULED scan. Idempotent and safe to run frequently.
 */

import type { PgBoss } from "pg-boss";
import { prisma, failStuckScans } from "@mykavo/database";
import { SCAN_WEBSITE_QUEUE, computeNextScanAt, type ScanFrequency } from "@mykavo/shared";
import { logger } from "./logger";

const MAX_PER_SWEEP = 50;

export async function runSchedulerSweep(boss: PgBoss): Promise<number> {
  const now = new Date();

  // Recovery first (spec §40: recover safely from failures): scans stuck in
  // QUEUED/RUNNING - e.g. after a worker outage outlived the job's retries -
  // otherwise pin "scan in progress" in the dashboard, 409 the manual-scan
  // API, and make the no-double-scan guard below skip the website forever.
  try {
    const recovered = await failStuckScans(prisma, { queueName: SCAN_WEBSITE_QUEUE, now });
    for (const scan of recovered) {
      logger.warn("stuck scan failed by recovery sweep", { ...scan });
    }
  } catch (err) {
    logger.error("stuck-scan recovery failed", {}, err);
  }

  // Same recovery for site audits: a QUEUED/RUNNING audit older than 45 min
  // is dead (job lifetime is ~35 min worst case) - fail it so the dashboard
  // card and the run button unstick. A zombie job firing later is a no-op
  // (runSiteAuditJob skips finished audits).
  try {
    const cutoff = new Date(now.getTime() - 45 * 60 * 1000);
    const stuckAudits = await prisma.siteAudit.updateMany({
      where: { status: { in: ["QUEUED", "RUNNING"] }, createdAt: { lt: cutoff } },
      data: {
        status: "FAILED",
        completedAt: now,
        errorMessage: "The audit worker was unavailable. Run the audit again.",
      },
    });
    if (stuckAudits.count > 0)
      logger.warn("stuck site audits failed by recovery sweep", { count: stuckAudits.count });
  } catch (err) {
    logger.error("stuck-audit recovery failed", {}, err);
  }

  const due = await prisma.website.findMany({
    where: {
      status: "ACTIVE",
      nextScanAt: { lte: now },
      monitoredPages: { some: { enabled: true } },
    },
    select: { id: true, scanFrequency: true, workspaceId: true },
    take: MAX_PER_SWEEP,
    orderBy: { nextScanAt: "asc" },
  });

  let enqueued = 0;
  for (const website of due) {
    const next = computeNextScanAt(website.scanFrequency as ScanFrequency, now);

    // Claim: only proceed if THIS update advances nextScanAt. Under READ
    // COMMITTED a concurrent sweep re-reads the row post-commit and its guard
    // (nextScanAt <= now) no longer matches, so exactly one sweep claims it.
    const claim = await prisma.website.updateMany({
      where: { id: website.id, status: "ACTIVE", nextScanAt: { lte: now } },
      data: { nextScanAt: next },
    });
    if (claim.count !== 1) continue;

    // Never double-scan: skip if a scan is already queued or running.
    const active = await prisma.scan.findFirst({
      where: { websiteId: website.id, status: { in: ["QUEUED", "RUNNING"] } },
      select: { id: true },
    });
    if (active) continue;

    const scan = await prisma.scan.create({
      data: { websiteId: website.id, triggerType: "SCHEDULED", status: "QUEUED" },
    });
    await boss.send(SCAN_WEBSITE_QUEUE, { scanId: scan.id });
    enqueued++;
    logger.info("scheduled scan enqueued", {
      websiteId: website.id,
      workspaceId: website.workspaceId,
      scanId: scan.id,
      nextScanAt: next.toISOString(),
    });
  }

  if (enqueued > 0 || due.length > 0) {
    logger.info("scheduler sweep completed", { due: due.length, enqueued });
  }
  return enqueued;
}
