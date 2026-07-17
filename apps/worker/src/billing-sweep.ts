/**
 * Daily billing sweep: remind Pro workspaces whose current period ends within
 * the reminder window. One email per period - `renewalReminderSentAt` is
 * compared against the period window, so a new period naturally re-arms the
 * reminder without any reset job. The email goes to the workspace owner.
 */

import { prisma } from "@mykavo/database";
import { sendEmail, renewalReminderEmail } from "@mykavo/email";
import { logger } from "./logger";

const REMINDER_DAYS = Number(process.env.RENEWAL_REMINDER_DAYS ?? 3);

function appUrl(): string {
  return process.env.APP_URL ?? "https://mykavo.app";
}

export async function runBillingSweep(): Promise<void> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_DAYS * 24 * 60 * 60 * 1000);

  const due = await prisma.subscription.findMany({
    where: {
      planId: "pro",
      status: "active",
      currentPeriodEnd: { gt: now, lte: windowEnd },
    },
    include: {
      workspace: {
        select: { id: true, name: true, owner: { select: { email: true, name: true } } },
      },
    },
  });

  let sent = 0;
  for (const sub of due) {
    const periodEnd = sub.currentPeriodEnd!;
    // Already reminded for THIS period? A reminder sent after the reminder
    // window opened (periodEnd - REMINDER_DAYS) belongs to this period.
    const windowOpen = new Date(periodEnd.getTime() - REMINDER_DAYS * 24 * 60 * 60 * 1000);
    if (sub.renewalReminderSentAt && sub.renewalReminderSentAt >= windowOpen) continue;

    const email = sub.workspace.owner?.email;
    if (!email) continue;

    const daysLeft = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / 86_400_000));
    const message = renewalReminderEmail({
      daysLeft,
      renewsOn: periodEnd.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      priceMonthlyUsd: 20,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      billingUrl: `${appUrl()}/dashboard/billing`,
    });

    const result = await sendEmail({ to: [email], ...message });
    if (result.ok) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { renewalReminderSentAt: now },
      });
      sent += 1;
    } else {
      logger.warn("renewal reminder send failed", {
        workspaceId: sub.workspaceId,
        error: result.error,
      });
    }
  }

  logger.info("billing sweep finished", { due: due.length, sent });
}
