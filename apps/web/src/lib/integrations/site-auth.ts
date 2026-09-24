/**
 * Authenticates requests to the site API (/api/wp/v1) from:
 *
 *   - the WordPress plugin: Authorization: Bearer mkv_wp_... (a token scoped
 *     to one website, stored as a hash), and
 *   - the Shopify app: Authorization: Bearer <App Bridge session token>, a
 *     JWT Shopify signs with our client secret, which names the store; the
 *     store's approved link says which website it may see.
 *
 * Either way the result is scoped to ONE website: every route reads and acts
 * on `ctx.website` only, never on anything named in the request.
 */

import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { TOKEN_PREFIX, sha256Hex } from "@/lib/integrations/site-connection";
import { looksLikeJwt, verifySessionToken } from "@/lib/integrations/shopify";

export interface SiteContext {
  platform: "wordpress" | "shopify";
  /** The Shopify store's row, for Shopify requests. */
  shopifyShopId: string | null;
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
  if (token && looksLikeJwt(token)) return authenticateShopifyRequest(token);
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
    platform: "wordpress",
    shopifyShopId: null,
    connectionId: connection.id,
    workspaceId: connection.workspace.id,
    workspaceName: connection.workspace.name,
    workspaceOwnerId: connection.workspace.ownerId,
    actingUserId: connection.createdByUserId,
    website: connection.website,
  };
}

async function authenticateShopifyRequest(token: string): Promise<SiteContext | null> {
  const apiKey = process.env.SHOPIFY_API_KEY?.trim();
  const apiSecret = process.env.SHOPIFY_API_SECRET?.trim();
  if (!apiKey || !apiSecret) return null;
  const claims = verifySessionToken(token, { apiKey, apiSecret });
  if (!claims) return null;

  const shop = await prisma.shopifyShop.findUnique({
    where: { shop: claims.shop },
    select: {
      id: true,
      uninstalledAt: true,
      siteConnection: {
        select: {
          id: true,
          revokedAt: true,
          createdByUserId: true,
          workspace: { select: { id: true, name: true, ownerId: true } },
          website: { select: { id: true, name: true, url: true } },
        },
      },
    },
  });
  const link = shop?.siteConnection;
  if (!shop || shop.uninstalledAt || !link || link.revokedAt) return null;

  return {
    platform: "shopify",
    shopifyShopId: shop.id,
    connectionId: link.id,
    workspaceId: link.workspace.id,
    workspaceName: link.workspace.name,
    workspaceOwnerId: link.workspace.ownerId,
    actingUserId: link.createdByUserId,
    website: link.website,
  };
}

/** The same body for a missing, wrong or revoked token - no oracle. */
export function unauthorizedSite(): NextResponse {
  return NextResponse.json(
    { error: "This site is not connected to MyKavo. Reconnect it from the plugin.", code: "NOT_CONNECTED" },
    { status: 401 },
  );
}
