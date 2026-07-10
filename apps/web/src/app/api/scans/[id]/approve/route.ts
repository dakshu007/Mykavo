import { NextResponse } from "next/server";
import { prisma, updateBaselineFromSnapshot } from "@fluxen/database";
import { getApiContext, requireRole } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

/**
 * Approve an entire scan (spec §24): for every page in the scan that produced
 * a successful snapshot, promote that snapshot to the new baseline and approve
 * the page's open changes. Use after an intentional site-wide change.
 */
export async function POST(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  const { id } = await params;
  const scan = await prisma.scan.findFirst({
    where: { id, website: { workspaceId: ctx.workspace.id } },
    select: { id: true, websiteId: true },
  });
  if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only pages that actually have an open change need re-baselining.
  // Site-wide changes (monitoredPageId null) have no baseline to move.
  const changedPages = await prisma.changeEvent.findMany({
    where: {
      scanId: id,
      status: { in: ["NEW", "REVIEWED"] },
      currentSnapshotId: { not: null },
      monitoredPageId: { not: null },
    },
    select: { monitoredPageId: true, currentSnapshotId: true },
    distinct: ["monitoredPageId"],
  });

  let pagesBaselined = 0;
  let approvedChanges = 0;
  for (const page of changedPages) {
    if (!page.currentSnapshotId || !page.monitoredPageId) continue;
    const result = await updateBaselineFromSnapshot(prisma, {
      websiteId: scan.websiteId,
      monitoredPageId: page.monitoredPageId,
      pageSnapshotId: page.currentSnapshotId,
      approvedByUserId: ctx.userId,
    });
    pagesBaselined++;
    approvedChanges += result.approvedChanges;
  }

  logger.info("scan approved", {
    workspaceId: ctx.workspace.id,
    scanId: id,
    pagesBaselined,
    approvedChanges,
  });
  return NextResponse.json({ pagesBaselined, approvedChanges });
}
