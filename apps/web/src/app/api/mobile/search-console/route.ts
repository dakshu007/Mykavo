import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext } from "@/lib/api-auth";

/**
 * Search Console figures for the phone.
 *
 * Reads only MyKavo's own tables. The worker already syncs Google's data into
 * gsc_daily and gsc_dimension_row, so this route never touches Google - which
 * means it cannot spend the OAuth quota, cannot fail because a token needs
 * refreshing, and answers in milliseconds. A phone screen is exactly the
 * wrong place to discover that a refresh token expired.
 *
 * One request returns every connected website, because the app lets you flip
 * between them in a picker: three sites is one round trip, not three, and
 * switching is then instant with no spinner.
 */

/** GSC keeps a 28-day window for the dimension tables; totals match it. */
const WINDOW_DAYS = 28;

interface Totals {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

function sum(rows: { clicks: number; impressions: number; position: number }[]): Totals {
  if (rows.length === 0) return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const clicks = rows.reduce((total, row) => total + row.clicks, 0);
  const impressions = rows.reduce((total, row) => total + row.impressions, 0);
  return {
    clicks,
    impressions,
    // Recomputed from the totals rather than averaged from the daily CTRs:
    // averaging ratios weights a 3-impression day the same as a 3,000-
    // impression one, which is how a site's CTR ends up reading as double
    // what Search Console shows.
    ctr: impressions > 0 ? clicks / impressions : 0,
    // Position IS a mean, but weighted by impressions - an unweighted mean
    // lets a day with two impressions drag the whole figure.
    position:
      impressions > 0
        ? rows.reduce((total, row) => total + row.position * row.impressions, 0) / impressions
        : 0,
  };
}

export async function GET() {
  // Same workspace resolution as every other /api/mobile route, so the
  // website picker here matches the one on Overview rather than quietly
  // disagreeing about which workspace is active.
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = await prisma.gscConnection.findMany({
    where: { website: { workspaceId: ctx.workspace.id } },
    select: {
      websiteId: true,
      property: true,
      lastSyncAt: true,
      lastError: true,
      website: { select: { id: true, name: true, url: true } },
    },
    orderBy: { website: { name: "asc" } },
  });

  if (connections.length === 0) {
    return NextResponse.json({ websites: [] });
  }

  const websiteIds = connections.map((connection) => connection.websiteId);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - WINDOW_DAYS * 2);

  const [daily, dimensionRows] = await Promise.all([
    prisma.gscDaily.findMany({
      where: { websiteId: { in: websiteIds }, date: { gte: since } },
      orderBy: { date: "asc" },
    }),
    prisma.gscDimensionRow.findMany({
      where: {
        websiteId: { in: websiteIds },
        dimension: { in: ["QUERY", "PAGE"] },
      },
    }),
  ]);

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - WINDOW_DAYS);

  const websites = connections.map((connection) => {
    const rows = daily.filter((row) => row.websiteId === connection.websiteId);
    const current = rows.filter((row) => row.date >= cutoff);
    const previous = rows.filter((row) => row.date < cutoff);

    const dim = (dimension: "QUERY" | "PAGE", period: "CURRENT" | "PREVIOUS") =>
      dimensionRows
        .filter(
          (row) =>
            row.websiteId === connection.websiteId &&
            row.dimension === dimension &&
            row.period === period,
        )
        .sort((a, b) => b.clicks - a.clicks);

    // Previous-period clicks by key, so each row can show its own movement.
    const prevClicks = (dimension: "QUERY" | "PAGE") =>
      new Map(dim(dimension, "PREVIOUS").map((row) => [row.key, row.clicks]));

    const top = (dimension: "QUERY" | "PAGE", limit: number) => {
      const before = prevClicks(dimension);
      return dim(dimension, "CURRENT")
        .slice(0, limit)
        .map((row) => ({
          key: row.key,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
          // null, not 0: "we have no previous figure for this query" and "it
          // did not move" are different facts, and a phone has no room to
          // explain the difference in prose.
          clicksDelta: before.has(row.key) ? row.clicks - (before.get(row.key) ?? 0) : null,
        }));
    };

    return {
      websiteId: connection.website.id,
      name: connection.website.name,
      url: connection.website.url,
      property: connection.property,
      lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
      lastError: connection.lastError,
      windowDays: WINDOW_DAYS,
      current: sum(current),
      previous: sum(previous),
      // Sparkline input, oldest first.
      trend: current.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        clicks: row.clicks,
        impressions: row.impressions,
      })),
      topQueries: top("QUERY", 10),
      topPages: top("PAGE", 10),
    };
  });

  return NextResponse.json({ websites });
}
