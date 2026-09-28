import { NextResponse } from "next/server";
import { prisma, recordAutomationSend } from "@mykavo/database";
import { AUTOMATIONS, lifecycleHeaders, sendEmail, sendMarketingEmail, validateSettings } from "@mykavo/email";
import { displayPersonName } from "@mykavo/shared";
import { automationRequest, readJson } from "@/lib/automations-api";
import { appBase, loadSettings, renderPreview } from "@/lib/automations-admin";
import { logger } from "@/lib/logger";

/**
 * Send the email, as the editor currently has it, to the signed-in admin -
 * and only to them: there is no recipient field, so this cannot become a
 * way to mail customers by hand. The subject starts with "[Test]" and the
 * send is logged as a test, so it never counts as the real email having
 * gone out, and never stops the admin's own account from getting it.
 */

type Params = { params: Promise<{ key: string }> };

export async function POST(request: Request, { params }: Params) {
  const req = await automationRequest(params, "test", 5);
  if (!req.ok) return req.response;
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { ready, settings } = await loadSettings();
  const result = validateSettings(req.key, body, settings);
  if (!result.ok) return NextResponse.json({ error: "Check the highlighted fields.", errors: result.errors }, { status: 400 });

  const mail = renderPreview(req.key, settings, result.settings, displayPersonName(req.name, req.email));
  const subject = `[Test] ${mail.subject}`;
  const unsubscribable = AUTOMATIONS[req.key].unsubscribable;
  const message = {
    to: [req.email],
    subject,
    html: mail.html,
    text: mail.text,
    // The sample unsubscribe link does nothing; the header is here so the
    // test looks exactly like the real email in the inbox.
    headers: unsubscribable ? lifecycleHeaders(`${appBase}/api/email/unsubscribe?n=preview`) : undefined,
  };
  // Through the same provider the real email uses (Brevo for optional mail).
  const sent = unsubscribable ? await sendMarketingEmail(message, ["test"]) : await sendEmail(message);

  // Recorded so it counts against the email budget like any other send.
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: req.userId },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });
  if (member) {
    const row = await prisma.notification.create({
      select: { id: true },
      data: {
        workspaceId: member.workspaceId,
        channelType: "EMAIL",
        recipient: req.email,
        subject,
        status: sent.ok ? "SENT" : "FAILED",
        sentAt: sent.ok ? new Date() : null,
        errorMessage: sent.error ?? null,
      },
    });
    await recordAutomationSend(prisma, { notificationId: row.id, automationKey: req.key, isTest: true }, ready);
  }

  if (!sent.ok) {
    logger.warn("automation test send failed", { userId: req.userId, automation: req.key, error: sent.error });
    return NextResponse.json({ error: sent.error ?? "The email provider refused the message." }, { status: 502 });
  }
  return NextResponse.json({ sentTo: req.email });
}
