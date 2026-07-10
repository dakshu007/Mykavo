import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@fluxen/database";
import { getApiContext, requireRole } from "@/lib/api-auth";
import { canRemoveMember } from "@/lib/team";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

const roleSchema = z.object({
  // The OWNER role is never assignable — one owner per workspace.
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

/** Change a member's role (OWNER only; the owner's own row is immutable). */
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER");
  if (denied) return denied;

  const { id } = await params;
  const member = await prisma.workspaceMember.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    select: { id: true, role: true },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (member.role === "OWNER") {
    return NextResponse.json(
      { error: "The owner's role can't be changed." },
      { status: 403 },
    );
  }

  let body: z.infer<typeof roleSchema>;
  try {
    body = roleSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Pick a role: Admin, Member, or Viewer." },
      { status: 400 },
    );
  }

  const updated = await prisma.workspaceMember.update({
    where: { id: member.id },
    data: { role: body.role },
  });
  logger.info("workspace member role changed", {
    workspaceId: ctx.workspace.id,
    memberId: member.id,
    role: body.role,
  });
  return NextResponse.json({ member: { id: updated.id, role: updated.role } });
}

/**
 * Remove a member (OWNER/ADMIN). Nobody can remove the OWNER, and an ADMIN
 * cannot remove a fellow ADMIN — only the owner can (see canRemoveMember).
 */
export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN");
  if (denied) return denied;

  const { id } = await params;
  const member = await prisma.workspaceMember.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    select: { id: true, role: true, userId: true },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canRemoveMember(ctx.role, member.role)) {
    const message =
      member.role === "OWNER"
        ? "The workspace owner can't be removed."
        : "Only the workspace owner can remove an admin.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  await prisma.workspaceMember.delete({ where: { id: member.id } });
  logger.info("workspace member removed", {
    workspaceId: ctx.workspace.id,
    memberId: member.id,
    removedUserId: member.userId,
  });
  return NextResponse.json({ ok: true });
}
