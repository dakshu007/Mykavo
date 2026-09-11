/**
 * Google Search Console sync. Per website with a connected property:
 * refresh the OAuth token if stale, pull the 90-day daily series plus the
 * top rows for each dimension over the CURRENT and PREVIOUS 28-day windows,
 * replace stored rows transactionally, then check for traffic drops worth
 * alerting on. Runs daily via cron sweep and on-demand via GSC_SYNC_QUEUE.
 */

import { prisma, Prisma, type GscConnection } from "@mykavo/database";
import {
  decryptToken,
  encryptToken,
  refreshAccessToken,
  querySearchAnalytics,
  gscDate,
  type GscSyncJob,
} from "@mykavo/shared";
import { sendEmail } from "@mykavo/email";
import { resolveEmailConfig } from "./notify";
import { logger } from "./logger";

const KEY = process.env.GSC_TOKEN_KEY ?? "";
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

const DIMENSIONS: { api: string; stored: "QUERY" | "PAGE" | "COUNTRY" | "DEVICE" | "APPEARANCE" }[] = [
  { api: "query", stored: "QUERY" },
  { api: "page", stored: "PAGE" },
  { api: "country", stored: "COUNTRY" },
  { api: "device", stored: "DEVICE" },
  { api: "searchAppearance", stored: "APPEARANCE" },
];

/** Decrypt + refresh-if-needed; persists rotated tokens. */
async function freshAccessToken(connection: GscConnection): Promise<string> {
  if (connection.expiresAt > new Date(Date.now() + 2 * 60 * 1000)) {
    return decryptToken(connection.accessTokenEnc, KEY);
  }
  const tokens = await refreshAccessToken({
    refreshToken: decryptToken(connection.refreshTokenEnc, KEY),
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
  });
  await prisma.gscConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEnc: encryptToken(tokens.accessToken, KEY),
      expiresAt: tokens.expiresAt,
      ...(tokens.refreshToken
        ? { refreshTokenEnc: encryptToken(tokens.refreshToken, KEY) }
        : {}),
    },
  });
  return tokens.accessToken;
}

/**
 * How many pages get per-day history. 50 x 90 days is 4,500 rows per site,
 * replaced wholesale each sync. The cap exists because a large site has
 * thousands of URLs and almost all of them earn too little search traffic for
 * a drop to mean anything - the detector skips them anyway (see
 * DROP_RULES.minBaselineClicks).
 */
const PAGE_DAILY_LIMIT = 50;

