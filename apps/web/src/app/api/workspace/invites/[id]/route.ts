import { NextResponse } from "next/server";
import { prisma } from "@fluxen/database";
import { getApiContext, requireRole } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

/** Revoke a pending workspace invitation (OWNER/ADMIN). */
export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN");
  if (denied) return denied;

  const { id } = await params;
  // Scoped to the caller's workspace; accepted invites are history, not revocable.
  const invite = await prisma.workspaceInvite.findFirst({
    where: { id, workspaceId: ctx.workspace.id, acceptedAt: null },
    select: { id: true },
  });
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workspaceInvite.delete({ where: { id: invite.id } });
  logger.info("workspace invite revoked", {
    workspaceId: ctx.workspace.id,
    inviteId: invite.id,
  });
  return NextResponse.json({ ok: true });
}
