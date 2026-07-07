import { describe, expect, it } from "vitest";
import { getPlan, plans } from "./plans";

describe("plans config", () => {
  it("contains exactly the four spec plans at spec prices", () => {
    expect(plans.map((p) => [p.id, p.priceMonthlyUsd])).toEqual([
      ["free", 0],
      ["starter", 12],
      ["pro", 29],
      ["agency", 79],
    ]);
  });

  it("matches spec §37 limits", () => {
    expect(getPlan("free").limits).toMatchObject({
      websites: 1,
      monitoredPages: 5,
      scanFrequency: "WEEKLY",
      historyDays: 30,
    });
    expect(getPlan("starter").limits).toMatchObject({ websites: 5, monitoredPages: 50 });
    expect(getPlan("pro").limits).toMatchObject({ websites: 25, monitoredPages: 500 });
    expect(getPlan("agency").limits).toMatchObject({ websites: 100, monitoredPages: 2500 });
  });

  it("limits grow monotonically with price", () => {
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i].limits.websites).toBeGreaterThan(plans[i - 1].limits.websites);
      expect(plans[i].limits.monitoredPages).toBeGreaterThan(
        plans[i - 1].limits.monitoredPages,
      );
      expect(plans[i].priceMonthlyUsd).toBeGreaterThan(plans[i - 1].priceMonthlyUsd);
    }
  });

  it("throws on unknown plan ids", () => {
    expect(() => getPlan("enterprise" as never)).toThrow();
  });
});
