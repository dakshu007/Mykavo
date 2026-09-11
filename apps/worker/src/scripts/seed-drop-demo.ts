/**
 * Dev utility: write a synthetic traffic drop so the "What changed before the
 * drop" panel can be seen rendering with live plumbing.
 *
 *   pnpm --filter worker exec tsx src/scripts/seed-drop-demo.ts --seed <websiteId> [pageUrl]
 *   pnpm --filter worker exec tsx src/scripts/seed-drop-demo.ts --clear <websiteId>
 *
 * Why this exists: the detector deliberately ignores pages with fewer than
 * DROP_RULES.minBaselineClicks clicks in the baseline, so a small site can be
 * wired up perfectly and still show nothing - which is indistinguishable from
 * being broken. This produces the one condition real data has not yet
 * supplied, using REAL change events on a REAL monitored page, so everything
 * except the click counts is the production path.
 *
 * Only the click/impression/position numbers are invented. gsc_page_daily is a
 * cache of Google's data: `--clear` empties it for the website and the next
 * Search Console sync rebuilds it from the API, so nothing is lost for good.
 */

import "dotenv/config";
import { prisma } from "@mykavo/database";
import {
  detectTrafficDrop,
  normalizeUrl,
  DROP_RULES,
  type PageDailyPoint,
  type PageChange,
} from "@mykavo/shared";

const DAY_MS = 86_400_000;
/** Baseline + window + a few days of slack, matching what the loaders read. */
const TOTAL_DAYS = DROP_RULES.windowDays + DROP_RULES.baselineDays + 7;

/** Invented traffic. Healthy, then a cliff two days into the recent window. */
const BASELINE_CLICKS = 6;
const AFTER_CLICKS = 1;
const BASELINE_POSITION = 4.2;
const AFTER_POSITION = 12.6;

/** MUST match apps/web/src/lib/traffic-drops.ts, or the join is a fiction. */
function key(url: string): string {
  try {
    return normalizeUrl(new URL(url), { stripAllParams: false });
  } catch {
    return url;
  }
}

function midnightUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function clear(websiteId: string): Promise<void> {
  const { count } = await prisma.gscPageDaily.deleteMany({ where: { websiteId } });
  console.log(`Deleted ${count} gsc_page_daily row(s) for website ${websiteId}.`);
  console.log("Run a Search Console sync to rebuild them from Google's API.");
}

async function seed(websiteId: string, pageUrlArg?: string): Promise<void> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    select: { id: true, name: true, url: true },
  });
  if (!website) {
    console.error(`No website with id ${websiteId}.`);
    process.exitCode = 1;
    return;
  }

  // Pick the monitored page with the most recorded changes: the panel is worth
  // nothing if it has no changes to attribute the drop to.
  const pages = await prisma.monitoredPage.findMany({
    where: { websiteId, ...(pageUrlArg ? { url: pageUrlArg } : {}) },
    select: {
      id: true,
      url: true,
      _count: { select: { changeEvents: true } },
    },
  });
  if (pages.length === 0) {
    console.error(
      pageUrlArg
        ? `No monitored page with url ${pageUrlArg} on this website.`
        : "This website has no monitored pages.",
    );
    process.exitCode = 1;
    return;
  }
  const page = [...pages].sort((a, b) => b._count.changeEvents - a._count.changeEvents)[0];

  const changes = await prisma.changeEvent.findMany({
    where: { monitoredPageId: page.id },
    orderBy: { detectedAt: "desc" },
    select: { id: true, detectedAt: true, category: true, severity: true, title: true },
  });

  const today = midnightUtc(new Date());
  // Place the drop's onset just AFTER a real change, so the panel attributes it
  // to something that genuinely happened. The detector puts the onset on the
  // third day of the recent window, so the series must end six days after the
  // change - clamped to today, since dating rows in the future would be a lie
  // of a different kind.
  const anchor = changes.find((c) => midnightUtc(c.detectedAt).getTime() <= today.getTime() - 4 * DAY_MS);
  const endDate = anchor
    ? new Date(Math.min(today.getTime(), midnightUtc(anchor.detectedAt).getTime() + 6 * DAY_MS))
    : today;

  const rows: { date: Date; clicks: number; impressions: number; ctr: number; position: number }[] = [];
  for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
    const date = new Date(endDate.getTime() - i * DAY_MS);
    // i < windowDays is the recent window; the fall starts two days into it.
    const dropped = i < DROP_RULES.windowDays - 2;
    const clicks = dropped ? AFTER_CLICKS : BASELINE_CLICKS;
    const position = dropped ? AFTER_POSITION : BASELINE_POSITION;
    const impressions = clicks * 40;
    rows.push({
      date,
      clicks,
      impressions,
      ctr: impressions === 0 ? 0 : clicks / impressions,
      position,
    });
  }

  await prisma.$transaction([
    prisma.gscPageDaily.deleteMany({ where: { websiteId, page: page.url } }),
    prisma.gscPageDaily.createMany({
      data: rows.map((r) => ({ websiteId, page: page.url, ...r })),
    }),
  ]);

  console.log(`Seeded ${rows.length} day(s) of synthetic history.`);
  console.log(`  website: ${website.name} (${websiteId})`);
  console.log(`  page:    ${page.url}`);
  console.log(`  dates:   ${iso(rows[0].date)} -> ${iso(rows[rows.length - 1].date)}`);
  console.log(`  changes on this page: ${changes.length}`);

  // Prove it rather than assert it: run the same detector the dashboard runs,
  // over the rows just written, joined exactly the way production joins them.
  const series: PageDailyPoint[] = rows.map((r) => ({
    date: iso(r.date),
    clicks: r.clicks,
    impressions: r.impressions,
    position: r.position,
  }));
  const pageChanges: PageChange[] = changes.map((c) => ({
    id: c.id,
    detectedAt: c.detectedAt,
    category: c.category,
    severity: c.severity as PageChange["severity"],
    title: c.title,
  }));
  const drop = detectTrafficDrop(key(page.url), series, pageChanges);

  if (!drop) {
    console.error("\nThe detector still reports no drop. The seeded shape is wrong - do not");
    console.error("trust the dashboard to show anything. Fix this script before looking.");
    process.exitCode = 1;
    return;
  }

  console.log(
    `\ndetector says: -${drop.dropPercent}% from ${drop.onsetDate} · ` +
      `${drop.clicksBefore} → ${drop.clicksAfter} clicks · ` +
      `position ${drop.positionBefore} → ${drop.positionAfter} · ${drop.confidence}`,
  );
  for (const suspect of drop.suspects.slice(0, 5)) {
    console.log(`  [${suspect.severity}] ${suspect.title} (${suspect.daysBefore}d before)`);
  }
  if (drop.suspects.length === 0) {
    console.log("  no suspects - the panel will render its 'No change found' state");
  }
  console.log(`\nOpen /dashboard/search-console/${websiteId} to see it.`);
  console.log(`Undo with: --clear ${websiteId}`);
}

async function main(): Promise<void> {
  const [mode, websiteId, pageUrl] = process.argv.slice(2);
  if ((mode !== "--seed" && mode !== "--clear") || !websiteId) {
    console.error("usage: seed-drop-demo.ts --seed <websiteId> [pageUrl]");
    console.error("       seed-drop-demo.ts --clear <websiteId>");
    process.exitCode = 1;
    return;
  }
  if (mode === "--clear") return clear(websiteId);
  return seed(websiteId, pageUrl);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
