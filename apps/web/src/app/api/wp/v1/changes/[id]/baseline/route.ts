import { NextResponse } from "next/server";
import { prisma, updateBaselineFromSnapshot } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

/**
 * Accept the page as it looks now: promote the change's current snapshot to
 * the ACTIVE baseline and approve every open change on that page - exactly
 * what the dashboard's "Update baseline" does.
 */
export async function POST(request: Request, { params }: Params) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();

  const { id } = await params;
  const change = await prisma.changeEvent.findFirst({
    where: { id, websiteId: ctx.website.id },
    select: {
      websiteId: true,
      monitoredPageId: true,
      currentSnapshotId: true,
      currentSnapshot: { select: { errorCode: true } },
    },
  });
  if (!change) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!change.monitoredPageId) {
    return NextResponse.json(
      { error: "Site-wide changes have no page baseline to update. Mark it reviewed instead." },
      { status: 400 },
    );
  }
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
    // The member who approved the connection, or the workspace owner if they
    // have since left - baselines always record a person.
    approvedByUserId: ctx.actingUserId ?? ctx.workspaceOwnerId,
  });

  logger.info("baseline updated from wordpress", {
    workspaceId: ctx.workspaceId,
    changeId: id,
    connectionId: ctx.connectionId,
    baselineVersion: result.baselineVersion,
  });
  return NextResponse.json(result);
}
