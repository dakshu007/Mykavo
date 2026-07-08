import { NextResponse } from "next/server";
import { prisma, updateBaselineFromSnapshot } from "@fluxen/database";
import { getApiContext } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

/**
 * Accept a page's current state as the new baseline (spec §24). Promotes the
 * change's current snapshot to the ACTIVE baseline and approves every open
 * change on that page.
 */
export async function POST(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const change = await prisma.changeEvent.findFirst({
    where: { id, website: { workspaceId: ctx.workspace.id } },
    select: {
      websiteId: true,
      monitoredPageId: true,
      currentSnapshotId: true,
      currentSnapshot: { select: { errorCode: true } },
    },
  });
  if (!change) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!change.currentSnapshotId || change.currentSnapshot?.errorCode) {
    return NextResponse.json(
      { error: "This change has no successful snapshot to use as a baseline." },
      { status: 400 },
    );
  }

  const result = await updateBaselineFromSnapshot(prisma, {
    websiteId: change.websiteId,
    monitoredPageId: change.monitoredPageId,
    pageSnapshotId: change.currentSnapshotId,
    approvedByUserId: ctx.userId,
  });

  logger.info("baseline updated from change", {
    workspaceId: ctx.workspace.id,
    changeId: id,
    baselineVersion: result.baselineVersion,
    approvedChanges: result.approvedChanges,
  });
  return NextResponse.json(result);
}
