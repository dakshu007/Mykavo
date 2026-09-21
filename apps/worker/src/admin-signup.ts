/**
 * "Somebody signed up" - delivered to the operator, not to a customer.
 *
 * Every other push in this worker fans out to a workspace's members. This one
 * does not: its audience is whoever runs this installation, which is an
 * allowlist in the environment rather than a row in any table. That is
 * deliberate - platform admin is not a thing a customer can grant themselves
 * by joining a workspace.
 *
 * Wording and the lock-screen redaction rules live in @mykavo/shared, which
 * CI tests; this file is lookup and delivery.
 */

import { prisma } from "@mykavo/database";
import {
  chunkTokens,
  isExpoPushToken,
  parseAlertRecipients,
  signupPushAlert,
} from "@mykavo/shared";
import { sendPushToTokens } from "./push";
import { logger } from "./logger";

/**
 * Who counts as an operator. Mirrors the web app's isPlatformAdmin: an
 * explicit ADMIN_EMAILS always wins, and only an ABSENT variable inherits the
 * blog allowlist. `ADMIN_EMAILS=""` is somebody switching this off, and
 * falling back there would quietly switch it on again.
 */
export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  const source = raw === undefined ? process.env.BLOG_ADMIN_EMAILS : raw;
  return parseAlertRecipients(source).map((e) => e.toLowerCase());
}

export async function runAdminSignupJob(userId: string): Promise<void> {
  const admins = adminEmails();
  if (admins.length === 0) {
    // Loud and once per job, not silent: a notification addressed to nobody
    // behaves exactly like no notification, and the operator should not have
    // to discover that by wondering why their phone never buzzes.
    logger.warn(
      "new-signup alerts are not addressed to anyone - set ADMIN_EMAILS in the worker environment",
      { userId },
    );
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    // The account was deleted between signup and this job running. Nothing to
    // announce, and nothing wrong.
    logger.info("skipping signup alert for a user that no longer exists", { userId });
    return;
  }

  // The operator's own account creation is not news to the operator.
  if (admins.includes(user.email.trim().toLowerCase())) {
    logger.info("skipping signup alert for an admin's own account", { userId });
    return;
  }

  const totalUsers = await prisma.user.count();

  const devices = await prisma.pushDevice.findMany({
    where: {
      enabled: true,
      user: { email: { in: admins, mode: "insensitive" } },
    },
    select: { token: true },
  });
  const tokens = devices.map((d) => d.token).filter(isExpoPushToken);

  if (tokens.length === 0) {
    // Worth saying: the alert is configured but has nowhere to land, which
    // means the admin has not signed in on the phone app yet.
    logger.info("new signup, but no admin device is registered for push", {
      userId,
      totalUsers,
    });
    return;
  }

  const alert = signupPushAlert({ name: user.name, email: user.email, totalUsers });
  let delivered = 0;
  for (const chunk of chunkTokens(tokens)) {
    delivered += await sendPushToTokens(chunk, alert);
  }

  logger.info("new signup alert dispatched", {
    userId,
    totalUsers,
    attempted: tokens.length,
    delivered,
  });
}
