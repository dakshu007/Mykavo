import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma, type Workspace, type WorkspaceRole } from "@mykavo/database";
import { auth } from "@/lib/auth";
import { resolveWorkspaceSelection, WORKSPACE_COOKIE } from "@/lib/team";

/**
 * Server-side session helpers. All dashboard pages and APIs resolve
 * authorization here - never from client-provided state (spec §59).
 */

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Redirects to /login when unauthenticated. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export interface CurrentMembership {
  workspace: Workspace;
  role: WorkspaceRole;
}

/**
 * Resolves which of the user's memberships is "current": the one named by the
 * httpOnly workspace cookie when it matches a verified membership row, else
 * the oldest membership. The cookie is a hint, never an authority.
 * Returns null for users with no memberships at all.
 */
export async function resolveCurrentMembership(
  userId: string,
): Promise<CurrentMembership | null> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  const cookieStore = await cookies();
  const selected = resolveWorkspaceSelection(
    cookieStore.get(WORKSPACE_COOKIE)?.value,
    memberships,
  );
  if (!selected) return null;
  return { workspace: selected.workspace, role: selected.role };
}

/**
 * Resolves the user's current workspace + role via membership. Self-heals
 * accounts created before the auto-create hook by creating the personal
 * workspace on first dashboard access.
 */
export const getCurrentMembership = cache(
  async (userId: string, userName: string): Promise<CurrentMembership> => {
    const current = await resolveCurrentMembership(userId);
    if (current) return current;

    const firstName = userName.trim().split(/\s+/)[0] || "My";
    const workspace = await prisma.workspace.create({
      data: {
        name: `${firstName}'s Workspace`,
        ownerId: userId,
        members: { create: { userId, role: "OWNER" } },
      },
    });
    return { workspace, role: "OWNER" };
  },
);

/** Back-compat convenience: just the current workspace. */
export const getCurrentWorkspace = cache(
  async (userId: string, userName: string): Promise<Workspace> => {
    const { workspace } = await getCurrentMembership(userId, userName);
    return workspace;
  },
);
