import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  prisma,
  type Website,
  type Workspace,
  type WorkspaceRole,
  type MonitoredPage,
} from "@mykavo/database";
import { auth } from "@/lib/auth";
import { resolveCurrentMembership } from "@/lib/session";

/**
 * Authorization helpers for API route handlers. Workspace scope AND role are
 * always derived from the session + verified membership rows — never from
 * client input (spec §59).
 */

export interface ApiContext {
  userId: string;
  userEmail: string;
  workspace: Workspace;
  /** The caller's role in the current workspace — drives requireRole. */
  role: WorkspaceRole;
}

/** Returns null when unauthenticated or without a workspace membership. */
export async function getApiContext(): Promise<ApiContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const membership = await resolveCurrentMembership(session.user.id);
  if (!membership) return null;

  return {
    userId: session.user.id,
    userEmail: session.user.email,
    workspace: membership.workspace,
    role: membership.role,
  };
}

/**
 * Role gate for mutating routes (spec §39): returns a 403 response when the
 * caller's role is not in `allowed`, or null when the request may proceed.
 * Usage: `const denied = requireRole(ctx, "OWNER", "ADMIN"); if (denied) return denied;`
 */
export function requireRole(
  ctx: ApiContext,
  ...allowed: WorkspaceRole[]
): NextResponse | null {
  if (allowed.includes(ctx.role)) return null;
  const message =
    ctx.role === "VIEWER"
      ? "Viewers have read-only access. Ask a workspace admin to make this change."
      : "Only the workspace owner can do this.";
  return NextResponse.json({ error: message }, { status: 403 });
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

/**
 * Loads a monitored page only if it belongs to the given website AND that
 * website belongs to the caller's workspace (double-scoped: no cross-workspace
 * or cross-website access).
 */
export async function getOwnedMonitoredPage(
  ctx: ApiContext,
  websiteId: string,
  pageId: string,
): Promise<MonitoredPage | null> {
  return prisma.monitoredPage.findFirst({
    where: { id: pageId, websiteId, website: { workspaceId: ctx.workspace.id } },
  });
}
