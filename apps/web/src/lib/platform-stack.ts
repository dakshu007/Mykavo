import { prisma } from "@mykavo/database";
import { parseFingerprint, compareVersions, type PlatformFingerprint } from "@mykavo/shared";

/**
 * The platform stack MyKavo can see on a website: plugins, theme and core
 * version, merged across the most recent snapshot of every monitored page.
 *
 * Merged rather than taken from one page because plugins are enqueued per
 * page - a checkout plugin only loads on /checkout - so the homepage alone
 * would under-report the site. The newest version wins when two pages disagree,
 * since a stale cached asset can leave one page on the older file.
 */
export interface PlatformStack {
  fingerprint: PlatformFingerprint;
  /** Pages whose latest snapshot carried a fingerprint at all. */
  pagesRead: number;
  /** Platform assets seen across those pages, and how many gave a version. */
  assetsSeen: number;
  assetsVersioned: number;
}

export async function loadPlatformStack(websiteId: string): Promise<PlatformStack | null> {
  try {
    return await queryPlatformStack(websiteId);
  } catch (err) {
    // Additive panel: the column arrives in a migration, and the web app
    // deploys the moment this is pushed, so there is a window where the code is
    // live and the column is not. Hiding the panel degrades the page to what it
    // showed yesterday; an unhandled error would take the whole page down.
    // Logged loudly so "nothing detected" and "the query failed" never look
    // the same from outside.
    console.error(
      JSON.stringify({
        level: "error",
        app: "platform-stack",
        msg: "platform stack query failed - panel hidden (has the platform_fingerprint migration run?)",
        websiteId,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return null;
  }
}

async function queryPlatformStack(websiteId: string): Promise<PlatformStack | null> {
  const pages = await prisma.monitoredPage.findMany({
    where: { websiteId, enabled: true },
    select: {
      id: true,
      snapshots: {
        where: { errorCode: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { platformFingerprint: true },
      },
    },
  });

  const merged = new Map<string, PlatformFingerprint["components"][number]>();
  let pagesRead = 0;
  let assetsSeen = 0;
  let assetsVersioned = 0;
  let platform: PlatformFingerprint["platform"] = null;

  for (const page of pages) {
    const fp = parseFingerprint(page.snapshots[0]?.platformFingerprint);
    if (!fp) continue;
    pagesRead++;
    assetsSeen += fp.assetsSeen;
    assetsVersioned += fp.assetsVersioned;
    if (fp.platform) platform = fp.platform;
    for (const component of fp.components) {
      const id = `${component.kind}:${component.slug}`;
      const existing = merged.get(id);
      // Newest version wins: a stale cached asset on one page must not make the
      // whole site look out of date.
      if (!existing || compareVersions(existing.version, component.version) < 0) {
        merged.set(id, component);
      }
    }
  }

  if (pagesRead === 0) return null;

  const kindOrder = { core: 0, theme: 1, plugin: 2 } as const;
  const components = [...merged.values()].sort(
    (a, b) => kindOrder[a.kind] - kindOrder[b.kind] || a.name.localeCompare(b.name),
  );

  return {
    fingerprint: { platform, components, assetsSeen, assetsVersioned },
    pagesRead,
    assetsSeen,
    assetsVersioned,
  };
}
