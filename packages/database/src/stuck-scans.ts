/**
 * Stuck-scan recovery (spec §40: the scheduler must "recover safely from
 * failures"). A scan row stuck in QUEUED/RUNNING is poison: the dashboard
 * shows "scan in progress" forever, the manual-scan API answers 409, and the
 * scheduler's no-double-scan guard skips the website - with no user-visible
 * way out. It happens whenever the queue loses the job: the worker down long
 * enough for the job to expire past its retries, a lost enqueue, a mid-scan
 * crash, or queue rows aging past pg-boss retention.
 *
 * `failStuckScans` marks such scans FAILED once they exceed a generous age
 * bound (far beyond any legitimate scan lifetime including pg-boss retries)
 * and flips websites left in BASELINING to ERROR so monitoring state stays
 * honest. Race safety:
 * - A QUEUED scan is only failed when NO live pg-boss job references it, so
 *   a backlogged-but-about-to-run scan is never sacrificed after a worker
 *   restart.
 * - The status flip is a guarded updateMany; and if a zombie job fires later
 *   anyway, the worker either skips finished scans or - for an attempt that
 *   was genuinely still running - overwrites FAILED with the real terminal
 *   status, so a rare false positive self-heals.
 */

import { Prisma, type PrismaClient } from "@prisma/client";

type Db = PrismaClient;

/** Past this age a QUEUED/RUNNING scan is considered abandoned. pg-boss gives
 *  a scan job at most ~46 minutes of legitimate life (15-minute expiry x 3
 *  attempts + retry delays), so 60 minutes is safely beyond any real scan. */
export const STUCK_SCAN_MINUTES = 60;

export interface StuckScanRecovery {
  scanId: string;
  websiteId: string;
  triggerType: string;
  previousStatus: "QUEUED" | "RUNNING";
}

/** True if a queue job for this scan still exists in a runnable state. Runs
 *  inside the worker, where boss.start() has already created the pgboss
 *  schema; an error here is treated as "no live job" (the guarded update plus
 *  the worker's own terminal writes bound the damage of a wrong answer). */
async function hasLiveQueueJob(db: Db, queueName: string, scanId: string): Promise<boolean> {
  try {
    const rows = await db.$queryRaw<{ id: string }[]>(
      Prisma.sql`
        SELECT id FROM pgboss.job
        WHERE name = ${queueName}
          AND state IN ('created', 'retry', 'active')
          AND data->>'scanId' = ${scanId}
        LIMIT 1
      `,
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Fail scans stuck in QUEUED/RUNNING beyond the age bound. Returns the scans
 * recovered so the caller can log them. Safe to run concurrently and often.
 */
export async function failStuckScans(
  db: Db,
  params: { queueName: string; now?: Date; stuckAfterMinutes?: number; limit?: number } = {
    queueName: "scan-website",
  },
): Promise<StuckScanRecovery[]> {
  const now = params.now ?? new Date();
  const minutes = params.stuckAfterMinutes ?? STUCK_SCAN_MINUTES;
  const cutoff = new Date(now.getTime() - minutes * 60_000);

  const stuck = await db.scan.findMany({
    where: {
      OR: [
        { status: "QUEUED", createdAt: { lt: cutoff } },
        { status: "RUNNING", startedAt: { lt: cutoff } },
        // RUNNING always sets startedAt, but guard the impossible row too.
        { status: "RUNNING", startedAt: null, createdAt: { lt: cutoff } },
      ],
    },
    select: { id: true, websiteId: true, triggerType: true, status: true },
    orderBy: { createdAt: "asc" },
    take: params.limit ?? 100,
  });

  const recovered: StuckScanRecovery[] = [];
  for (const scan of stuck) {
    // A queued scan whose job is still waiting in the queue (e.g. right after
    // a worker outage ends) will run momentarily - leave it alone.
    if (scan.status === "QUEUED" && (await hasLiveQueueJob(db, params.queueName, scan.id))) {
      continue;
    }

    const claim = await db.scan.updateMany({
      where: { id: scan.id, status: scan.status },
      data: {
        status: "FAILED",
        completedAt: now,
        errorCode: scan.status === "QUEUED" ? "STUCK_QUEUED" : "STUCK_RUNNING",
        errorMessage:
          "The scan never finished because the scan worker was unavailable. Run the scan again.",
      },
    });
    if (claim.count !== 1) continue;

    // A baseline scan abandoned mid-run leaves the website in BASELINING,
    // which reads as "in progress" forever. ERROR is the honest state and
    // keeps the run-scan button available.
    if (scan.triggerType === "BASELINE") {
      await db.website.updateMany({
        where: { id: scan.websiteId, status: "BASELINING" },
        data: { status: "ERROR" },
      });
    }

    recovered.push({
      scanId: scan.id,
      websiteId: scan.websiteId,
      triggerType: scan.triggerType,
      previousStatus: scan.status as "QUEUED" | "RUNNING",
    });
  }
  return recovered;
}
