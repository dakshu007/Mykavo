import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma, createCheckoutIntent } from "@mykavo/database";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { canManageBilling } from "@/lib/team";
import { buildCheckoutUrl, productIdForPlan, type PaidPlan } from "@/lib/billing/config";
import { getWorkspaceSubscription } from "@/lib/billing/subscription";
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

  const plan: PaidPlan =
    new URL(request.url).searchParams.get("plan") === "agency" ? "agency" : "pro";

  const current = await getWorkspaceSubscription(workspace.id);
  if (current && current.planId !== "free") {
    return NextResponse.redirect(new URL("/dashboard/billing", request.url));
  }

  if (!productIdForPlan(plan)) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  const token = randomBytes(32).toString("base64url");
  await createCheckoutIntent(prisma, {
    token,
    workspaceId: workspace.id,
    userId: session.user.id,
    kind: plan,
  });

  const url = buildCheckoutUrl({ checkoutToken: token, email: session.user.email, plan });
  if (!url) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  logger.info("checkout started", { workspaceId: workspace.id, plan });
  return NextResponse.redirect(url);
}
