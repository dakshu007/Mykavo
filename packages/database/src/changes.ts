/**
 * Change-event management (spec §24, §33). Triage transitions and the
 * baseline-update flow that accepts a page's current state as the new normal.
 * Shared so the API routes and any future automation apply identical rules.
 */

import type { PrismaClient, ChangeEvent, ChangeStatus } from "@prisma/client";
import { setSnapshotAsBaseline } from "./baseline";

/** Statuses a user can still act on (an "open" change). */
export const OPEN_STATUSES: ChangeStatus[] = ["NEW", "REVIEWED"];

export type ChangeAction = "review" | "approve" | "ignore" | "resolve" | "reopen";

/**
 * The update payload for a triage action — status plus the timestamp fields
 * that status implies. Shared by the single-change PATCH and the bulk route so
 * both apply identical transitions.
 */
export function changeActionData(
  action: ChangeAction,
  now: Date = new Date(),
): Partial<Pick<ChangeEvent, "approvedAt" | "resolvedAt">> &
  Pick<ChangeEvent, "status"> {
  switch (action) {
    case "review":
      return { status: "REVIEWED" };
    case "approve":
      return { status: "APPROVED", approvedAt: now };
    case "ignore":
      return { status: "IGNORED" };
    case "resolve":
      return { status: "RESOLVED", resolvedAt: now };
    case "reopen":
      return { status: "NEW", approvedAt: null, resolvedAt: null };
  }
}

/** Apply a triage action to a single change event. Pure status transition. */
export async function applyChangeAction(
  prisma: PrismaClient,
  changeId: string,
  action: ChangeAction,
): Promise<ChangeEvent> {
  return prisma.changeEvent.update({
    where: { id: changeId },
    data: changeActionData(action),
  });
}

/**
 * Promote a page's current snapshot to its new baseline and accept every open
 * change on that page (they are now the baseline, so no longer a difference).
 * This is the "Update baseline" / "approve expected change" flow (spec §24).
 *
 * Returns the number of change events approved.
 */
export async function updateBaselineFromSnapshot(
  prisma: PrismaClient,
  params: {
    websiteId: string;
    monitoredPageId: string;
    pageSnapshotId: string;
    approvedByUserId: string;
  },
): Promise<{ baselineVersion: number; approvedChanges: number }> {
  const baseline = await setSnapshotAsBaseline(prisma, params);

  const approved = await prisma.changeEvent.updateMany({
    where: {
      monitoredPageId: params.monitoredPageId,
      status: { in: OPEN_STATUSES },
    },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  return { baselineVersion: baseline.version, approvedChanges: approved.count };
}
