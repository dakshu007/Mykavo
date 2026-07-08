/**
 * Integration tests for change-event management against the real database.
 * Covers triage transitions and the baseline-update flow that approves a
 * page's open changes (spec §24, §33).
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { applyChangeAction, updateBaselineFromSnapshot } from "./changes";

const prisma = new PrismaClient();
const RUN = `test-changes-${process.pid}-${Math.floor(process.hrtime()[1])}`;

let websiteId: string;
let pageId: string;

async function newSnapshot(): Promise<string> {
  const scan = await prisma.scan.create({
    data: { websiteId, status: "COMPLETED", triggerType: "SCHEDULED" },
  });
  const snap = await prisma.pageSnapshot.create({
    data: {
      scanId: scan.id,
      monitoredPageId: pageId,
      websiteId,
      url: "https://changes.test/",
      httpStatus: 200,
    },
  });
  return snap.id;
}

async function newChange(currentSnapshotId: string) {
  const scan = await prisma.pageSnapshot.findUnique({
    where: { id: currentSnapshotId },
    select: { scanId: true },
  });
  return prisma.changeEvent.create({
    data: {
      websiteId,
      monitoredPageId: pageId,
      currentSnapshotId,
      scanId: scan!.scanId,
      category: "SEO",
      changeType: "title_changed",
      severity: "MEDIUM",
      title: "Title changed",
      description: "x",
      status: "NEW",
    },
  });
}

beforeEach(async () => {
  await prisma.workspace.deleteMany({ where: { name: RUN } });
  const user = await prisma.user.upsert({
    where: { email: `${RUN}@test.local` },
    create: { id: RUN, name: "Changes Tester", email: `${RUN}@test.local` },
    update: {},
  });
  const workspace = await prisma.workspace.create({ data: { name: RUN, ownerId: user.id } });
  const website = await prisma.website.create({
    data: {
      workspaceId: workspace.id,
      name: "Changes Site",
      url: "https://changes.test/",
      normalizedUrl: `https://changes.test/${RUN}`,
    },
  });
  websiteId = website.id;
  const page = await prisma.monitoredPage.create({
    data: { websiteId, url: "https://changes.test/", normalizedUrl: `https://changes.test/p/${RUN}` },
  });
  pageId = page.id;
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { name: RUN } });
  await prisma.user.deleteMany({ where: { id: RUN } });
  await prisma.$disconnect();
});

describe("applyChangeAction", () => {
  it("transitions through review, approve, ignore, resolve, reopen", async () => {
    const snap = await newSnapshot();
    const change = await newChange(snap);

    expect((await applyChangeAction(prisma, change.id, "review")).status).toBe("REVIEWED");

    const approved = await applyChangeAction(prisma, change.id, "approve");
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedAt).not.toBeNull();

    expect((await applyChangeAction(prisma, change.id, "ignore")).status).toBe("IGNORED");

    const resolved = await applyChangeAction(prisma, change.id, "resolve");
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolvedAt).not.toBeNull();

    const reopened = await applyChangeAction(prisma, change.id, "reopen");
    expect(reopened.status).toBe("NEW");
    expect(reopened.approvedAt).toBeNull();
    expect(reopened.resolvedAt).toBeNull();
  });
});

describe("updateBaselineFromSnapshot", () => {
  it("promotes the snapshot to baseline v1 and approves the page's open changes", async () => {
    const snap = await newSnapshot();
    const a = await newChange(snap);
    const b = await newChange(snap);
    // one already ignored — should stay ignored, not be re-approved
    const c = await newChange(snap);
    await applyChangeAction(prisma, c.id, "ignore");

    const result = await updateBaselineFromSnapshot(prisma, {
      websiteId,
      monitoredPageId: pageId,
      pageSnapshotId: snap,
      approvedByUserId: RUN,
    });

    expect(result.baselineVersion).toBe(1);
    expect(result.approvedChanges).toBe(2); // a and b, not c

    const active = await prisma.baseline.findFirst({
      where: { monitoredPageId: pageId, status: "ACTIVE" },
    });
    expect(active?.pageSnapshotId).toBe(snap);

    expect((await prisma.changeEvent.findUnique({ where: { id: a.id } }))!.status).toBe("APPROVED");
    expect((await prisma.changeEvent.findUnique({ where: { id: b.id } }))!.status).toBe("APPROVED");
    expect((await prisma.changeEvent.findUnique({ where: { id: c.id } }))!.status).toBe("IGNORED");
  });

  it("bumps to v2 and supersedes when a baseline already exists", async () => {
    const snap1 = await newSnapshot();
    await updateBaselineFromSnapshot(prisma, {
      websiteId,
      monitoredPageId: pageId,
      pageSnapshotId: snap1,
      approvedByUserId: RUN,
    });
    const snap2 = await newSnapshot();
    const result = await updateBaselineFromSnapshot(prisma, {
      websiteId,
      monitoredPageId: pageId,
      pageSnapshotId: snap2,
      approvedByUserId: RUN,
    });
    expect(result.baselineVersion).toBe(2);
    const active = await prisma.baseline.count({
      where: { monitoredPageId: pageId, status: "ACTIVE" },
    });
    expect(active).toBe(1);
  });
});
