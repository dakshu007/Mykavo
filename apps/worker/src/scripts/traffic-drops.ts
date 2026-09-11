/**
 * Dev utility: run the traffic-drop detector against stored Search Console
 * history and print what it sees, including the pages it SKIPPED and why.
 *
 *   pnpm --filter worker exec tsx src/scripts/traffic-drops.ts [websiteId]
 *
 * Exists because "no drops detected" has several very different causes - no
 * synced history, pages too quiet to judge, or genuinely stable traffic - and
 * from the dashboard they all look identical: an absent section.
 */

import "dotenv/config";
import { prisma } from "@mykavo/database";
import {
  findTrafficDrops,
  normalizeUrl,
  DROP_RULES,
  type PageDailyPoint,
  type PageChange,
} from "@mykavo/shared";

/**
 * MUST match apps/web/src/lib/traffic-drops.ts. A diagnostic that joins
 * differently from production reports on a system that does not exist - it
 * would show "no change detected" for a page the real feature matches
 * perfectly, or the reverse.
 */
function key(url: string): string {
  try {
    return normalizeUrl(new URL(url), { stripAllParams: false });
  } catch {
    return url;
  }
}

const HISTORY_DAYS = DROP_RULES.windowDays + DROP_RULES.baselineDays + 5;

async function main(): Promise<void> {
  const websiteId = process.argv[2];
  const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000);

  const rows = await prisma.gscPageDaily.findMany({
    where: { ...(websiteId ? { websiteId } : {}), date: { gte: since } },
    orderBy: { date: "asc" },
  });
  if (rows.length === 0) {
    console.log("No per-page Search Console history stored.");
    console.log("Connect a property and run a sync, then try again.");
    return;
  }

  const changes = await prisma.changeEvent.findMany({
    where: {
      ...(websiteId ? { websiteId } : {}),
      detectedAt: { gte: new Date(Date.now() - (HISTORY_DAYS + DROP_RULES.lookbackDays) * 86_400_000) },
      monitoredPageId: { not: null },
    },
    select: {
      id: true, detectedAt: true, category: true, severity: true, title: true,
      monitoredPage: { select: { url: true } },
    },
  });

  const series = new Map<string, PageDailyPoint[]>();
  for (const row of rows) {
    const list = series.get(key(row.page)) ?? [];
    list.push({
      date: row.date.toISOString().slice(0, 10),
      clicks: row.clicks,
      impressions: row.impressions,
      position: row.position,
    });
    series.set(key(row.page), list);
  }

  const changesByPage = new Map<string, PageChange[]>();
  for (const change of changes) {
    if (!change.monitoredPage) continue;
    const list = changesByPage.get(key(change.monitoredPage.url)) ?? [];
    list.push({
      id: change.id,
      detectedAt: change.detectedAt,
      category: change.category,
      severity: change.severity,
      title: change.title,
    });
    changesByPage.set(key(change.monitoredPage.url), list);
  }

  console.log(`pages with history: ${series.size}`);
  console.log(`change events in window: ${changes.length}`);
  console.log(`minimum baseline clicks to qualify: ${DROP_RULES.minBaselineClicks}\n`);

  // The skipped pages matter as much as the drops: "too quiet" is the usual
  // reason a small site sees nothing, and it is not a fault.
  for (const [page, points] of [...series].sort(
    (a, b) =>
      b[1].reduce((s, p) => s + p.clicks, 0) - a[1].reduce((s, p) => s + p.clicks, 0),
  )) {
    const total = points.reduce((sum, p) => sum + p.clicks, 0);
    const baseline = points
      .slice(-(DROP_RULES.windowDays + DROP_RULES.baselineDays), -DROP_RULES.windowDays)
      .reduce((sum, p) => sum + p.clicks, 0);
    const quiet = baseline < DROP_RULES.minBaselineClicks;
    console.log(
      `  ${String(total).padStart(5)} clicks  ${quiet ? "(too quiet)" : "           "}  ${page}`,
    );
  }

  // THE JOIN. If Search Console's page URLs do not resolve to the same key as
  // the monitored page URLs, every drop will forever report "no change found"
  // - indistinguishable from a page that genuinely did not change. Worth
  // checking explicitly rather than inferring from an empty result.
  console.log("\njoin check (Search Console page -> monitored page):");
  let matched = 0;
  for (const page of series.keys()) {
    const hits = changesByPage.get(page)?.length ?? 0;
    if (hits > 0) matched++;
    console.log(`  ${hits > 0 ? "OK  " : "----"}  ${String(hits).padStart(3)} changes  ${page}`);
  }
  if (matched === 0 && changesByPage.size > 0) {
    console.log("\n  WARNING: no Search Console page matched any monitored page.");
    console.log("  Change events exist but none can ever be attributed. Monitored page keys:");
    for (const k of [...changesByPage.keys()].slice(0, 5)) console.log(`    ${k}`);
  }

  const drops = findTrafficDrops(series, changesByPage);
  console.log(`\ndrops detected: ${drops.length}`);
  for (const drop of drops) {
    console.log(`\n  ${drop.page}`);
    console.log(
      `    -${drop.dropPercent}% from ${drop.onsetDate} · ` +
        `${drop.clicksBefore} → ${drop.clicksAfter} clicks · ` +
        `position ${drop.positionBefore} → ${drop.positionAfter} · ${drop.confidence}`,
    );
    for (const suspect of drop.suspects) {
      console.log(`    [${suspect.severity}] ${suspect.title} (${suspect.daysBefore}d before)`);
    }
    if (drop.suspects.length === 0) {
      console.log("    no change detected on this page beforehand");
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
