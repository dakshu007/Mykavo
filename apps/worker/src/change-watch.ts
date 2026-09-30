/**
 * Quick change checks between full scans.
 *
 * Full scans run on each website's schedule - weekly on Free - so a site
 * redesigned the day after its scan went unnoticed for almost a week. This
 * sweep closes that gap cheaply: every monitored page gets one plain,
 * SSRF-safe GET (no browser, no screenshot), reduced to a fingerprint of
 * what a visitor would notice. When a page's fingerprint moves, the website
 * gets a full scan straight away, and the full scan's comparison against the
 * approved baseline decides what is reported. This sweep never creates
 * change events or sends anything itself.
 *
 * Fingerprints live in memory. After a worker restart the first round only
 * records, and the regular scan schedule still covers that window - which is
 * the price of needing no database migration for a cache.
 */

import type { PgBoss } from "pg-boss";
import { prisma, getWorkspaceEntitlement } from "@mykavo/database";
import {
  SCAN_WEBSITE_QUEUE,
  compareFingerprints,
  fingerprintPage,
  safeFetch,
  type PageFingerprint,
} from "@mykavo/shared";
import { logger } from "./logger";

const HOUR_MS = 60 * 60 * 1000;

/** How often each website is checked. */
const CHECK_INTERVAL_MS = { paid: 1 * HOUR_MS, free: 6 * HOUR_MS };
/**
 * Minimum gap between a website's last scan (of any kind) and one this sweep
 * starts. Bounds the browser cost of a site that changes constantly.
 */
const RESCAN_COOLDOWN_MS = { paid: 3 * HOUR_MS, free: 24 * HOUR_MS };

/** Pages checked per website per round, oldest first (the homepage leads). */
const PAGES_PER_WEBSITE = 15;
/**
 * Websites checked per sweep; the least recently checked go first. With the
 * page cap and fetch timeout this bounds a sweep to ~10 minutes even when
 * every page times out, and about a minute normally.
 */
const WEBSITES_PER_SWEEP = 25;
/** Concurrent page fetches across the whole sweep. */
const FETCH_CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 10_000;
const FETCH_MAX_BYTES = 3 * 1024 * 1024;

/** monitoredPageId -> fingerprint at the last check. */
const fingerprints = new Map<string, PageFingerprint>();
/** websiteId -> when it was last checked (ms). */
const lastChecked = new Map<string, number>();

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function fetchFingerprint(url: string): Promise<PageFingerprint | null> {
  try {
    const res = await safeFetch(url, { timeoutMs: FETCH_TIMEOUT_MS, maxBytes: FETCH_MAX_BYTES });
    const type = res.headers.get("content-type") ?? "";
    if (type && !/html|xml/i.test(type)) return null;
    return fingerprintPage(res.body, res.status, res.finalUrl);
  } catch {
    // Unreachable right now: the site-health sweep reports downtime, and a
    // missing fingerprint just means this page sits the round out.
    return null;
  }
}

let running = false;

export async function runChangeWatchSweep(boss: PgBoss, now = new Date()): Promise<number> {
  // One sweep at a time: a slow round must not overlap the next cron tick.
  if (running) return 0;
  running = true;
  try {
    return await sweep(boss, now);
  } finally {
    running = false;
  }
}

