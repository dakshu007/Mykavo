/**
 * "Welcome to MyKavo" - the one email a new account gets, to the customer.
 *
 * Sent on ACCOUNT CREATION, never on sign-in. A welcome that arrives every
 * time somebody logs in stops being a welcome and starts being a reason to
 * click "report spam", which costs the sending domain's reputation for every
 * alert MyKavo sends afterwards.
 *
 * It is sent regardless of the workspace's email-alert setting, and that is
 * not a hole in the opt-in rule. That rule governs RECURRING alerts about
 * websites, which nobody asked for until they ask; this is a single
 * transactional message confirming an account somebody just created at the
 * address they just typed in - the same category as a receipt. It is sent
 * exactly once (see the de-duplication below), and it tells the reader that
 * alerts are off rather than quietly opting them in.
 *
 * The wording lives in @mykavo/email, which CI tests; this file is lookup,
 * de-duplication and delivery.
 */

import { prisma } from "@mykavo/database";
import { sendEmail, welcomeEmail } from "@mykavo/email";
import { displayPersonName } from "@mykavo/shared";
import { logger } from "./logger";

const appBase = (process.env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");

/** Recorded on the Notification row, and the key this job de-duplicates on. */
export const WELCOME_SUBJECT = "Welcome to MyKavo - start monitoring your website";

export async function runWelcomeEmailJob(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      ownedWorkspaces: { select: { id: true }, orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  if (!user) {
    // Deleted between signup and this job running. Nothing to send, nothing
    // wrong.
    logger.info("skipping welcome email for a user that no longer exists", { userId });
    return;
  }

  const workspaceId = user.ownedWorkspaces[0]?.id;
  if (!workspaceId) {
    // The signup hook creates the workspace before enqueueing this job, so
    // this means the workspace creation failed or the row was removed. Worth
    // saying out loud rather than sending a welcome to an account that cannot
    // actually monitor anything.
    logger.warn("skipping welcome email - the account owns no workspace", { userId });
    return;
  }

  // De-duplicate. pg-boss retries a job whose process died after the send but
  // before the ack, and a second "welcome" is a small but avoidable
  // embarrassment. The ledger is the Notification table rather than a new
  // column, so the welcome also shows up wherever notification history does.
  //
  // Only a SENT row blocks a retry: a FAILED or PENDING one means the last
  // attempt did not land, and that should be tried again.
  const already = await prisma.notification.findFirst({
    where: {
      workspaceId,
      channelType: "EMAIL",
      subject: WELCOME_SUBJECT,
      status: "SENT",
    },
    select: { id: true },
  });
  if (already) {
    logger.info("welcome email already sent for this workspace", { userId, workspaceId });
    return;
  }

  const mail = welcomeEmail({
    // Whatever is stored may be junk - rows predating the signup name check
    // can hold anything - so the same fallback the admin list uses decides
    // what this email calls them.
    name: displayPersonName(user.name, user.email),
    addWebsiteUrl: `${appBase}/dashboard/websites/new`,
    alertsUrl: `${appBase}/dashboard/notifications`,
    docsUrl: `${appBase}/docs`,
  });

  const result = await sendEmail({
    to: [user.email],
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  await prisma.notification.create({
    data: {
      workspaceId,
      channelType: "EMAIL",
      recipient: user.email,
      subject: mail.subject,
      status: result.ok ? "SENT" : "FAILED",
      sentAt: result.ok ? new Date() : null,
      errorMessage: result.error ?? null,
    },
  });

  if (!result.ok) {
    // Thrown, not swallowed: pg-boss retries this queue, and a transient
    // provider failure is exactly what those retries are for.
    throw new Error(`welcome email failed for ${userId}: ${result.error ?? "unknown"}`);
  }

  logger.info("welcome email sent", { userId, workspaceId, provider: result.provider });
}
