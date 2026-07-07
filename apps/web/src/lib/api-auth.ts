import { headers } from "next/headers";
import { prisma, type Website, type Workspace } from "@fluxen/database";
import { auth } from "@/lib/auth";

/**
 * Authorization helpers for API route handlers. Workspace scope is always
 * derived from the session — never from client input (spec §59).
 */

export interface ApiContext {
  userId: string;
  workspace: Workspace;
}

/** Returns null when unauthenticated or without a workspace membership. */
export async function getApiContext(): Promise<ApiContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;

  return { userId: session.user.id, workspace: membership.workspace };
}

/** Loads a website only if it belongs to the caller's workspace. */
export async function getOwnedWebsite(
  ctx: ApiContext,
  websiteId: string,
): Promise<Website | null> {
  return prisma.website.findFirst({
    where: { id: websiteId, workspaceId: ctx.workspace.id },
  });
}
