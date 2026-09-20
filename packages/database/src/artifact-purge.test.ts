import { describe, expect, it, vi } from "vitest";
import {
  collectWebsiteArtifactKeys,
  queueArtifactDeletions,
  takePendingArtifactDeletions,
} from "./artifact-purge";

type Snapshot = { screenshotStorageKey: string | null };
type Change = { metadata: unknown };

function fakeDb(snapshots: Snapshot[], changes: Change[]) {
  const created: { storageKey: string; workspaceId: string; reason: string }[] = [];
  return {
    created,
    pageSnapshot: { findMany: vi.fn(async () => snapshots) },
    changeEvent: { findMany: vi.fn(async () => changes) },
    pendingArtifactDeletion: {
      createMany: vi.fn(async ({ data }: { data: typeof created }) => {
        // Mirrors skipDuplicates against the storageKey unique index.
        let count = 0;
        for (const row of data) {
          if (created.some((existing) => existing.storageKey === row.storageKey)) continue;
          created.push(row);
          count += 1;
        }
        return { count };
      }),
      findMany: vi.fn(async () => []),
      delete: vi.fn(async () => undefined),
      update: vi.fn(async () => undefined),
      count: vi.fn(async () => created.length),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const SHOT_A = "ws/w1/shot/" + "a".repeat(64) + ".jpg";
const SHOT_B = "ws/w1/shot/" + "b".repeat(64) + ".jpg";
const DIFF = "ws/w1/scan/s1/p1/diff.png";

describe("collectWebsiteArtifactKeys", () => {
  it("collects screenshot keys and the diff keys recorded on change events", async () => {
    const db = fakeDb(
      [{ screenshotStorageKey: SHOT_A }, { screenshotStorageKey: SHOT_B }],
      [{ metadata: { diffStorageKey: DIFF, pixelDifferencePercentage: 4 } }],
    );
    const keys = await collectWebsiteArtifactKeys(db, "site-1");
    expect(keys.screenshotKeys).toEqual([SHOT_A, SHOT_B]);
    expect(keys.diffKeys).toEqual([DIFF]);
  });

  /**
   * metadata is a free-form JSON column: most change events carry no diff at
   * all, and a few carry arrays or nulls. Reading `.diffStorageKey` off those
   * without checking is how a purge throws halfway through and leaves a
   * website deleted with its bytes still billed.
   */
  it("survives change events whose metadata is null, an array, or diff-free", async () => {
    const db = fakeDb(
      [],
      [
        { metadata: null },
        { metadata: [1, 2, 3] },
        { metadata: { previousValue: "a", currentValue: "b" } },
        { metadata: { diffStorageKey: 42 } },
        { metadata: { diffStorageKey: "" } },
        { metadata: { diffStorageKey: DIFF } },
      ],
    );
    const keys = await collectWebsiteArtifactKeys(db, "site-1");
    expect(keys.diffKeys).toEqual([DIFF]);
  });

  it("ignores snapshots that never stored a screenshot", async () => {
    const db = fakeDb([{ screenshotStorageKey: null }, { screenshotStorageKey: SHOT_A }], []);
    const keys = await collectWebsiteArtifactKeys(db, "site-1");
    expect(keys.screenshotKeys).toEqual([SHOT_A]);
  });

  it("deduplicates a diff key repeated across change events", async () => {
    const db = fakeDb(
      [],
      [{ metadata: { diffStorageKey: DIFF } }, { metadata: { diffStorageKey: DIFF } }],
    );
    const keys = await collectWebsiteArtifactKeys(db, "site-1");
    expect(keys.diffKeys).toEqual([DIFF]);
  });
});

describe("queueArtifactDeletions", () => {
  it("queues each distinct key once", async () => {
    const db = fakeDb([], []);
    const queued = await queueArtifactDeletions(
      db,
      "w1",
      [SHOT_A, SHOT_A, DIFF],
      "website_deleted",
    );
    expect(queued).toBe(2);
    expect(db.created.map((r: { storageKey: string }) => r.storageKey)).toEqual([SHOT_A, DIFF]);
  });

  it("is a no-op for an empty list, without touching the database", async () => {
    const db = fakeDb([], []);
    expect(await queueArtifactDeletions(db, "w1", [], "website_deleted")).toBe(0);
    expect(db.pendingArtifactDeletion.createMany).not.toHaveBeenCalled();
  });

  it("drops empty keys rather than queueing a delete of the bucket root", async () => {
    const db = fakeDb([], []);
    const queued = await queueArtifactDeletions(db, "w1", ["", SHOT_A], "website_deleted");
    expect(queued).toBe(1);
    expect(db.created.map((r: { storageKey: string }) => r.storageKey)).toEqual([SHOT_A]);
  });

  it("re-queuing an already-parked key adds nothing", async () => {
    const db = fakeDb([], []);
    await queueArtifactDeletions(db, "w1", [SHOT_A], "website_deleted");
    const again = await queueArtifactDeletions(db, "w1", [SHOT_A], "workspace_deleted");
    expect(again).toBe(0);
    expect(db.created).toHaveLength(1);
  });
});

describe("takePendingArtifactDeletions", () => {
  it("skips rows that have already failed too many times", async () => {
    const db = fakeDb([], []);
    await takePendingArtifactDeletions(db, 100, 5);
    expect(db.pendingArtifactDeletion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { attempts: { lt: 5 } },
        orderBy: { createdAt: "asc" },
        take: 100,
      }),
    );
  });
});
