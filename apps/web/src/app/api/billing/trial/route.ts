import { NextResponse } from "next/server";
import { prisma, startTrial, trialDaysLeft } from "@mykavo/database";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { canManageBilling } from "@/lib/team";
import { getWorkspaceSubscription } from "@/lib/billing/subscription";
import { logger } from "@/lib/logger";

/**
 * Starts the workspace's one Pro trial, for accounts that did not get
 * one at signup (they signed up before trials existed). No card. A workspace
 * that pays, or already had a trial, is refused. Daily scans switch on with
 * the worker's next plan sweep (every 15 minutes).
 */
export async function POST() {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  if (!canManageBilling(role)) {
    return NextResponse.json({ error: "Only the workspace owner can start a trial." }, { status: 403 });
  }

  const current = await getWorkspaceSubscription(workspace.id);
  if (current && current.planId !== "free") {
    return NextResponse.json({ error: "This workspace is already on a paid plan or a trial." }, { status: 409 });
  }

  const trial = await startTrial(prisma, workspace.id, { source: "self_serve" });
  if (!trial) {
    return NextResponse.json({ error: "This workspace has already used its Pro trial." }, { status: 409 });
  }

  logger.info("trial started", { workspaceId: workspace.id, source: "self_serve" });
  return NextResponse.json({ endsAt: trial.endsAt.toISOString(), daysLeft: trialDaysLeft(trial.endsAt) });
}
