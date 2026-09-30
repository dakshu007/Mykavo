import { prisma } from "@mykavo/database";
import type { ConnectedSiteView } from "@/components/dashboard/connected-sites";
import { logger } from "@/lib/logger";

/**
 * WordPress sites (plugin) and Shopify stores (app) connected to a
 * workspace, for the WordPress and Shopify dashboard pages.
 *
 * Tolerant of a deploy that lands before the site_connection migration: the
 * list shows empty rather than taking the page down with it.
 */
export async function loadConnectedSites(
  workspaceId: string,
  platform: "wordpress" | "shopify",
): Promise<ConnectedSiteView[]> {
  return prisma.siteConnection
    .findMany({
      // connectedAt is set when a WordPress site finishes its handshake and
      // when a Shopify store is linked; pending handshakes stay hidden.
      where: { workspaceId, platform, connectedAt: { not: null }, revokedAt: null },
      include: { website: { select: { name: true } } },
      orderBy: { connectedAt: "desc" },
    })
    .then((rows) =>
      rows.map((c) => ({
        id: c.id,
        platform: c.platform,
        siteUrl: c.siteUrl,
        siteName: c.siteName,
        websiteName: c.website.name,
        connectedAt: c.connectedAt?.toISOString() ?? null,
        lastUsedAt: c.lastUsedAt?.toISOString() ?? null,
        pluginVersion: c.pluginVersion,
      })),
    )
    .catch((err: unknown) => {
      logger.error("could not load site connections", { workspaceId, platform }, err);
      return [];
    });
}
