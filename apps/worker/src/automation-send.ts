/**
 * Sending one automated email, and reading what optional email an account
 * already got. Optional (unsubscribable) email goes through the promotional
 * provider - Brevo once configured - and everything else through Resend. Shared by the lifecycle series and the Automation Tool's
 * flow engine, so both record sends the same way and both respect the same
 * one-optional-email-a-day spacing.
 */

import { prisma, recordAutomationSend } from "@mykavo/database";
import {
  LIFECYCLE_KEYS,
  LIFECYCLE_SUBJECT_PREFIXES,
  lifecycleHeaders,
  sendEmail,
  sendMarketingEmail,
} from "@mykavo/email";
import type { Automations } from "./automation-settings";
import { appBase } from "./automation-data";

type Mail = { subject: string; html: string; text: string };

export interface OptionalSend {
  /** Send-log key: a built-in key, or flow:<flowId>:<stepId>. Null before the log existed. */
  key: string | null;
  subject: string;
  sentAt: Date | null;
}

/**
 * Optional (unsubscribable) emails already sent to a workspace: the
 * lifecycle series and every flow's custom emails.
 */
export async function optionalHistory(workspaceId: string, a: Automations): Promise<OptionalSend[]> {
  const legacy = LIFECYCLE_SUBJECT_PREFIXES.map((p) => ({ subject: { startsWith: p } }));
  const base = { workspaceId, channelType: "EMAIL" as const, status: "SENT" as const };
  if (!a.ready) {
    const rows = await prisma.notification.findMany({ where: { ...base, OR: legacy }, select: { subject: true, sentAt: true } });
    return rows.map((r) => ({ ...r, key: null }));
  }
  const rows = await prisma.notification.findMany({
    where: {
      ...base,
      OR: [
        ...legacy,
        { automationSend: { is: { automationKey: { in: LIFECYCLE_KEYS }, isTest: false } } },
        { automationSend: { is: { automationKey: { startsWith: "flow:" }, isTest: false } } },
      ],
    },
    select: { subject: true, sentAt: true, automationSend: { select: { automationKey: true, isTest: true } } },
  });
  return rows.map((r) => ({
    subject: r.subject,
    sentAt: r.sentAt,
    key: r.automationSend && !r.automationSend.isTest ? r.automationSend.automationKey : null,
  }));
}

export function lastSentAt(history: OptionalSend[]): Date | null {
  return history.reduce<Date | null>((m, h) => (h.sentAt && (!m || h.sentAt > m) ? h.sentAt : m), null);
}

/**
 * Record, render, send, and record the outcome. The Notification row and
 * its send-log entry are written together before sending: a row the log
 * does not know about could not be recognised as sent on the next run, and
 * an unsubscribable email needs the row's id for its unsubscribe link.
 */
export async function sendAutomatedEmail(input: {
  workspaceId: string;
  to: string;
  key: string;
  unsubscribable: boolean;
  a: Automations;
  render: (unsubscribeUrl: string) => Mail;
}): Promise<{ ok: boolean; notificationId: string; error?: string }> {
  // The subject never depends on the unsubscribe link, so render once to
  // learn it, record the row, then render with the row's own link.
  const draft = input.render("");
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.notification.create({
      data: { workspaceId: input.workspaceId, channelType: "EMAIL", recipient: input.to, subject: draft.subject, status: "PENDING" },
      select: { id: true },
    });
    await recordAutomationSend(tx, { notificationId: created.id, automationKey: input.key }, input.a.ready);
    return created;
  });
  const mail = input.unsubscribable ? input.render(`${appBase}/unsubscribe?n=${row.id}`) : draft;
  const message = {
    to: [input.to],
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    headers: input.unsubscribable ? lifecycleHeaders(`${appBase}/api/email/unsubscribe?n=${row.id}`) : undefined,
  };
  // Optional mail goes out on the promotional stream (Brevo when set up);
  // anything an account needs stays on Resend.
  const result = input.unsubscribable
    ? await sendMarketingEmail(message, [input.key.startsWith("flow:") ? "flow" : "lifecycle"])
    : await sendEmail(message);
  await prisma.notification.update({
    where: { id: row.id },
    data: { status: result.ok ? "SENT" : "FAILED", sentAt: result.ok ? new Date() : null, errorMessage: result.error ?? null },
  });
  return { ok: result.ok, notificationId: row.id, error: result.error };
}
