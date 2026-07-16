import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext, requireRole } from "@/lib/api-auth";
import { getWorkspaceSubscription } from "@/lib/billing/subscription";
import { cancelSubscriptionAtPeriodEnd, dodoApiConfigured } from "@/lib/billing/dodo-api";
import { logger } from "@/lib/logger";

/**
 * Cancel the workspace's Pro subscription at the end of the current period.
 * The actual downgrade happens when Dodo delivers the cancellation webhook;
 * we only mark cancelAtPeriodEnd so the UI reflects it immediately.
 */
export async function POST() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER");
  if (denied) return denied;

  const sub = await getWorkspaceSubscription(ctx.workspace.id);
  if (!sub || sub.planId !== "pro" || !sub.dodoSubscriptionId) {
    return NextResponse.json({ error: "No active subscription to cancel." }, { status: 400 });
  }
  if (!dodoApiConfigured()) {
    return NextResponse.json(
      { error: "Cancellation isn't available here yet - use the billing portal." },
      { status: 503 },
    );
  }

  try {
    await cancelSubscriptionAtPeriodEnd(sub.dodoSubscriptionId);
  } catch (err) {
    logger.error("dodo cancel failed", { workspaceId: ctx.workspace.id }, err);
    return NextResponse.json({ error: "Could not cancel the subscription." }, { status: 502 });
  }

  await prisma.subscription.update({
    where: { workspaceId: ctx.workspace.id },
    data: { cancelAtPeriodEnd: true },
  });
  logger.info("subscription cancel scheduled", { workspaceId: ctx.workspace.id });
  return NextResponse.json({ ok: true });
}
