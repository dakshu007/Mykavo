import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getCurrentMembership, requireSession } from "@/lib/session";
import { canManageMembers } from "@/lib/team";
import { logger } from "@/lib/logger";

/** Revoke an API key. It stops working immediately and cannot be restored. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  if (!canManageMembers(role)) {
    return NextResponse.json({ error: "Only workspace owners and admins can manage API keys." }, { status: 403 });
  }
  const { id } = await params;
  const result = await prisma.apiKey.updateMany({
    where: { id, workspaceId: workspace.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) return NextResponse.json({ error: "Key not found." }, { status: 404 });
  logger.info("api key revoked", { workspaceId: workspace.id, keyId: id, userId: session.user.id });
  return NextResponse.json({ ok: true });
}
