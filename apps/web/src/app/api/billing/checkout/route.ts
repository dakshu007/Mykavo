import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma, createCheckoutIntent } from "@fluxen/database";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { canManageBilling } from "@/lib/team";
import { buildCheckoutUrl } from "@/lib/billing/config";
import { logger } from "@/lib/logger";

/**
 * Redirect the signed-in user to Dodo's hosted checkout for Pro. A random,
 * server-recorded checkout token (not the raw workspace id) is stamped into
 * metadata so the webhook can attribute the payment without trusting any
 * client-editable value (security review fix).
 */
export async function GET() {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  if (!canManageBilling(role)) {
    return NextResponse.json(
      { error: "Only the workspace owner can manage billing." },
      { status: 403 },
    );
  }

  const token = randomBytes(32).toString("base64url");
  await createCheckoutIntent(prisma, {
    token,
    workspaceId: workspace.id,
    userId: session.user.id,
  });

  const url = buildCheckoutUrl({ checkoutToken: token, email: session.user.email });
  if (!url) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  logger.info("checkout started", { workspaceId: workspace.id });
  return NextResponse.redirect(url);
}
