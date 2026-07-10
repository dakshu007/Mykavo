import { NextResponse } from "next/server";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { canManageBilling } from "@/lib/team";
import { getWorkspaceSubscription } from "@/lib/billing/subscription";
import { createCustomerPortalSession, dodoApiConfigured } from "@/lib/billing/dodo-api";
import { logger } from "@/lib/logger";

/** Redirect the user to Dodo's customer portal to manage their subscription. */
export async function GET() {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  if (!canManageBilling(role)) {
    return NextResponse.json(
      { error: "Only the workspace owner can manage billing." },
      { status: 403 },
    );
  }

  if (!dodoApiConfigured()) {
    return NextResponse.json(
      { error: "The billing portal is not available yet." },
      { status: 503 },
    );
  }

  const sub = await getWorkspaceSubscription(workspace.id);
  if (!sub?.dodoCustomerId) {
    return NextResponse.json({ error: "No billing account found." }, { status: 400 });
  }

  try {
    const link = await createCustomerPortalSession(sub.dodoCustomerId);
    return NextResponse.redirect(link);
  } catch (err) {
    logger.error("failed to open dodo portal", { workspaceId: workspace.id }, err);
    return NextResponse.json({ error: "Could not open the billing portal." }, { status: 502 });
  }
}
