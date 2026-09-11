import { prisma } from "@mykavo/database";
import {
  findTrafficDrops,
  DROP_RULES,
  type PageDailyPoint,
  type PageChange,
  type TrafficDrop,
} from "@mykavo/shared";
import { normalizeUrl } from "@/lib/url";

/**
 * Loads the two halves of "what changed before the drop?" and joins them.
 *
 * Search Console reports a page as a URL string; MyKavo records a change
 * against a MonitoredPage. The join is on the normalized URL, because the two
 * sides disagree about trailing slashes and query strings often enough that a
 * literal match silently finds nothing - which would look exactly like "no
 * changes were detected" and quietly make the whole feature useless.
 */

/** Enough history for the detector's window plus a few days of slack. */
const HISTORY_DAYS = DROP_RULES.windowDays + DROP_RULES.baselineDays + 5;

function key(url: string): string {
  try {
    return normalizeUrl(new URL(url), { stripAllParams: false });
  } catch {
    return url;
  }
}

export async function loadTrafficDrops(websiteId: string): Promise<TrafficDrop[]> {
  try {
    return await queryTrafficDrops(websiteId);
  } catch (err) {
    // gsc_page_daily arrives in a migration, and CI deploys the web app the
    // moment this is pushed - so there is a window where the code is live and
    // the table is not. This panel is additive: hiding it degrades the page to
    // exactly what it showed yesterday, whereas an unhandled error would take
    // the whole Search Console dashboard down.
    //
    // It is logged loudly because "no drops found" and "the query failed" must
    // never look the same from the outside - the section renders nothing at
    // all rather than claiming a clean bill of health.
    console.error(
      JSON.stringify({
        level: "error",
        app: "traffic-drops",
        msg: "traffic drop query failed - section hidden (has the gsc_page_daily migration run?)",
        websiteId,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return [];
  }
}

async function queryTrafficDrops(websiteId: string): Promise<TrafficDrop[]> {
  const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000);
  // Changes are looked for further back than the traffic window, since a
  // change can precede the drop it caused by up to lookbackDays.
  const changesSince = new Date(
    Date.now() - (HISTORY_DAYS + DROP_RULES.lookbackDays) * 86_400_000,
  );

  const [rows, changes] = await Promise.all([
    prisma.gscPageDaily.findMany({
      where: { websiteId, date: { gte: since } },
      orderBy: { date: "asc" },
      select: { page: true, date: true, clicks: true, impressions: true, position: true },
    }),
    prisma.changeEvent.findMany({
      where: {
        websiteId,
        detectedAt: { gte: changesSince },
        monitoredPageId: { not: null },
      },
      orderBy: { detectedAt: "desc" },
      select: {
        id: true,
        detectedAt: true,
        category: true,
        severity: true,
        title: true,
        monitoredPage: { select: { url: true } },
      },
    }),
  ]);

  if (rows.length === 0) return [];

  const seriesByPage = new Map<string, PageDailyPoint[]>();
  // Keyed by normalized URL for the join, but the ORIGINAL URL is kept for
  // display - nobody wants to read a normalized URL in a report.
  const displayUrl = new Map<string, string>();
  for (const row of rows) {
    const k = key(row.page);
    displayUrl.set(k, row.page);
    const list = seriesByPage.get(k) ?? [];
    list.push({
      date: row.date.toISOString().slice(0, 10),
      clicks: row.clicks,
      impressions: row.impressions,
      position: row.position,
    });
    seriesByPage.set(k, list);
  }

  const changesByPage = new Map<string, PageChange[]>();
  for (const change of changes) {
    if (!change.monitoredPage) continue;
    const k = key(change.monitoredPage.url);
    const list = changesByPage.get(k) ?? [];
    list.push({
      id: change.id,
      detectedAt: change.detectedAt,
      category: change.category,
      severity: change.severity,
      title: change.title,
    });
    changesByPage.set(k, list);
  }

  return findTrafficDrops(seriesByPage, changesByPage).map((drop) => ({
    ...drop,
    page: displayUrl.get(drop.page) ?? drop.page,
  }));
}
