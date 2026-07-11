/**
 * Site-health persistence (uptime + SSL expiry). Pure DB helpers — the worker
 * sweep does the probing and decides transitions via @fluxen/shared, then
 * calls these; the web dashboard reads uptime stats server-side. Every
 * function takes a Prisma client or transaction client, matching retention.ts.
 */

import type {
  PrismaClient,
  Prisma,
  HealthCheck,
  HealthIncident,
  HealthIncidentKind,
} from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export interface HealthCheckInput {
  websiteId: string;
  up: boolean;
  httpStatus?: number | null;
  responseTimeMs?: number | null;
  sslValidTo?: Date | null;
  errorCode?: string | null;
  checkedAt?: Date;
}

/** Record one availability probe result. */
export async function recordHealthCheck(db: Db, input: HealthCheckInput): Promise<HealthCheck> {
  return db.healthCheck.create({
    data: {
      websiteId: input.websiteId,
      up: input.up,
      httpStatus: input.httpStatus ?? null,
      responseTimeMs: input.responseTimeMs ?? null,
      sslValidTo: input.sslValidTo ?? null,
      errorCode: input.errorCode ?? null,
      ...(input.checkedAt ? { checkedAt: input.checkedAt } : {}),
    },
  });
}

/** The most recent check for a website, or null when never checked. */
export async function getLatestHealthCheck(
  db: Db,
  websiteId: string,
): Promise<HealthCheck | null> {
  return db.healthCheck.findFirst({
    where: { websiteId },
    orderBy: { checkedAt: "desc" },
  });
}

export interface LatestHealthCheckSummary {
  websiteId: string;
  up: boolean;
  checkedAt: Date;
}

/**
 * Latest check per website across a whole workspace in ONE query (overview
 * dashboard dots — no N+1). Websites never checked are simply absent.
 */
export async function getLatestHealthChecksForWorkspace(
  db: Db,
  workspaceId: string,
): Promise<LatestHealthCheckSummary[]> {
  return db.healthCheck.findMany({
    where: { website: { workspaceId } },
    orderBy: { checkedAt: "desc" },
    distinct: ["websiteId"],
    select: { websiteId: true, up: true, checkedAt: true },
  });
}

/** The open (unresolved) incident of a kind for a website, if any. */
export async function findOpenHealthIncident(
  db: Db,
  websiteId: string,
  kind: HealthIncidentKind,
): Promise<HealthIncident | null> {
  return db.healthIncident.findFirst({
    where: { websiteId, kind, resolvedAt: null },
    orderBy: { openedAt: "desc" },
  });
}

/** Open a new incident. Callers must have checked none is already open. */
export async function openHealthIncident(
  db: Db,
  params: { websiteId: string; kind: HealthIncidentKind; detail?: string | null; openedAt?: Date },
): Promise<HealthIncident> {
  return db.healthIncident.create({
    data: {
      websiteId: params.websiteId,
      kind: params.kind,
      detail: params.detail ?? null,
      ...(params.openedAt ? { openedAt: params.openedAt } : {}),
    },
  });
}

/** Resolve an incident. Guarded update — a no-op if already resolved. */
export async function resolveHealthIncident(
  db: Db,
  incidentId: string,
  resolvedAt: Date = new Date(),
): Promise<boolean> {
  const res = await db.healthIncident.updateMany({
    where: { id: incidentId, resolvedAt: null },
    data: { resolvedAt },
  });
  return res.count === 1;
}

/** Stamp lastNotifiedAt (alert rate limit), optionally refreshing detail. */
export async function markHealthIncidentNotified(
  db: Db,
  incidentId: string,
  notifiedAt: Date = new Date(),
  detail?: string,
): Promise<void> {
  await db.healthIncident.update({
    where: { id: incidentId },
    data: { lastNotifiedAt: notifiedAt, ...(detail !== undefined ? { detail } : {}) },
  });
}

export interface UptimeStats {
  totalChecks: number;
  upChecks: number;
  /** Percentage of checks that were up (0–100), null when no checks exist. */
  uptimePercent: number | null;
  /** Average response time of successful checks, null when none exist. */
  avgResponseTimeMs: number | null;
}

/**
 * Uptime over a window: % of checks up plus average response time of the
 * successful ones, via count/avg aggregation (never loads rows).
 */
