import { describe, expect, it } from "vitest";
import { buildSiteVitals } from "./wp-vitals";

describe("buildSiteVitals", () => {
  it("rounds response times and keeps empty buckets as null", () => {
    const v = buildSiteVitals(
      [
        { bucketStart: new Date("2026-11-01T00:00:00Z"), avgResponseTimeMs: 612.6 },
        { bucketStart: new Date("2026-11-01T06:00:00Z"), avgResponseTimeMs: null },
      ],
      [],
    );
    expect(v.responseSeries).toEqual([
      { t: "2026-11-01T00:00:00.000Z", ms: 613 },
      { t: "2026-11-01T06:00:00.000Z", ms: null },
    ]);
  });

  it("orders update markers oldest first, keeps the latest 12 and trims long notes", () => {
    const updates = Array.from({ length: 15 }, (_, i) => ({
      note: i === 14 ? "x".repeat(200) : `Update ${i}`,
      createdAt: new Date(Date.UTC(2026, 10, 1, i)),
    })).reverse();
    const v = buildSiteVitals([], updates);
    expect(v.updates).toHaveLength(12);
    expect(v.updates[0].note).toBe("Update 3");
    expect(v.updates[11].note).toHaveLength(120);
  });
});
