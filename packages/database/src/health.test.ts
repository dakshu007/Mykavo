/**
 * Integration tests for site-health persistence. Like the other database
 * suites (see retention.test.ts) these need DATABASE_URL and run against a
 * real database — vitest.config.ts loads packages/database/.env.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  recordHealthCheck,
  getLatestHealthCheck,
  getLatestHealthChecksForWorkspace,
  findOpenHealthIncident,
  openHealthIncident,
  resolveHealthIncident,
  markHealthIncidentNotified,
  getUptimeStats,
  getDailyHealthRollups,
  getResponseTimeSeries,
  getRecentHealthIncidents,
  deleteExpiredHealthChecks,
} from "./health";

const prisma = new PrismaClient();
const RUN = `test-health-${process.pid}-${Math.floor(process.hrtime()[1])}`;

const OLD = new Date("2020-01-01T00:00:00Z");
const CUTOFF = new Date("2021-01-01T00:00:00Z");

let workspaceId: string;
let websiteId: string;

beforeEach(async () => {
  await prisma.workspace.deleteMany({ where: { name: RUN } });
  const user = await prisma.user.upsert({
    where: { email: `${RUN}@test.local` },
    create: { id: RUN, name: "Health Tester", email: `${RUN}@test.local` },
    update: {},
  });
  const workspace = await prisma.workspace.create({ data: { name: RUN, ownerId: user.id } });
  workspaceId = workspace.id;
  const website = await prisma.website.create({
    data: {
      workspaceId,
      name: "Health",
      url: "https://health.test/",
      normalizedUrl: `https://health.test/${RUN}`,
      status: "ACTIVE",
    },
  });
  websiteId = website.id;
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { name: RUN } });
  await prisma.user.deleteMany({ where: { id: RUN } });
  await prisma.$disconnect();
});

describe("recordHealthCheck / getLatestHealthCheck", () => {
  it("stores a check and returns the most recent one", async () => {
    await recordHealthCheck(prisma, {
      websiteId,
      up: true,
      httpStatus: 200,
      responseTimeMs: 120,
      checkedAt: new Date("2026-07-10T10:00:00Z"),
    });
    const newer = await recordHealthCheck(prisma, {
      websiteId,
      up: false,
      httpStatus: 503,
      errorCode: "HTTP_503",
      checkedAt: new Date("2026-07-10T10:05:00Z"),
    });

    const latest = await getLatestHealthCheck(prisma, websiteId);
    expect(latest?.id).toBe(newer.id);
    expect(latest?.up).toBe(false);
    expect(latest?.httpStatus).toBe(503);
    expect(latest?.errorCode).toBe("HTTP_503");
  });

  it("returns null for a never-checked website", async () => {
    expect(await getLatestHealthCheck(prisma, websiteId)).toBeNull();
  });
});

describe("getLatestHealthChecksForWorkspace", () => {
  it("returns one latest check per website in a single query", async () => {
    const other = await prisma.website.create({
      data: {
        workspaceId,
        name: "Health B",
        url: "https://health-b.test/",
        normalizedUrl: `https://health-b.test/${RUN}`,
        status: "ACTIVE",
      },
    });
    await recordHealthCheck(prisma, {
      websiteId,
      up: false,
      checkedAt: new Date("2026-07-10T09:00:00Z"),
    });
    await recordHealthCheck(prisma, {
      websiteId,
      up: true,
      checkedAt: new Date("2026-07-10T09:05:00Z"),
    });
    await recordHealthCheck(prisma, {
      websiteId: other.id,
      up: false,
      checkedAt: new Date("2026-07-10T09:05:00Z"),
    });

    const latest = await getLatestHealthChecksForWorkspace(prisma, workspaceId);
    const byWebsite = new Map(latest.map((c) => [c.websiteId, c.up]));
    expect(latest).toHaveLength(2);
    expect(byWebsite.get(websiteId)).toBe(true); // the newer check wins
    expect(byWebsite.get(other.id)).toBe(false);
  });
});

describe("incident open / resolve", () => {
  it("opens, finds, and resolves an incident", async () => {
    expect(await findOpenHealthIncident(prisma, websiteId, "DOWN")).toBeNull();

    const incident = await openHealthIncident(prisma, {
      websiteId,
      kind: "DOWN",
      detail: "HTTP 503",
    });
    const open = await findOpenHealthIncident(prisma, websiteId, "DOWN");
    expect(open?.id).toBe(incident.id);
    expect(open?.detail).toBe("HTTP 503");
    // A different kind is independent.
    expect(await findOpenHealthIncident(prisma, websiteId, "SSL_EXPIRING")).toBeNull();

    expect(await resolveHealthIncident(prisma, incident.id)).toBe(true);
    expect(await findOpenHealthIncident(prisma, websiteId, "DOWN")).toBeNull();
    // Second resolve is a guarded no-op.
    expect(await resolveHealthIncident(prisma, incident.id)).toBe(false);
    // Resolved incidents are kept forever.
    expect(await prisma.healthIncident.count({ where: { websiteId } })).toBe(1);
  });

  it("stamps lastNotifiedAt and refreshes detail", async () => {
    const incident = await openHealthIncident(prisma, { websiteId, kind: "SSL_EXPIRING" });
    expect(incident.lastNotifiedAt).toBeNull();

    const at = new Date("2026-07-10T11:00:00Z");
    await markHealthIncidentNotified(prisma, incident.id, at, "expires in 12 days");
    const updated = await prisma.healthIncident.findUnique({ where: { id: incident.id } });
    expect(updated?.lastNotifiedAt?.toISOString()).toBe(at.toISOString());
    expect(updated?.detail).toBe("expires in 12 days");
  });
});

describe("getUptimeStats", () => {
  it("computes % up and average response time over the window", async () => {
    const base = Date.now();
    await recordHealthCheck(prisma, { websiteId, up: true, responseTimeMs: 100, checkedAt: new Date(base - 3_000) });
    await recordHealthCheck(prisma, { websiteId, up: true, responseTimeMs: 300, checkedAt: new Date(base - 2_000) });
    await recordHealthCheck(prisma, { websiteId, up: true, responseTimeMs: 200, checkedAt: new Date(base - 1_000) });
    await recordHealthCheck(prisma, { websiteId, up: false, responseTimeMs: null, checkedAt: new Date(base) });
    // Outside the window — must not count.
    await recordHealthCheck(prisma, { websiteId, up: false, checkedAt: OLD });

    const stats = await getUptimeStats(prisma, {
      websiteId,
      since: new Date(base - 60_000),
    });
    expect(stats.totalChecks).toBe(4);
    expect(stats.upChecks).toBe(3);
    expect(stats.uptimePercent).toBe(75);
    expect(stats.avgResponseTimeMs).toBe(200); // failed checks excluded from avg
  });

  it("returns nulls when the window has no checks", async () => {
    const stats = await getUptimeStats(prisma, { websiteId, since: new Date() });
    expect(stats.totalChecks).toBe(0);
    expect(stats.uptimePercent).toBeNull();
    expect(stats.avgResponseTimeMs).toBeNull();
  });
});

describe("getDailyHealthRollups", () => {
  // A fixed "now" makes the UTC-day math deterministic regardless of run time.
  const NOW = new Date("2026-07-10T15:30:00Z");

  it("groups checks by UTC day and fills missing days with nulls", async () => {
    // Two days ago: 3 up (100/200/300ms) + 1 down → 75%, avg 200ms.
    await recordHealthCheck(prisma, { websiteId, up: true, responseTimeMs: 100, checkedAt: new Date("2026-07-08T00:00:00Z") });
    await recordHealthCheck(prisma, { websiteId, up: true, responseTimeMs: 200, checkedAt: new Date("2026-07-08T12:00:00Z") });
    await recordHealthCheck(prisma, { websiteId, up: true, responseTimeMs: 300, checkedAt: new Date("2026-07-08T23:59:59Z") });
    await recordHealthCheck(prisma, { websiteId, up: false, responseTimeMs: null, checkedAt: new Date("2026-07-08T06:00:00Z") });
    // Today: 1 up.
    await recordHealthCheck(prisma, { websiteId, up: true, responseTimeMs: 150, checkedAt: new Date("2026-07-10T10:00:00Z") });
    // Before the 7-day window — must not appear.
    await recordHealthCheck(prisma, { websiteId, up: false, checkedAt: new Date("2026-07-03T23:59:59Z") });

    const rollups = await getDailyHealthRollups(prisma, { websiteId, days: 7, now: NOW });

    expect(rollups).toHaveLength(7);
    expect(rollups.map((r) => r.date)).toEqual([
      "2026-07-04", "2026-07-05", "2026-07-06", "2026-07-07",
      "2026-07-08", "2026-07-09", "2026-07-10",
    ]);

    const day8 = rollups[4];
    expect(day8.totalChecks).toBe(4);
    expect(day8.upChecks).toBe(3);
    expect(day8.uptimePercent).toBe(75);
    expect(day8.avgResponseTimeMs).toBe(200); // failed checks excluded from avg

    const today = rollups[6];
    expect(today.totalChecks).toBe(1);
    expect(today.uptimePercent).toBe(100);
    expect(today.avgResponseTimeMs).toBe(150);

    // Gap day: present but explicitly empty.
    const day9 = rollups[5];
    expect(day9.totalChecks).toBe(0);
    expect(day9.upChecks).toBe(0);
    expect(day9.uptimePercent).toBeNull();
    expect(day9.avgResponseTimeMs).toBeNull();
  });

  it("returns all-null days for a never-checked website", async () => {
    const rollups = await getDailyHealthRollups(prisma, { websiteId, days: 3, now: NOW });
    expect(rollups).toHaveLength(3);
    expect(rollups.every((r) => r.totalChecks === 0 && r.uptimePercent === null)).toBe(true);
  });
});

describe("getResponseTimeSeries", () => {
  it("buckets averages by aligned time windows, up checks only", async () => {
    // Bucket 10:00–10:30 → up 100 + 300 (avg 200) + one down (counted, not averaged).
    await recordHealthCheck(prisma, { websiteId, up: true, responseTimeMs: 100, checkedAt: new Date("2026-07-10T10:00:00Z") });
    await recordHealthCheck(prisma, { websiteId, up: true, responseTimeMs: 300, checkedAt: new Date("2026-07-10T10:29:59Z") });
    await recordHealthCheck(prisma, { websiteId, up: false, responseTimeMs: null, checkedAt: new Date("2026-07-10T10:15:00Z") });
    // Bucket 11:00–11:30 → single up check.
    await recordHealthCheck(prisma, { websiteId, up: true, responseTimeMs: 500, checkedAt: new Date("2026-07-10T11:05:00Z") });
    // Before `since` — excluded.
    await recordHealthCheck(prisma, { websiteId, up: true, responseTimeMs: 999, checkedAt: OLD });

    const series = await getResponseTimeSeries(prisma, {
      websiteId,
      since: new Date("2026-07-10T00:00:00Z"),
      bucketMinutes: 30,
    });

    expect(series).toHaveLength(2); // the empty 10:30–11:00 bucket is absent
    expect(series[0].bucketStart.toISOString()).toBe("2026-07-10T10:00:00.000Z");
    expect(series[0].avgResponseTimeMs).toBe(200);
    expect(series[0].totalChecks).toBe(3);
    expect(series[1].bucketStart.toISOString()).toBe("2026-07-10T11:00:00.000Z");
    expect(series[1].avgResponseTimeMs).toBe(500);
    expect(series[1].totalChecks).toBe(1);
  });

  it("reports null averages for buckets with only failed checks", async () => {
    await recordHealthCheck(prisma, { websiteId, up: false, checkedAt: new Date("2026-07-10T10:00:00Z") });
    const series = await getResponseTimeSeries(prisma, {
      websiteId,
      since: new Date("2026-07-10T00:00:00Z"),
      bucketMinutes: 30,
    });
    expect(series).toHaveLength(1);
    expect(series[0].avgResponseTimeMs).toBeNull();
    expect(series[0].totalChecks).toBe(1);
  });

  it("returns an empty array when there are no checks in range", async () => {
    const series = await getResponseTimeSeries(prisma, {
      websiteId,
      since: new Date(),
      bucketMinutes: 30,
    });
    expect(series).toEqual([]);
  });
});

describe("getRecentHealthIncidents", () => {
  it("returns the newest incidents first, respecting the limit", async () => {
    const first = await openHealthIncident(prisma, {
      websiteId, kind: "DOWN", detail: "HTTP 503", openedAt: new Date("2026-07-01T00:00:00Z"),
    });
    await resolveHealthIncident(prisma, first.id, new Date("2026-07-01T01:00:00Z"));
    const second = await openHealthIncident(prisma, {
      websiteId, kind: "SSL_EXPIRING", detail: "expires in 10 days", openedAt: new Date("2026-07-05T00:00:00Z"),
    });
    const third = await openHealthIncident(prisma, {
      websiteId, kind: "DOWN", openedAt: new Date("2026-07-09T00:00:00Z"),
    });

    const recent = await getRecentHealthIncidents(prisma, { websiteId });
    expect(recent.map((i) => i.id)).toEqual([third.id, second.id, first.id]);
    expect(recent[0].resolvedAt).toBeNull(); // ongoing
    expect(recent[2].resolvedAt).not.toBeNull();

    const limited = await getRecentHealthIncidents(prisma, { websiteId, limit: 2 });
    expect(limited.map((i) => i.id)).toEqual([third.id, second.id]);
  });
});

describe("deleteExpiredHealthChecks", () => {
  it("prunes checks older than the cutoff and keeps recent ones", async () => {
    await recordHealthCheck(prisma, { websiteId, up: true, checkedAt: OLD });
    await recordHealthCheck(prisma, { websiteId, up: true, checkedAt: OLD });
    const recent = await recordHealthCheck(prisma, { websiteId, up: true });

    const deleted = await deleteExpiredHealthChecks(prisma, { websiteId, cutoff: CUTOFF });
    expect(deleted).toBe(2);
    const remaining = await prisma.healthCheck.findMany({ where: { websiteId } });
    expect(remaining.map((c) => c.id)).toEqual([recent.id]);
  });
});
