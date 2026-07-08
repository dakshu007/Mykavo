/**
 * Baseline lifecycle (spec §4, §14, §24). Shared by the worker (auto-create
 * on the first baseline scan) and the web app (approve a later snapshot as a
 * new baseline). All mutations run in a transaction so the "exactly one
 * ACTIVE baseline per monitored page" invariant holds even under retries.
 */

import type { PrismaClient, Baseline } from "@prisma/client";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Promote a page snapshot to the ACTIVE baseline for its monitored page.
 * Supersedes the current ACTIVE baseline (if any) and assigns the next
 * version number. Idempotent: if the snapshot is already the ACTIVE
 * baseline, returns it unchanged.
 *
 * `approvedByUserId` is null for the system-created initial baseline and set
 * to the acting user for later manual approvals.
 */
export async function setSnapshotAsBaseline(
  prisma: PrismaClient,
  params: {
    websiteId: string;
    monitoredPageId: string;
    pageSnapshotId: string;
    approvedByUserId: string | null;
  },
): Promise<Baseline> {
  const { websiteId, monitoredPageId, pageSnapshotId, approvedByUserId } = params;

  return prisma.$transaction(async (tx: Tx) => {
    const current = await tx.baseline.findFirst({
      where: { monitoredPageId, status: "ACTIVE" },
    });

    if (current?.pageSnapshotId === pageSnapshotId) {
      return current; // already the active baseline — nothing to do
    }

    if (current) {
      await tx.baseline.update({
        where: { id: current.id },
        data: { status: "SUPERSEDED" },
      });
    }

    const latest = await tx.baseline.findFirst({
      where: { monitoredPageId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    return tx.baseline.create({
      data: {
        websiteId,
        monitoredPageId,
        pageSnapshotId,
        version: nextVersion,
        status: "ACTIVE",
        approvedByUserId,
        approvedAt: new Date(),
      },
    });
  });
}

/**
 * Create initial baselines for a completed baseline scan: one ACTIVE
 * baseline per page that produced a successful snapshot and does not yet
 * have any baseline. Returns the number of baselines created.
 */
export async function createInitialBaselinesForScan(
  prisma: PrismaClient,
  scanId: string,
): Promise<number> {
  const snapshots = await prisma.pageSnapshot.findMany({
    where: { scanId, errorCode: null },
    select: { id: true, monitoredPageId: true, websiteId: true },
  });

  let created = 0;
  for (const snapshot of snapshots) {
    const existing = await prisma.baseline.findFirst({
      where: { monitoredPageId: snapshot.monitoredPageId },
      select: { id: true },
    });
    if (existing) continue;

    await setSnapshotAsBaseline(prisma, {
      websiteId: snapshot.websiteId,
      monitoredPageId: snapshot.monitoredPageId,
      pageSnapshotId: snapshot.id,
      approvedByUserId: null,
    });
    created++;
  }
  return created;
}
