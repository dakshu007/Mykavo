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
