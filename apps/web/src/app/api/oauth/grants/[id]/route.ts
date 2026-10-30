import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext } from "@/lib/api-auth";
import { canManageMembers } from "@/lib/team";
import { revokeGrant } from "@/lib/mcp/oauth";
import { logger } from "@/lib/logger";

/**
 * Disconnect an AI assistant from the dashboard. The person who connected
 * it can always disconnect it; owners and admins can disconnect anyone's.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const grant = await prisma.oAuthGrant.findFirst({
    where: { id, workspaceId: ctx.workspace.id, revokedAt: null },
    select: { id: true, userId: true },
  });
  if (!grant) return NextResponse.json({ error: "That connection doesn't exist." }, { status: 404 });
  if (grant.userId !== ctx.userId && !canManageMembers(ctx.role)) {
    return NextResponse.json({ error: "Only the person who connected it, or a workspace admin, can disconnect it." }, { status: 403 });
  }
  await revokeGrant(grant.id);
  logger.info("oauth connection revoked", { workspaceId: ctx.workspace.id, grantId: grant.id, userId: ctx.userId });
  return NextResponse.json({ ok: true });
}
