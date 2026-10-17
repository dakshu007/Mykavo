import { prisma } from "@mykavo/database";
import type { ConnectedSiteView } from "@/components/dashboard/connected-sites";
import { bareHost } from "@/lib/integrations/site-connection";
import { logger } from "@/lib/logger";

/** Platforms that connect to a workspace through a site connection. */
export type SiteConnectionPlatform = "wordpress" | "shopify" | "chrome";

/** Bare host (lowercase, no "www.") of a URL, or null when it doesn't parse. */
export function hostOfUrl(url: string): string | null {
  try {
    return bareHost(new URL(url).hostname);
  } catch {
    return null;
  }
}

/**
 * Whether a MyKavo website is the site asking to connect: its bare host must
 * equal one of the connecting site's hosts. Consent screens and approve
 * routes both use this, so a plugin or app can only be linked to the
 * website it actually runs on, never to another website in the workspace.
 */
export function websiteMatchesHost(
  websiteUrl: string,
  siteHosts: ReadonlyArray<string | null | undefined>,
): boolean {
  const host = hostOfUrl(websiteUrl);
  if (!host) return false;
  return siteHosts.some((h) => typeof h === "string" && h !== "" && bareHost(h) === host);
}

/**
 * WordPress sites (plugin), Shopify stores (app) and Chrome extension
 * connections of a workspace, for the dashboard pages that list them with
 * a kill switch.
 *
 * Tolerant of a deploy that lands before the site_connection migration: the
 * list shows empty rather than taking the page down with it.
 */
export async function loadConnectedSites(
  workspaceId: string,
  platform: SiteConnectionPlatform | readonly SiteConnectionPlatform[],
): Promise<ConnectedSiteView[]> {
  const platforms: SiteConnectionPlatform[] =
    typeof platform === "string" ? [platform] : [...platform];
  return prisma.siteConnection
    .findMany({
      // connectedAt is set when a WordPress site or the Chrome extension
      // finishes its handshake and when a Shopify store is linked; pending
      // handshakes stay hidden.
      where: {
        workspaceId,
        platform: { in: platforms },
        connectedAt: { not: null },
        revokedAt: null,
      },
      include: {
        website: { select: { name: true } },
        createdByUser: { select: { name: true, email: true } },
      },
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
        createdAt: c.createdAt.toISOString(),
        createdByName: c.createdByUser?.name || c.createdByUser?.email || null,
      })),
    )
    .catch((err: unknown) => {
      logger.error("could not load site connections", { workspaceId, platforms }, err);
      return [];
    });
}
