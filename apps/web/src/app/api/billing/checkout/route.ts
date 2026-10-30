import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma, createCheckoutIntent } from "@mykavo/database";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { canManageBilling } from "@/lib/team";
import {
  buildCheckoutUrl,
  checkoutRedirectUrl,
  productIdForPlan,
  type BillingInterval,
  type PaidPlan,
} from "@/lib/billing/config";
import { createCheckoutSession, dodoApiConfigured } from "@/lib/billing/dodo-api";
import { getWorkspaceSubscription } from "@/lib/billing/subscription";
import { appBaseUrl } from "@/lib/app-url";
import { getLiveCampaign } from "@/lib/billing/campaign-server";
import { campaignCovers } from "@/config/campaign";
import { logger } from "@/lib/logger";

/**
 * Redirect the signed-in user to Dodo's hosted checkout for Pro or Agency
 * (`?plan=agency`; anything else means Pro). A random, server-recorded
 * checkout token (not the raw workspace id) is stamped into metadata so the
 * webhook can attribute the payment without trusting any client-editable
 * value (security review fix). The intent records the plan, so the webhook
 * never takes the buyer's word for what they bought.
 *
 * A workspace already on a paid plan is sent back to Billing: moving between
 * Pro and Agency changes the existing subscription (POST
 * /api/billing/change-plan) instead of opening a second one that would bill
 * twice.
 */
export async function GET(request: Request) {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  if (!canManageBilling(role)) {
    return NextResponse.json(
      { error: "Only the workspace owner can manage billing." },
      { status: 403 },
    );
  }

  const params = new URL(request.url).searchParams;
  const requested = params.get("plan");
  const plan: PaidPlan = requested === "agency" || requested === "starter" ? requested : "pro";
  // Yearly only where its product exists; anything else is monthly.
  const interval: BillingInterval =
    params.get("interval") === "year" && productIdForPlan(plan, "year") ? "year" : "month";

  const current = await getWorkspaceSubscription(workspace.id);
  if (current && current.planId !== "free" && current.billedBy !== "trial") {
    return NextResponse.redirect(`${appBaseUrl()}/dashboard/billing`);
  }

  if (!productIdForPlan(plan, interval)) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  const token = randomBytes(32).toString("base64url");
  await createCheckoutIntent(prisma, {
    token,
    workspaceId: workspace.id,
    userId: session.user.id,
    kind: plan,
  });

  // Preferred: a checkout session, which lowers the autopay limit Indian
  // cards show (Rs 15,000 by default - see DODO_MANDATE_FLOOR_INR). Any
  // failure falls back to the static link, so checkout never breaks over it.
  const productId = productIdForPlan(plan, interval)!;
  if (dodoApiConfigured()) {
    // A running campaign's code is applied for the buyer. If Dodo refuses it
    // (expired early, mistyped in the dashboard), the second attempt is a
    // plain session: a promotion must never be the reason checkout fails.
    // Only for the plans the campaign's code covers in Dodo, and only on
    // monthly billing: its cycle limit counts months.
    const live = interval === "month" ? await getLiveCampaign().catch(() => null) : null;
    const campaign = live && campaignCovers(live, plan) ? live : null;
    const attempts: (string[] | undefined)[] = campaign ? [[campaign.code], undefined] : [undefined];
    for (const discountCodes of attempts) {
      try {
        const sessionUrl = await createCheckoutSession({
          productId,
          email: session.user.email,
          metadata: {
            checkoutToken: token,
            kind: plan,
            interval,
            ...(discountCodes ? { campaign: campaign!.id } : {}),
          },
          returnUrl: checkoutRedirectUrl(),
          discountCodes,
        });
        logger.info("checkout started", {
          workspaceId: workspace.id,
          plan,
          interval,
          via: "session",
          campaign: discountCodes ? campaign!.id : null,
        });
        return NextResponse.redirect(sessionUrl);
      } catch (err) {
        logger.warn(discountCodes ? "checkout session with campaign code failed" : "checkout session failed, using static link", {
          workspaceId: workspace.id,
          plan,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  const url = buildCheckoutUrl({ checkoutToken: token, email: session.user.email, plan, interval });
  if (!url) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  logger.info("checkout started", { workspaceId: workspace.id, plan, interval, via: "static-link" });
  return NextResponse.redirect(url);
}
