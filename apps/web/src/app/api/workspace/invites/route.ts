import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@fluxen/database";
import { sendEmail, workspaceInviteEmail } from "@fluxen/email";
import { getApiContext, requireRole } from "@/lib/api-auth";
import { assertCanInviteMember, LimitError } from "@/lib/limits";
import { rateLimit } from "@/lib/security/rate-limit";
import { emailsMatch, INVITE_TTL_DAYS, inviteExpiry, isInviteUsable } from "@/lib/team";
import { appBaseUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  // OWNER is never invitable — a workspace has exactly one owner.
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

function roleLabel(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

/** Invite a teammate into the current workspace (OWNER/ADMIN, Pro seats). */
export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN");
  if (denied) return denied;

  // Invites send email — cap per workspace to prevent spam.
  const rl = rateLimit(`invite:${ctx.workspace.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many invitations at once. Please wait a moment." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  let input: z.infer<typeof createSchema>;
  try {
    input = createSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Enter a valid email and pick a role (Admin, Member, or Viewer)." },
      { status: 400 },
    );
  }

  if (emailsMatch(input.email, ctx.userEmail)) {
    return NextResponse.json(
      { error: "You're already in this workspace." },
      { status: 409 },
    );
  }

  // Already a member? (Match on the user's account email.)
  const existingMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: ctx.workspace.id, user: { email: input.email } },
    select: { id: true },
  });
  if (existingMember) {
    return NextResponse.json(
      { error: "That person is already a member of this workspace." },
      { status: 409 },
    );
  }

  // One live invite per email: still-valid → 409; expired → re-issue below.
  const pending = await prisma.workspaceInvite.findFirst({
    where: { workspaceId: ctx.workspace.id, email: input.email, acceptedAt: null },
  });
  if (pending && isInviteUsable(pending)) {
    return NextResponse.json(
      { error: "That person already has a pending invitation." },
      { status: 409 },
    );
  }

  try {
    await assertCanInviteMember(ctx.workspace.id);
  } catch (err) {
    if (err instanceof LimitError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
    }
    throw err;
  }

  const token = randomBytes(24).toString("base64url");
  const data = {
    email: input.email,
    role: input.role,
    token,
    invitedById: ctx.userId,
    expiresAt: inviteExpiry(),
  };
  const invite = pending
    ? await prisma.workspaceInvite.update({ where: { id: pending.id }, data })
    : await prisma.workspaceInvite.create({
        data: { workspaceId: ctx.workspace.id, ...data },
      });

  const acceptUrl = `${appBaseUrl()}/invite/${token}`;
  const inviterName = (await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { name: true },
  }))?.name ?? "A teammate";

  const message = workspaceInviteEmail({
    inviterName,
    workspaceName: ctx.workspace.name,
    roleLabel: roleLabel(invite.role),
    acceptUrl,
    expiresInDays: INVITE_TTL_DAYS,
  });
  const sent = await sendEmail({
    to: [invite.email],
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  if (!sent.ok) {
    logger.warn("invite email failed", {
      workspaceId: ctx.workspace.id,
      inviteId: invite.id,
      error: sent.error,
    });
  }

  logger.info("workspace invite created", {
    workspaceId: ctx.workspace.id,
    inviteId: invite.id,
    role: invite.role,
    emailSent: sent.ok,
  });
  return NextResponse.json(
    {
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
      // Managers get the link too — useful when email delivery is unavailable.
      acceptUrl,
      emailSent: sent.ok,
    },
    { status: 201 },
  );
}
