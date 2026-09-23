import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext, requireRole } from "@/lib/api-auth";
import { getWorkspaceSubscription } from "@/lib/billing/subscription";
import { productIdForPlan } from "@/lib/billing/config";
import { changeSubscriptionPlan, dodoApiConfigured } from "@/lib/billing/dodo-api";
import { logger } from "@/lib/logger";

const bodySchema = z.object({ plan: z.enum(["pro", "agency"]) });

/**
 * Move a paying workspace between Pro and Agency on its EXISTING Dodo
 * subscription. Upgrades apply now with a prorated charge; downgrades wait
 * for the next billing date. Nothing is written here: the entitlement
 * changes only when Dodo's verified subscription.plan_changed webhook
 * arrives, so a declined upgrade charge can never unlock Agency.
 */
export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER");
  if (denied) return denied;

  let target: "pro" | "agency";
  try {
    target = bodySchema.parse(await request.json()).plan;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const sub = await getWorkspaceSubscription(ctx.workspace.id);
  if (!sub || sub.planId === "free" || !sub.dodoSubscriptionId) {
    return NextResponse.json(
      { error: "There is no active subscription to change. Start one from Billing." },
      { status: 400 },
    );
  }
  if (sub.planId === target) {
    return NextResponse.json({ error: "You're already on that plan." }, { status: 400 });
  }
  if (sub.cancelAtPeriodEnd) {
    return NextResponse.json(
      { error: "This subscription is set to cancel. Resume it before changing plans." },
      { status: 400 },
    );
  }

  const productId = productIdForPlan(target);
  if (!productId || !dodoApiConfigured()) {
    return NextResponse.json(
      { error: "Plan changes aren't available yet. Email us and we'll switch you over." },
      { status: 503 },
    );
  }

  const direction = target === "agency" ? "upgrade" : "downgrade";
  try {
    await changeSubscriptionPlan(sub.dodoSubscriptionId, { productId, direction });
  } catch (err) {
    logger.error("dodo change-plan failed", { workspaceId: ctx.workspace.id, target }, err);
    return NextResponse.json(
      { error: "Could not change the plan. Your current plan is unchanged." },
      { status: 502 },
    );
  }

  logger.info("plan change requested", { workspaceId: ctx.workspace.id, target, direction });
  return NextResponse.json({ ok: true, direction, effectiveAt: direction === "upgrade" ? "now" : sub.currentPeriodEnd });
}
