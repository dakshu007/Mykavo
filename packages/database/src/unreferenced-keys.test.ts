import { describe, expect, it } from "vitest";
import { findUnreferencedScreenshotKeys } from "./retention";

/**
 * Exercises the reference-counting rule with a stand-in for Prisma, so the
 * dangerous half of retention is covered without a live database.
 *
 * `surviving` is what the table still holds AFTER the expired rows were
 * deleted - which is exactly when the real sweep calls this.
 */
function fakeDb(surviving: Array<string | null>) {
  return {
    pageSnapshot: {
      async findMany({ where }: { where: { screenshotStorageKey: { in: string[] } } }) {
        const wanted = new Set(where.screenshotStorageKey.in);
        const hits = surviving.filter((k) => k !== null && wanted.has(k));
        return [...new Set(hits)].map((screenshotStorageKey) => ({ screenshotStorageKey }));
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const SHARED = "ws/w1/shot/" + "a".repeat(64) + ".jpg";
const OTHER = "ws/w1/shot/" + "b".repeat(64) + ".jpg";
const LEGACY = "ws/w1/scan/s1/p1/screenshot.jpg";

describe("findUnreferencedScreenshotKeys", () => {
  // THE failure this guards against. Screenshots are content-addressed, so an
  // unchanged page is one object referenced by every snapshot of it. Deleting
  // it because one snapshot expired would blank the image an approved
  // baseline still displays - and nothing would error, the comparison would
  // just have nothing to show.
  it("keeps a shared screenshot that a surviving snapshot still references", async () => {
    const unreferenced = await findUnreferencedScreenshotKeys(fakeDb([SHARED]), [SHARED]);
    expect(unreferenced).toEqual([]);
  });

  it("keeps a shared screenshot referenced by an approved baseline's snapshot", async () => {
    // Baselines are excluded from expiry, so their snapshot row survives and
    // shows up here as a reference.
    const unreferenced = await findUnreferencedScreenshotKeys(
      fakeDb([SHARED, OTHER]),
      [SHARED],
    );
    expect(unreferenced).toEqual([]);
  });

  it("reclaims a screenshot once the last reference is gone", async () => {
    const unreferenced = await findUnreferencedScreenshotKeys(fakeDb([]), [SHARED]);
    expect(unreferenced).toEqual([SHARED]);
  });

  it("reclaims only the keys nothing points at", async () => {
    const unreferenced = await findUnreferencedScreenshotKeys(
      fakeDb([SHARED]),
      [SHARED, OTHER],
    );
    expect(unreferenced).toEqual([OTHER]);
  });

  // Legacy per-scan keys are owned by exactly one snapshot, so they must keep
  // behaving exactly as they did before content addressing.
  it("still reclaims a legacy per-scan key when its snapshot goes", async () => {
    expect(await findUnreferencedScreenshotKeys(fakeDb([]), [LEGACY])).toEqual([LEGACY]);
  });

  it("deduplicates candidates so one object is not deleted twice", async () => {
    const unreferenced = await findUnreferencedScreenshotKeys(
      fakeDb([]),
      [SHARED, SHARED, SHARED],
    );
    expect(unreferenced).toEqual([SHARED]);
  });

  it("does nothing when there is nothing to consider", async () => {
    expect(await findUnreferencedScreenshotKeys(fakeDb([]), [])).toEqual([]);
  });
});
