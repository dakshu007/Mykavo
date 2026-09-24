/**
 * Authenticates requests from a connected CMS plugin (Authorization: Bearer
 * mkv_wp_...). A token is scoped to ONE website: every /api/wp/v1 route reads
 * and acts on `ctx.website` only, never on anything named in the request.
 */

import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { TOKEN_PREFIX, sha256Hex } from "@/lib/integrations/site-connection";

export interface SiteContext {
  connectionId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceOwnerId: string;
  /** Who approved the connection, for audit fields; null if they left. */
  actingUserId: string | null;
  website: { id: string; name: string; url: string };
}

/** lastUsedAt is informational - write it at most this often. */
const LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1000;

export async function authenticateSiteRequest(request: Request): Promise<SiteContext | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  const token = match?.[1];
  if (!token || !token.startsWith(TOKEN_PREFIX) || token.length > 200) return null;

  const connection = await prisma.siteConnection.findUnique({
    where: { tokenHash: sha256Hex(token) },
    select: {
      id: true,
      revokedAt: true,
      lastUsedAt: true,
      createdByUserId: true,
      workspace: { select: { id: true, name: true, ownerId: true } },
      website: { select: { id: true, name: true, url: true } },
    },
  });
  if (!connection || connection.revokedAt) return null;

  const now = Date.now();
  if (!connection.lastUsedAt || now - connection.lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS) {
    // Fire-and-forget: a failed timestamp write must never fail the request.
    void prisma.siteConnection
      .update({ where: { id: connection.id }, data: { lastUsedAt: new Date(now) } })
      .catch(() => undefined);
  }

  return {
    connectionId: connection.id,
    workspaceId: connection.workspace.id,
    workspaceName: connection.workspace.name,
    workspaceOwnerId: connection.workspace.ownerId,
    actingUserId: connection.createdByUserId,
    website: connection.website,
  };
}

/** The same body for a missing, wrong or revoked token - no oracle. */
export function unauthorizedSite(): NextResponse {
  return NextResponse.json(
    { error: "This site is not connected to MyKavo. Reconnect it from the plugin.", code: "NOT_CONNECTED" },
    { status: 401 },
  );
}
