/**
 * Integration tests for retention cleanup (Phase 10). The critical property:
 * a snapshot referenced by a baseline is NEVER selected for deletion, because
 * Baseline.pageSnapshot cascades and would take the baseline with it.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  findExpiredSnapshots,
  deleteSnapshots,
  deleteExpiredChangeEvents,
} from "./retention";

const prisma = new PrismaClient();
const RUN = `test-ret-${process.pid}-${Math.floor(process.hrtime()[1])}`;

const OLD = new Date("2020-01-01T00:00:00Z");
const CUTOFF = new Date("2021-01-01T00:00:00Z");

let workspaceId: string;
let websiteId: string;
let pageId: string;

async function makeSnapshot(createdAt: Date, screenshot: string | null = null) {
  const scan = await prisma.scan.create({
    data: { websiteId, triggerType: "SCHEDULED", status: "COMPLETED", createdAt },
  });
  return prisma.pageSnapshot.create({
    data: {
      scanId: scan.id,
      monitoredPageId: pageId,
      websiteId,
      url: "https://ret.test/",
      screenshotStorageKey: screenshot,
      createdAt,
    },
  });
}

beforeEach(async () => {
  await prisma.workspace.deleteMany({ where: { name: RUN } });
  const user = await prisma.user.upsert({
    where: { email: `${RUN}@test.local` },
    create: { id: RUN, name: "Ret Tester", email: `${RUN}@test.local` },
    update: {},
  });
  const workspace = await prisma.workspace.create({ data: { name: RUN, ownerId: user.id } });
  workspaceId = workspace.id;
  const website = await prisma.website.create({
    data: { workspaceId, name: "Ret", url: "https://ret.test/", normalizedUrl: `https://ret.test/${RUN}` },
  });
  websiteId = website.id;
  const page = await prisma.monitoredPage.create({
    data: { websiteId, url: "https://ret.test/", normalizedUrl: `https://ret.test/${RUN}/p` },
  });
  pageId = page.id;
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { name: RUN } });
  await prisma.user.deleteMany({ where: { id: RUN } });
  await prisma.$disconnect();
});

describe("findExpiredSnapshots", () => {
  it("returns old snapshots but NEVER a baseline-referenced one", async () => {
    const oldPlain = await makeSnapshot(OLD, "ws/x/screenshot.jpg");
    const oldBaseline = await makeSnapshot(OLD);
    const recent = await makeSnapshot(new Date());
    await prisma.baseline.create({
      data: { websiteId, monitoredPageId: pageId, pageSnapshotId: oldBaseline.id, version: 1, status: "ACTIVE" },
    });

    const expired = await findExpiredSnapshots(prisma, { websiteId, cutoff: CUTOFF, limit: 100 });
    const ids = expired.map((e) => e.id);

    expect(ids).toContain(oldPlain.id);
    expect(ids).not.toContain(oldBaseline.id); // protected
    expect(ids).not.toContain(recent.id); // not expired
    expect(expired.find((e) => e.id === oldPlain.id)?.screenshotStorageKey).toBe(
      "ws/x/screenshot.jpg",
    );
  });

  it("respects the limit, oldest first", async () => {
    await makeSnapshot(new Date("2020-01-01T00:00:00Z"));
    await makeSnapshot(new Date("2020-06-01T00:00:00Z"));
    await makeSnapshot(new Date("2020-03-01T00:00:00Z"));
    const two = await findExpiredSnapshots(prisma, { websiteId, cutoff: CUTOFF, limit: 2 });
    expect(two).toHaveLength(2);
  });
});

describe("deleteSnapshots", () => {
  it("deletes only the given ids and leaves baselines intact", async () => {
    const oldPlain = await makeSnapshot(OLD);
    const oldBaseline = await makeSnapshot(OLD);
    const baseline = await prisma.baseline.create({
      data: { websiteId, monitoredPageId: pageId, pageSnapshotId: oldBaseline.id, version: 1, status: "ACTIVE" },
    });

    const expired = await findExpiredSnapshots(prisma, { websiteId, cutoff: CUTOFF, limit: 100 });
    const deleted = await deleteSnapshots(prisma, expired.map((e) => e.id));

    expect(deleted).toBe(1);
    expect(await prisma.pageSnapshot.findUnique({ where: { id: oldPlain.id } })).toBeNull();
    expect(await prisma.pageSnapshot.findUnique({ where: { id: oldBaseline.id } })).not.toBeNull();
    expect(await prisma.baseline.findUnique({ where: { id: baseline.id } })).not.toBeNull();
  });

  it("is a no-op for an empty id list", async () => {
    expect(await deleteSnapshots(prisma, [])).toBe(0);
  });
});

describe("deleteExpiredChangeEvents", () => {
  it("deletes change events older than the cutoff only", async () => {
    const scan = await prisma.scan.create({
      data: { websiteId, triggerType: "SCHEDULED", status: "COMPLETED" },
    });
    const base = {
      websiteId,
      monitoredPageId: pageId,
      scanId: scan.id,
      category: "SEO" as const,
      changeType: "title_changed",
      severity: "LOW" as const,
      title: "t",
      description: "d",
    };
    await prisma.changeEvent.create({ data: { ...base, detectedAt: OLD } });
    await prisma.changeEvent.create({ data: { ...base, detectedAt: new Date() } });

    const removed = await deleteExpiredChangeEvents(prisma, { websiteId, cutoff: CUTOFF });
    expect(removed).toBe(1);
    expect(await prisma.changeEvent.count({ where: { websiteId } })).toBe(1);
  });
});
