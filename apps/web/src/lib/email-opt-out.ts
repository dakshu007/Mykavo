import { isMissingTableError, prisma } from "@mykavo/database";
import { AUTOMATIONS, brevoBlocklist, brevoConfigured, isAutomationKey, isLifecycleSubject } from "@mykavo/email";
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

type Row = { recipient: string; subject: string } | null;

/**
 * The notification, if it is a lifecycle email. Recognised by the send log
 * (Admin > Automations lets subjects be edited) or, for emails sent before
 * the log existed, by their original subject.
 */
async function findLifecycleNotification(id: string): Promise<Row> {
  let n: (NonNullable<Row> & { automationSend?: { automationKey: string } | null }) | null;
  try {
    n = await prisma.notification.findUnique({
      where: { id },
      select: { recipient: true, subject: true, automationSend: { select: { automationKey: true } } },
    });
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
    n = await prisma.notification.findUnique({ where: { id }, select: { recipient: true, subject: true } });
  }
  if (!n) return null;
  const key = n.automationSend?.automationKey;
  // Optional automated emails (lifecycle series, product updates) and custom
  // emails from Automation Tool flows.
  const lifecycle = key
    ? isAutomationKey(key)
      ? AUTOMATIONS[key].unsubscribable
      : key.startsWith("flow:")
    : isLifecycleSubject(n.subject);
  return lifecycle ? { recipient: n.recipient, subject: n.subject } : null;
}

export type OptOutResult = "ok" | "invalid" | "error";

export async function optOutByNotificationId(
  notificationId: string | null | undefined,
  source: "unsubscribe_link" | "one_click",
): Promise<OptOutResult> {
  if (!notificationId || !ID_RE.test(notificationId)) return "invalid";
  try {
    const n = await findLifecycleNotification(notificationId);
    if (!n) return "invalid";
    const email = n.recipient.trim().toLowerCase();
    await prisma.emailOptOut.upsert({ where: { email }, create: { email, source }, update: {} });
    logger.info("lifecycle email opt-out", { source });
    // Brevo too, straight away, so no campaign reaches them either. Best
    // effort: MyKavo's own record above is what every send checks, and the
    // hourly contact sync blocklists anyone this misses.
    if (brevoConfigured()) {
      await brevoBlocklist(email).catch((err: unknown) =>
        logger.warn("brevo blocklist failed; the contact sync will retry", {
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
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
    return Boolean(await findLifecycleNotification(notificationId));
  } catch {
    return false;
  }
}
