import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma, createCheckoutIntent } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { getWorkspacePlan } from "@/lib/limits";
import { buildAddonCheckoutUrl, websiteAddonEnabled } from "@/lib/billing/config";
import { logger } from "@/lib/logger";

/**
 * Redirect a signed-in Pro user to Dodo's hosted checkout for a $6/mo website
 * add-on (+30 websites). Each purchase is its own recurring subscription — the
 * webhook records it and the effective website limit grows by 30. Attribution
 * uses the same unforgeable server-issued token as the base checkout, tagged
 * with kind "website_addon" so the webhook routes it to the add-on handler.
 */
export async function GET(request: Request) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);

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
