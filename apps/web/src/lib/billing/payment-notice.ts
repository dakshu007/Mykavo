import { prisma, Prisma } from "@mykavo/database";
import { sendEmail, paymentProblemEmail } from "@mykavo/email";
import { PLAN_NAMES, toPlanTier } from "@mykavo/shared";
import { appBaseUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import type { PaymentProblemKind } from "./webhook";

export { paymentProblemKind, type PaymentProblemKind } from "./webhook";

/**
 * "Your payment didn't go through" - the reminder that used to be missing.
 *
 * A declined renewal (an expired card, or an autopay limit below the charge)
 * put the subscription on hold and dropped the workspace to Free in silence;
 * the owner found out from missing alerts. Now the owner gets one email per
 * Dodo event, with a link straight to Billing to fix the payment method.
 */

/**
 * Email the workspace owner about a payment problem. Never throws: a
 * reminder that fails to send must not make Dodo retry the whole webhook.
 * Deduplicated per webhook delivery, so Dodo's retries send one email.
 */
export async function notifyPaymentProblem(input: {
  webhookId: string;
  kind: PaymentProblemKind;
  subscriptionId: string | null;
}): Promise<void> {
  if (!input.subscriptionId) return; // a failed first checkout: nothing is subscribed yet
  try {
    const sub = await prisma.subscription.findUnique({
      where: { dodoSubscriptionId: input.subscriptionId },
      select: {
        planId: true,
        workspace: { select: { id: true, owner: { select: { email: true } } } },
      },
    });
    const to = sub?.workspace.owner.email;
    if (!sub || !to) return;

    try {
      await prisma.processedWebhookEvent.create({
        data: { eventId: `${input.webhookId}:payment-notice`, eventType: `notice:${input.kind}` },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
      throw err;
    }

    // Read before the webhook downgrades the workspace, so the email names
    // the plan that was paid for rather than "Free".
    const tier = toPlanTier(sub.planId);
    const email = paymentProblemEmail({
      planName: PLAN_NAMES[tier === "free" ? "pro" : tier],
      kind: input.kind,
      billingUrl: `${appBaseUrl()}/dashboard/billing`,
    });
    const result = await sendEmail({ to: [to], subject: email.subject, html: email.html, text: email.text });
    logger.info("payment problem email sent", {
      workspaceId: sub.workspace.id,
      kind: input.kind,
      ok: result.ok,
    });
  } catch (err) {
    logger.error("payment problem email failed", { kind: input.kind }, err);
  }
}