export async function runGscSync(job: GscSyncJob): Promise<void> {
  if (!KEY || !CLIENT_ID || !CLIENT_SECRET) {
    logger.warn("gsc sync skipped - GOOGLE_CLIENT_ID/SECRET or GSC_TOKEN_KEY unset");
    return;
  }
  const connection = await prisma.gscConnection.findUnique({
    where: { websiteId: job.websiteId },
    include: { website: { select: { id: true, name: true, url: true, workspaceId: true } } },
  });
  if (!connection?.property) return;

  try {
    const accessToken = await freshAccessToken(connection);
    const property = connection.property;

    // GSC data lags ~2 days; anchor windows to that.
    const end = gscDate(2);
    const daily = await querySearchAnalytics({
      accessToken, property, dimensions: ["date"],
      startDate: gscDate(92), endDate: end, rowLimit: 100,
    });

    // Per-PAGE daily history - the series behind "what changed before the
    // drop?". One request for the whole 90 days with both dimensions; Google
    // returns rows ordered by clicks descending, so a site that exceeds the
    // row limit loses its quietest pages, which are the ones the detector
    // would skip regardless.
    const pageDaily = await querySearchAnalytics({
      accessToken, property, dimensions: ["date", "page"],
      startDate: gscDate(92), endDate: end, rowLimit: 25_000,
    });

    // Keep only the busiest pages. Ranking on total clicks across the whole
    // window, not on any single day, so one viral Tuesday does not evict a
    // page that earns steadily.
    const clicksByPage = new Map<string, number>();
    for (const row of pageDaily) {
      const page = row.keys[1] ?? "";
      if (!page) continue;
      clicksByPage.set(page, (clicksByPage.get(page) ?? 0) + row.clicks);
    }
    const keptPages = new Set(
      [...clicksByPage.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, PAGE_DAILY_LIMIT)
        .map(([page]) => page),
    );
    const pageDailyRows: Prisma.GscPageDailyCreateManyInput[] = [];
    for (const row of pageDaily) {
      const date = row.keys[0];
      const page = row.keys[1] ?? "";
      if (!date || !page || !keptPages.has(page)) continue;
      pageDailyRows.push({
        websiteId: connection.websiteId,
        date: new Date(date),
        page,
        clicks: Math.round(row.clicks),
        impressions: Math.round(row.impressions),
        ctr: row.ctr,
        position: row.position,
      });
    }

    const windows: { period: "CURRENT" | "PREVIOUS"; start: string; endDate: string }[] = [
      { period: "CURRENT", start: gscDate(30), endDate: end },
      { period: "PREVIOUS", start: gscDate(58), endDate: gscDate(30) },
    ];
    const dimensionRows: Prisma.GscDimensionRowCreateManyInput[] = [];
    for (const dim of DIMENSIONS) {
      for (const window of windows) {
        const rows = await querySearchAnalytics({
          accessToken, property, dimensions: [dim.api],
          startDate: window.start, endDate: window.endDate, rowLimit: 100,
        });
        for (const row of rows) {
          dimensionRows.push({
            websiteId: connection.websiteId,
            dimension: dim.stored,
            period: window.period,
            key: row.keys[0] ?? "",
            clicks: Math.round(row.clicks),
            impressions: Math.round(row.impressions),
            ctr: row.ctr,
            position: row.position,
          });
        }
      }
    }

    await prisma.$transaction([
      prisma.gscDaily.deleteMany({ where: { websiteId: connection.websiteId } }),
      prisma.gscDaily.createMany({
        data: daily.map((row) => ({
          websiteId: connection.websiteId,
          date: new Date(row.keys[0]),
          clicks: Math.round(row.clicks),
          impressions: Math.round(row.impressions),
          ctr: row.ctr,
          position: row.position,
        })),
      }),
      prisma.gscDimensionRow.deleteMany({ where: { websiteId: connection.websiteId } }),
      prisma.gscDimensionRow.createMany({ data: dimensionRows }),
      prisma.gscPageDaily.deleteMany({ where: { websiteId: connection.websiteId } }),
      prisma.gscPageDaily.createMany({ data: pageDailyRows }),
      prisma.gscConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date(), lastError: null },
      }),
    ]);

    // Drop alert: last 7 full days vs the 7 before (meaningful volume only).
    const recent = daily.slice(-7);
    const prior = daily.slice(-14, -7);
    const sum = (rows: typeof daily) => rows.reduce((total, r) => total + r.clicks, 0);
    const recentClicks = sum(recent);
    const priorClicks = sum(prior);
    if (priorClicks >= 50 && recentClicks < priorClicks * 0.6) {
      const config = await resolveEmailConfig(connection.website.workspaceId);
      if (config) {
        const host = new URL(connection.website.url).hostname;
        const drop = Math.round((1 - recentClicks / priorClicks) * 100);
        await sendEmail({
          to: config.recipients,
          subject: `Search clicks down ${drop}% on ${host}`,
          html: `<p>Google Search clicks on <b>${host}</b> fell from ${priorClicks} to ${recentClicks} week over week (${drop}% drop).</p><p>Open the Search Console tab in MyKavo to see which pages and queries lost traffic - Priority Opportunities will point at likely causes.</p>`,
          text: `Search clicks on ${host} fell from ${priorClicks} to ${recentClicks} week over week (${drop}% drop). Open MyKavo's Search Console tab for the breakdown.`,
        });
        logger.info("gsc drop alert sent", { websiteId: connection.websiteId, drop });
      }
    }

    logger.info("gsc sync completed", {
      websiteId: connection.websiteId,
      workspaceId: connection.website.workspaceId,
      dailyRows: daily.length,
      dimensionRows: dimensionRows.length,
    });
  } catch (err) {
    await prisma.gscConnection.update({
      where: { id: connection.id },
      data: { lastError: err instanceof Error ? err.message.slice(0, 300) : String(err) },
    });
    logger.error("gsc sync failed", { websiteId: connection.websiteId }, err);
  }
}

/** Daily sweep: sync every connected property. */
export async function runGscSweep(): Promise<void> {
  const connections = await prisma.gscConnection.findMany({
    where: { property: { not: null } },
    select: { websiteId: true },
  });
  for (const connection of connections) {
    await runGscSync({ websiteId: connection.websiteId });
  }
  logger.info("gsc sweep finished", { connections: connections.length });
}