async function sweep(boss: PgBoss, now: Date): Promise<number> {
  const websites = await prisma.website.findMany({
    where: {
      status: "ACTIVE",
      monitoredPages: { some: { enabled: true } },
      // Muted for maintenance: changes are expected, so skip the extra scans.
      OR: [{ muteAlertsUntil: null }, { muteAlertsUntil: { lt: now } }],
    },
    select: {
      id: true,
      workspaceId: true,
      monitoredPages: {
        where: { enabled: true },
        select: { id: true, url: true },
        orderBy: { createdAt: "asc" },
        take: PAGES_PER_WEBSITE,
      },
    },
  });

  // Least recently checked first, so a large account cannot starve the rest.
  websites.sort((a, b) => (lastChecked.get(a.id) ?? 0) - (lastChecked.get(b.id) ?? 0));

  const tierCache = new Map<string, "paid" | "free">();
  async function tierOf(workspaceId: string): Promise<"paid" | "free"> {
    const cached = tierCache.get(workspaceId);
    if (cached) return cached;
    const entitlement = await getWorkspaceEntitlement(prisma, workspaceId).catch(() => null);
    const tier = entitlement && entitlement.planId !== "free" ? "paid" : "free";
    tierCache.set(workspaceId, tier);
    return tier;
  }

  const due: typeof websites = [];
  for (const website of websites) {
    if (due.length >= WEBSITES_PER_SWEEP) break;
    const last = lastChecked.get(website.id);
    const elapsed = last === undefined ? Infinity : now.getTime() - last;
    if (elapsed < CHECK_INTERVAL_MS.paid) continue;
    // Only the window between the two intervals depends on the plan, so the
    // plan is looked up only there.
    if (elapsed < CHECK_INTERVAL_MS.free && (await tierOf(website.workspaceId)) === "free") continue;
    due.push(website);
  }
  if (due.length === 0) return 0;

  // Fetch every due page with one global concurrency cap.
  const jobs = due.flatMap((w) => w.monitoredPages.map((p) => ({ websiteId: w.id, page: p })));
  const fetched = await mapLimit(jobs, FETCH_CONCURRENCY, async (job) => ({
    ...job,
    fingerprint: await fetchFingerprint(job.page.url),
  }));

  let triggered = 0;
  for (const website of due) {
    lastChecked.set(website.id, now.getTime());
    const results = fetched.filter((f) => f.websiteId === website.id);

    const changed: Array<{ pageId: string; url: string; reasons: string[] }> = [];
    for (const r of results) {
      if (!r.fingerprint) continue;
      const previous = fingerprints.get(r.page.id);
      if (!previous) continue;
      const verdict = compareFingerprints(previous, r.fingerprint);
      if (verdict.changed) changed.push({ pageId: r.page.id, url: r.page.url, reasons: verdict.reasons });
    }

    const commit = (skip: Set<string>) => {
      for (const r of results) {
        if (r.fingerprint && !skip.has(r.page.id)) fingerprints.set(r.page.id, r.fingerprint);
      }
    };

    if (changed.length === 0) {
      commit(new Set());
      continue;
    }

    try {
      const tier = await tierOf(website.workspaceId);
      const [active, latest] = await Promise.all([
        prisma.scan.findFirst({
          where: { websiteId: website.id, status: { in: ["QUEUED", "RUNNING"] } },
          select: { id: true },
        }),
        prisma.scan.findFirst({
          where: { websiteId: website.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ]);
      const coolingDown =
        latest !== null && now.getTime() - latest.createdAt.getTime() < RESCAN_COOLDOWN_MS[tier];

      if (active) {
        // A scan is already on its way and will see the change. Record it.
        commit(new Set());
        continue;
      }
      if (coolingDown) {
        // Keep the OLD fingerprints for the changed pages, so the change is
        // still detected - and scanned - once the cooldown has passed.
        commit(new Set(changed.map((c) => c.pageId)));
        logger.info("change watch: change seen, rescan cooling down", {
          websiteId: website.id,
          pages: changed.length,
        });
        continue;
      }

      const scan = await prisma.scan.create({
        data: { websiteId: website.id, triggerType: "SCHEDULED", status: "QUEUED" },
      });
      await boss.send(SCAN_WEBSITE_QUEUE, { scanId: scan.id });
      commit(new Set());
      triggered++;
      logger.info("change watch: page changed, full scan started", {
        websiteId: website.id,
        workspaceId: website.workspaceId,
        scanId: scan.id,
        pages: changed
          .slice(0, 5)
          .map((c) => `${c.url} (${c.reasons.join(", ")})`)
          .join("; "),
        changedPages: changed.length,
      });
    } catch (err) {
      logger.error("change watch: could not start scan", { websiteId: website.id }, err);
    }
  }

  // Forget pages that are no longer watched (deleted, disabled, paused).
  const watched = new Set(websites.flatMap((w) => w.monitoredPages.map((p) => p.id)));
  for (const pageId of fingerprints.keys()) if (!watched.has(pageId)) fingerprints.delete(pageId);
  const watchedSites = new Set(websites.map((w) => w.id));
  for (const websiteId of lastChecked.keys()) if (!watchedSites.has(websiteId)) lastChecked.delete(websiteId);

  logger.info("change watch sweep completed", {
    websites: due.length,
    pages: jobs.length,
    fingerprinted: fetched.filter((f) => f.fingerprint).length,
    triggered,
  });
  return triggered;
}
