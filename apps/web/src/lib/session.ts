import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@fluxen/database";
import { auth } from "@/lib/auth";

/**
 * Server-side session helpers. All dashboard pages and APIs resolve
 * authorization here — never from client-provided state (spec §59).
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

/**
 * Resolves the user's workspace via membership (OWNER-only in the MVP).
 * Self-heals accounts created before the auto-create hook by creating
 * the personal workspace on first dashboard access.
 */
export const getCurrentWorkspace = cache(async (userId: string, userName: string) => {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (membership) return membership.workspace;

  const firstName = userName.trim().split(/\s+/)[0] || "My";
  return prisma.workspace.create({
    data: {
      name: `${firstName}'s Workspace`,
      ownerId: userId,
      members: { create: { userId, role: "OWNER" } },
    },
  });
});
