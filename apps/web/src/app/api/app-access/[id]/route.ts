import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { sendEmail, appAccessApprovedEmail } from "@mykavo/email";
import { decideAppAccess, displayPersonName } from "@mykavo/shared";
import { getSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { rateLimit } from "@/lib/security/rate-limit";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Approve or decline one Android app request. Operator only.
 *
 * 404 rather than 403 for a non-admin, matching every other admin route:
 * whether this installation has an approval queue is not a customer's
 * business.
 *
 * The decision and the email are deliberately NOT in one transaction. A
 * transaction spanning an HTTP call to a mail provider holds a database row
 * lock for the length of somebody else's outage; and of the two possible
 * failures, "approved but the email did not send" is recoverable - the
 * operator sees `emailSent: false` in the queue and clicks again - while
 * "email sent but the approval rolled back" leaves somebody holding a link
 * that shows them nothing. So the row is written first and the send follows.
 */

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ action: z.enum(["approve", "decline"]) });

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPlatformAdmin(session.user.email)) {
    logger.warn("non-admin tried to decide an app access request", {
      userId: session.user.id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rl = rateLimit(`app-access-decide:${session.user.id}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Slow down a moment." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const { id } = await params;
  const existing = await prisma.appAccessRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = parsed.data.action === "approve" ? "APPROVED" : "DECLINED";
  const outcome = decideAppAccess({ status: existing.status, next });
  if (!outcome.apply) {
    // Already in that state - the operator clicked twice. Report success
    // without re-sending anything.
    return NextResponse.json({ request: { id, status: existing.status }, emailSent: false });
  }

  const updated = await prisma.appAccessRequest.update({
    where: { id },
    data: {
      status: next,
      decidedAt: new Date(),
      decidedByUserId: session.user.id,
    },
  });

  let emailSent = false;
  if (outcome.sendEmail) {
    const base = (env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");
    // ?download=1 makes the dashboard page start the download by itself.
    // Signed out, requireSession sends them to /login?next=<this>, and they
    // come straight back here once they are in.
    const downloadUrl = `${base}/dashboard/app?download=1`;
    const mail = appAccessApprovedEmail({
      name: displayPersonName(updated.name, updated.email),
      downloadUrl,
      email: updated.email,
    });
    const result = await sendEmail({
      to: [updated.email],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    emailSent = result.ok;

    await prisma.notification.create({
      data: {
        // The operator's own workspace: this is a platform email, not one
        // about a customer's website, and Notification requires a workspace.
        workspaceId: (
          await prisma.workspaceMember.findFirstOrThrow({
            where: { userId: session.user.id },
            orderBy: { createdAt: "asc" },
            select: { workspaceId: true },
          })
        ).workspaceId,
        channelType: "EMAIL",
        recipient: updated.email,
        subject: mail.subject,
        status: result.ok ? "SENT" : "FAILED",
        sentAt: result.ok ? new Date() : null,
        errorMessage: result.error ?? null,
      },
    });

    if (result.ok) {
      await prisma.appAccessRequest.update({
        where: { id },
        data: { approvalEmailSentAt: new Date() },
      });
    } else {
      logger.error("app access approval email failed", {
        requestId: id,
        error: result.error,
      });
    }
  }

  logger.info("app access decided", {
    requestId: id,
    status: next,
    decidedBy: session.user.id,
    emailSent,
  });
  return NextResponse.json({ request: { id, status: next }, emailSent });
}
