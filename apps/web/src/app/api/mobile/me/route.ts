import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getSession } from "@/lib/session";
import { resolveWorkspaceSelection, WORKSPACE_COOKIE } from "@/lib/team";
import { getWorkspacePlan } from "@/lib/limits";
import { isBlogAdmin } from "@/lib/blog-admin";
import { isPlatformAdmin } from "@/lib/platform-admin";

/**
 * Mobile session bootstrap: the signed-in user, every workspace membership
 * (flagging the active one), the active workspace's plan limits, and which
 * operator-only areas this account may see.
 *
 * The two admin flags drive whether the app shows the Usage tab and the Blog
 * screen at all. They are UX hints ONLY - every admin endpoint re-checks the
 * same allowlist server-side, so a tampered response reveals nothing. Sending
 * them is what stops the app rendering a tab that answers 404 when tapped.
 *
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
    admin: {
      usage: isPlatformAdmin(session.user.email),
      blog: isBlogAdmin(session.user.email),
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