export async function getUptimeStats(
  db: Db,
  params: { websiteId: string; since: Date },
): Promise<UptimeStats> {
  const window = { websiteId: params.websiteId, checkedAt: { gte: params.since } };
  const [totalChecks, upChecks, avg] = await Promise.all([
    db.healthCheck.count({ where: window }),
    db.healthCheck.count({ where: { ...window, up: true } }),
    db.healthCheck.aggregate({
      where: { ...window, up: true },
      _avg: { responseTimeMs: true },
    }),
  ]);
  return {
    totalChecks,
    upChecks,
    uptimePercent: totalChecks > 0 ? (upChecks / totalChecks) * 100 : null,
    avgResponseTimeMs: avg._avg.responseTimeMs,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DailyHealthRollup {
  /** UTC calendar day, "YYYY-MM-DD". */
  date: string;
  totalChecks: number;
  upChecks: number;
  /** Percentage of checks that were up (0–100), null when the day has no checks. */
  uptimePercent: number | null;
  /** Average response time of successful checks, null when none exist. */
  avgResponseTimeMs: number | null;
}

interface DailyRollupRow {
  date: string;
  totalChecks: number;
  upChecks: number;
  avgResponseTimeMs: number | null;
}

/**
 * Per-UTC-day uptime rollups for the last N days (uptime day-bar strip), in
 * ONE grouped query. Days without checks are filled in with null percentages
 * so callers always get exactly `days` entries, oldest → newest, ending today.
 *
 * `checkedAt` is a timestamp column holding UTC (Prisma convention), so
 * date_trunc gives the UTC day without any server-timezone dependence. All
 * values are bound parameters — nothing is interpolated into the SQL text.
 */
export async function getDailyHealthRollups(
  db: Db,
  params: { websiteId: string; days: number; now?: Date },
): Promise<DailyHealthRollup[]> {
  const days = Math.max(1, Math.floor(params.days));
  const now = params.now ?? new Date();
  const todayUtcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const since = new Date(todayUtcMs - (days - 1) * DAY_MS);

  const rows = await db.$queryRaw<DailyRollupRow[]>`
    SELECT
      to_char(date_trunc('day', "checkedAt"), 'YYYY-MM-DD') AS "date",
      COUNT(*)::int                                         AS "totalChecks",
      COUNT(*) FILTER (WHERE "up")::int                     AS "upChecks",
      AVG("responseTimeMs") FILTER (WHERE "up")::float8     AS "avgResponseTimeMs"
    FROM "health_check"
    WHERE "websiteId" = ${params.websiteId} AND "checkedAt" >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const out: DailyHealthRollup[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(todayUtcMs - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10);
    const row = byDate.get(date);
    out.push(
      row
        ? {
            date,
            totalChecks: row.totalChecks,
            upChecks: row.upChecks,
            uptimePercent: row.totalChecks > 0 ? (row.upChecks / row.totalChecks) * 100 : null,
            avgResponseTimeMs: row.avgResponseTimeMs,
          }
        : { date, totalChecks: 0, upChecks: 0, uptimePercent: null, avgResponseTimeMs: null },
    );
  }
  return out;
}

export interface ResponseTimeBucket {
  /** Start of the bucket (UTC), aligned to a multiple of bucketMinutes. */
  bucketStart: Date;
  /** Average response time of successful checks in the bucket; null when none. */
  avgResponseTimeMs: number | null;
  totalChecks: number;
}

interface ResponseTimeRow {
  epochSeconds: number;
  avgResponseTimeMs: number | null;
  totalChecks: number;
}

/**
 * Time-bucketed average response times since a cutoff (response-time chart),
 * in ONE grouped query. Buckets are epoch-aligned (floor of checkedAt to a
 * multiple of bucketMinutes) and only buckets containing checks are returned —
 * callers treat missing buckets as gaps. Failed checks count toward
 * totalChecks but never pollute the average.
 */
export async function getResponseTimeSeries(
  db: Db,
  params: { websiteId: string; since: Date; bucketMinutes: number },
): Promise<ResponseTimeBucket[]> {
  const bucketSeconds = Math.max(1, Math.floor(params.bucketMinutes)) * 60;

  const rows = await db.$queryRaw<ResponseTimeRow[]>`
    SELECT
      (floor(extract(epoch FROM "checkedAt") / ${bucketSeconds}) * ${bucketSeconds})::float8
                                                        AS "epochSeconds",
      AVG("responseTimeMs") FILTER (WHERE "up")::float8 AS "avgResponseTimeMs",
      COUNT(*)::int                                     AS "totalChecks"
    FROM "health_check"
    WHERE "websiteId" = ${params.websiteId} AND "checkedAt" >= ${params.since}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  return rows.map((r) => ({
    bucketStart: new Date(r.epochSeconds * 1000),
    avgResponseTimeMs: r.avgResponseTimeMs,
    totalChecks: r.totalChecks,
  }));
}

/** Most recent incidents (open first by recency of openedAt), newest → oldest. */
export async function getRecentHealthIncidents(
  db: Db,
  params: { websiteId: string; limit?: number },
): Promise<HealthIncident[]> {
  return db.healthIncident.findMany({
    where: { websiteId: params.websiteId },
    orderBy: { openedAt: "desc" },
    take: params.limit ?? 10,
  });
}

/**
 * Prune checks older than the cutoff (plan history window — retention sweep).
 * Incidents are kept forever: tiny rows, long-term value. Returns the count.
 */
export async function deleteExpiredHealthChecks(
  db: Db,
  params: { websiteId: string; cutoff: Date },
): Promise<number> {
  const res = await db.healthCheck.deleteMany({
    where: { websiteId: params.websiteId, checkedAt: { lt: params.cutoff } },
  });
  return res.count;
}
