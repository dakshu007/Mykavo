import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@fluxen/database";
import { getSession } from "@/lib/session";
import { getWorkspacePlan } from "@/lib/limits";
import { emailsMatch, isInviteUsable, WORKSPACE_COOKIE } from "@/lib/team";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ token: string }> };

/**
 * Accept a workspace invitation. The signed-in account's email must match the
 * invited email (case-insensitive) — the token alone is not enough, so a
 * forwarded invite can't be claimed by someone else. On success the caller
 * becomes a member with the invite's role and is switched to that workspace.
 */
export async function POST(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: { select: { id: true, name: true } } },
  });
  if (!invite) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  if (!isInviteUsable(invite)) {
    return NextResponse.json(
      { error: "This invitation has expired or was already used." },
      { status: 410 },
    );
  }
  if (!emailsMatch(invite.email, session.user.email)) {
    return NextResponse.json(
      { error: `This invitation was sent to ${invite.email}. Sign in with that email to accept it.` },
      { status: 403 },
    );
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId: invite.workspaceId, userId: session.user.id },
    },
    select: { id: true },
  });

  if (!existing) {
    // Re-check seats at accept time (spec §39): the plan may have been
    // downgraded since the invite went out. The pending invite itself held
    // the seat, so members < maxMembers is the right bound here.
    const plan = await getWorkspacePlan(invite.workspaceId);
    const activeMembers = await prisma.workspaceMember.count({
      where: { workspaceId: invite.workspaceId },
    });
    if (activeMembers >= plan.limits.maxMembers) {
      return NextResponse.json(
        { error: "This workspace has no free seats right now. Ask the owner to free one up." },
        { status: 403 },
      );
    }

    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: session.user.id,
          role: invite.role,
        },
      }),
      prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);
  } else {
    // Already a member (e.g. double-click): just consume the invite.
    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  }

  // Switch the accepter into their new workspace.
  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, invite.workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  logger.info("workspace invite accepted", {
    workspaceId: invite.workspaceId,
    inviteId: invite.id,
    userId: session.user.id,
    role: invite.role,
  });
  return NextResponse.json({ ok: true, workspaceId: invite.workspaceId });
}
