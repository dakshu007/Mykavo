import { prisma } from "@mykavo/database";
import { isLifecycleSubject } from "@mykavo/email";
import { logger } from "@/lib/logger";

/**
 * Unsubscribe from the lifecycle emails (Day 3 / 6 / 10).
 *
 * The link in each email carries the id of the Notification row that
 * recorded that email - an unguessable cuid the worker creates before
 * sending. It resolves to the address the email went to, so the link needs
 * no signing secret shared between web and worker. Only ids of lifecycle
 * emails are honoured: an alert's id cannot be used to opt anyone out.
 *
 * Website alerts are not touched. Those are per-workspace settings.
 */

const ID_RE = /^[a-z0-9]{20,40}$/i;

export type OptOutResult = "ok" | "invalid" | "error";

export async function optOutByNotificationId(
  notificationId: string | null | undefined,
  source: "unsubscribe_link" | "one_click",
): Promise<OptOutResult> {
  if (!notificationId || !ID_RE.test(notificationId)) return "invalid";
  try {
    const n = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { recipient: true, subject: true },
    });
    if (!n || !isLifecycleSubject(n.subject)) return "invalid";
    const email = n.recipient.trim().toLowerCase();
    await prisma.emailOptOut.upsert({ where: { email }, create: { email, source }, update: {} });
    logger.info("lifecycle email opt-out", { source });
    return "ok";
  } catch (err) {
    logger.error("lifecycle email opt-out failed", { error: err instanceof Error ? err.message : String(err) });
    return "error";
  }
}

/** Whether a notification id belongs to a lifecycle email (for the confirm page). */
export async function isUnsubscribableNotification(notificationId: string | undefined): Promise<boolean> {
  if (!notificationId || !ID_RE.test(notificationId)) return false;
  try {
    const n = await prisma.notification.findUnique({ where: { id: notificationId }, select: { subject: true } });
    return Boolean(n && isLifecycleSubject(n.subject));
  } catch {
    return false;
  }
}
