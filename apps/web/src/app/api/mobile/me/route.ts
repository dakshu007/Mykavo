import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getSession } from "@/lib/session";
import { resolveWorkspaceSelection, WORKSPACE_COOKIE } from "@/lib/team";
import { getWorkspacePlan } from "@/lib/limits";

/**
 * Mobile session bootstrap: the signed-in user, every workspace membership
 * (flagging the active one), and the active workspace's plan limits.
 * Read-only; implements MeResponse in apps/mobile/src/lib/types.ts.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Same resolution as resolveCurrentMembership: the workspace cookie is a
  // hint, verified against membership rows, falling back to the oldest.
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  const cookieStore = await cookies();
  const active = resolveWorkspaceSelection(
    cookieStore.get(WORKSPACE_COOKIE)?.value,
    memberships,
  );
  if (!active) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await getWorkspacePlan(active.workspaceId);

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      twoFactorEnabled: Boolean(session.user.twoFactorEnabled),
    },
    workspaces: memberships.map((m) => ({
      id: m.workspaceId,
      name: m.workspace.name,
      role: m.role,
      isActive: m.workspaceId === active.workspaceId,
    })),
    plan: {
      id: plan.id,
      name: plan.name,
      limits: {
        websites: plan.limits.websites,
        pagesPerSite: plan.limits.pagesPerWebsite,
        scanFrequency: plan.limits.scanFrequency,
        seats: plan.limits.maxMembers,
      },
    },
  });
}
