import { NextResponse } from "next/server";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { getWorkspaceSubscription } from "@/lib/billing/subscription";
import { createCustomerPortalSession, dodoApiConfigured } from "@/lib/billing/dodo-api";
import { logger } from "@/lib/logger";

/** Redirect the user to Dodo's customer portal to manage their subscription. */
export async function GET() {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);

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
