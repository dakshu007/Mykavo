import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma, createCheckoutIntent, listActiveWebsiteAddons } from "@fluxen/database";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { canManageBilling } from "@/lib/team";
import { getWorkspacePlan } from "@/lib/limits";
import { WEBSITE_ADDON } from "@/config/plans";
import { buildAddonCheckoutUrl, websiteAddonEnabled } from "@/lib/billing/config";
import { logger } from "@/lib/logger";

/**
 * Redirect a signed-in Pro user to Dodo's hosted checkout for a $6/mo website
 * add-on (+1 website, at most WEBSITE_ADDON.maxUnits active per workspace).
 * Each purchase is its own recurring subscription — the webhook records it and
 * the effective website limit grows by one. Attribution uses the same
 * unforgeable server-issued token as the base checkout, tagged with kind
 * "website_addon" so the webhook routes it to the add-on handler.
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

  if (!websiteAddonEnabled) {
    return NextResponse.json(
      { error: "Website add-ons aren't configured on this deployment." },
      { status: 503 },
    );
  }

  // Add-ons only extend Pro capacity — Free users must upgrade first.
  const plan = await getWorkspacePlan(workspace.id);
  if (plan.id !== "pro") {
    return NextResponse.redirect(new URL("/dashboard/billing?addon=needs-pro", request.url));
  }

  // Hard cap: at most maxUnits active add-ons per workspace.
  const activeAddons = await listActiveWebsiteAddons(prisma, workspace.id);
  if (activeAddons.length >= WEBSITE_ADDON.maxUnits) {
    return NextResponse.redirect(new URL("/dashboard/billing?addon=limit", request.url));
  }

  const token = randomBytes(32).toString("base64url");
  await createCheckoutIntent(prisma, {
    token,
    workspaceId: workspace.id,
    userId: session.user.id,
    kind: "website_addon",
  });

  const url = buildAddonCheckoutUrl({ checkoutToken: token, email: session.user.email });
  if (!url) {
    return NextResponse.json({ error: "Website add-ons aren't configured." }, { status: 503 });
  }

  logger.info("addon checkout started", { workspaceId: workspace.id });
  return NextResponse.redirect(url);
}
