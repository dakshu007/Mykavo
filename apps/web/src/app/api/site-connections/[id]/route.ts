import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext, requireRole } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

/** Disconnect a WordPress site from the MyKavo side: its token stops working now. */
export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN");
  if (denied) return denied;

  const { id } = await params;
  const result = await prisma.siteConnection.updateMany({
    where: { id, workspaceId: ctx.workspace.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  logger.info("site connection revoked from dashboard", {
    workspaceId: ctx.workspace.id,
    connectionId: id,
  });
  return NextResponse.json({ ok: true });
}
