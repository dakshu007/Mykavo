import { NextResponse } from "next/server";
import { prisma, setSnapshotAsBaseline } from "@fluxen/database";
import { getApiContext } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

/** Approve a page snapshot as the new ACTIVE baseline for its monitored page. */
export async function POST(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Only snapshots belonging to the caller's workspace, and only successful
  // ones (a failed snapshot has no captured state to baseline).
  const snapshot = await prisma.pageSnapshot.findFirst({
    where: { id, scan: { website: { workspaceId: ctx.workspace.id } } },
    select: {
      id: true,
      websiteId: true,
      monitoredPageId: true,
      errorCode: true,
    },
  });
  if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (snapshot.errorCode) {
    return NextResponse.json(
      { error: "This page failed to scan and can't be used as a baseline." },
      { status: 400 },
    );
  }

  const baseline = await setSnapshotAsBaseline(prisma, {
    websiteId: snapshot.websiteId,
    monitoredPageId: snapshot.monitoredPageId,
    pageSnapshotId: snapshot.id,
    approvedByUserId: ctx.userId,
  });

  logger.info("baseline updated", {
    workspaceId: ctx.workspace.id,
    websiteId: snapshot.websiteId,
    monitoredPageId: snapshot.monitoredPageId,
    baselineVersion: baseline.version,
  });
  return NextResponse.json({ baseline });
}
