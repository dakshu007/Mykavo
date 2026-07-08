/**
 * Integration tests for baseline versioning against the real database.
 * Guards the "exactly one ACTIVE baseline per page" invariant and the
 * supersede-and-bump-version semantics (spec §24).
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createInitialBaselinesForScan, setSnapshotAsBaseline } from "./baseline";

const prisma = new PrismaClient();

// Unique suffix per run so parallel/rerun executions don't collide.
const RUN = `test-baseline-${process.pid}-${Math.floor(process.hrtime()[1])}`;

let workspaceId: string;
let websiteId: string;
let pageId: string;

async function makeScanWithSnapshot(opts: {
  trigger: "BASELINE" | "MANUAL";
  failed?: boolean;
}): Promise<{ scanId: string; snapshotId: string }> {
  const scan = await prisma.scan.create({
    data: { websiteId, status: "COMPLETED", triggerType: opts.trigger },
  });
  const snapshot = await prisma.pageSnapshot.create({
    data: {
      scanId: scan.id,
      monitoredPageId: pageId,
      websiteId,
      url: "https://baseline.test/",
      httpStatus: opts.failed ? null : 200,
      errorCode: opts.failed ? "NAVIGATION_TIMEOUT" : null,
    },
  });
  return { scanId: scan.id, snapshotId: snapshot.id };
}

beforeEach(async () => {
  // Fresh website + page for each test; cascades clear scans/snapshots/baselines.
  await prisma.workspace.deleteMany({ where: { name: RUN } });
  const user = await prisma.user.upsert({
    where: { email: `${RUN}@test.local` },
    create: { id: RUN, name: "Baseline Tester", email: `${RUN}@test.local` },
    update: {},
  });
  const workspace = await prisma.workspace.create({
    data: { name: RUN, ownerId: user.id },
  });
  workspaceId = workspace.id;
  const website = await prisma.website.create({
    data: {
      workspaceId,
      name: "Baseline Site",
      url: "https://baseline.test/",
      normalizedUrl: `https://baseline.test/${RUN}`,
    },
  });
  websiteId = website.id;
  const page = await prisma.monitoredPage.create({
    data: { websiteId, url: "https://baseline.test/", normalizedUrl: `https://baseline.test/p/${RUN}` },
  });
  pageId = page.id;
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { name: RUN } });
  await prisma.user.deleteMany({ where: { id: RUN } });
  await prisma.$disconnect();
});

describe("setSnapshotAsBaseline", () => {
  it("creates version 1 as ACTIVE for the first baseline", async () => {
    const { snapshotId } = await makeScanWithSnapshot({ trigger: "BASELINE" });
    const baseline = await setSnapshotAsBaseline(prisma, {
      websiteId,
      monitoredPageId: pageId,
      pageSnapshotId: snapshotId,
      approvedByUserId: null,
    });
    expect(baseline.version).toBe(1);
    expect(baseline.status).toBe("ACTIVE");
    expect(baseline.approvedAt).not.toBeNull();
  });

  it("supersedes the old baseline and bumps the version", async () => {
    const first = await makeScanWithSnapshot({ trigger: "BASELINE" });
    await setSnapshotAsBaseline(prisma, {
      websiteId,
      monitoredPageId: pageId,
      pageSnapshotId: first.snapshotId,
      approvedByUserId: null,
    });

    const second = await makeScanWithSnapshot({ trigger: "MANUAL" });
    const v2 = await setSnapshotAsBaseline(prisma, {
      websiteId,
      monitoredPageId: pageId,
      pageSnapshotId: second.snapshotId,
      approvedByUserId: RUN,
    });

    expect(v2.version).toBe(2);
    expect(v2.status).toBe("ACTIVE");
    expect(v2.approvedByUserId).toBe(RUN);

    const active = await prisma.baseline.findMany({
      where: { monitoredPageId: pageId, status: "ACTIVE" },
    });
    expect(active).toHaveLength(1); // invariant holds
    expect(active[0].version).toBe(2);
  });

  it("is idempotent when re-approving the current baseline snapshot", async () => {
    const { snapshotId } = await makeScanWithSnapshot({ trigger: "BASELINE" });
    const a = await setSnapshotAsBaseline(prisma, {
      websiteId,
      monitoredPageId: pageId,
      pageSnapshotId: snapshotId,
      approvedByUserId: null,
    });
    const b = await setSnapshotAsBaseline(prisma, {
      websiteId,
      monitoredPageId: pageId,
      pageSnapshotId: snapshotId,
      approvedByUserId: RUN,
    });
    expect(b.id).toBe(a.id);
    expect(b.version).toBe(1);
    const count = await prisma.baseline.count({ where: { monitoredPageId: pageId } });
    expect(count).toBe(1);
  });

  it("can restore an older snapshot as a new higher version", async () => {
    const first = await makeScanWithSnapshot({ trigger: "BASELINE" });
    await setSnapshotAsBaseline(prisma, {
      websiteId,
      monitoredPageId: pageId,
      pageSnapshotId: first.snapshotId,
      approvedByUserId: null,
    });
    const second = await makeScanWithSnapshot({ trigger: "MANUAL" });
    await setSnapshotAsBaseline(prisma, {
      websiteId,
      monitoredPageId: pageId,
      pageSnapshotId: second.snapshotId,
      approvedByUserId: RUN,
    });
    // Restore v1's snapshot → becomes v3.
    const restored = await setSnapshotAsBaseline(prisma, {
      websiteId,
      monitoredPageId: pageId,
      pageSnapshotId: first.snapshotId,
      approvedByUserId: RUN,
    });
    expect(restored.version).toBe(3);
    expect(restored.pageSnapshotId).toBe(first.snapshotId);
  });
});

describe("createInitialBaselinesForScan", () => {
  it("creates a baseline only for successful snapshots without one", async () => {
    const scan = await prisma.scan.create({
      data: { websiteId, status: "COMPLETED", triggerType: "BASELINE" },
    });
    await prisma.pageSnapshot.create({
      data: {
        scanId: scan.id,
        monitoredPageId: pageId,
        websiteId,
        url: "https://baseline.test/",
        httpStatus: 200,
      },
    });

    const created = await createInitialBaselinesForScan(prisma, scan.id);
    expect(created).toBe(1);

    // Running again is a no-op — the page already has a baseline.
    const again = await createInitialBaselinesForScan(prisma, scan.id);
    expect(again).toBe(0);
  });

  it("skips failed snapshots", async () => {
    const scan = await prisma.scan.create({
      data: { websiteId, status: "PARTIAL", triggerType: "BASELINE" },
    });
    await prisma.pageSnapshot.create({
      data: {
        scanId: scan.id,
        monitoredPageId: pageId,
        websiteId,
        url: "https://baseline.test/",
        errorCode: "NAVIGATION_TIMEOUT",
      },
    });
    const created = await createInitialBaselinesForScan(prisma, scan.id);
    expect(created).toBe(0);
  });
});
