import { describe, expect, it } from "vitest";
import { getPlan, plans, formatLimit, WEBSITE_ADDON } from "./plans";

describe("plans config", () => {
  it("contains exactly two plans: free and pro ($12)", () => {
    expect(plans.map((p) => [p.id, p.priceMonthlyUsd])).toEqual([
      ["free", 0],
      ["pro", 12],
    ]);
  });

  it("free plan matches spec §37 limits", () => {
    expect(getPlan("free").limits).toMatchObject({
      websites: 1,
      monitoredPages: 5,
      scanFrequency: "WEEKLY",
      historyDays: 30,
    });
  });

  it("pro plan includes 50 base websites, unlimited pages", () => {
    const pro = getPlan("pro");
    expect(pro.limits.websites).toBe(50);
    expect(pro.limits.monitoredPages).toBe(Infinity);
    expect(pro.limits.scanFrequency).toBe("DAILY");
    expect(pro.limits.manualScans).toBe(true);
    expect(pro.limits.conversionElementMonitoring).toBe(true);
  });

  it("website add-on grants 30 sites for $6/mo", () => {
    expect(WEBSITE_ADDON.websitesPerUnit).toBe(30);
    expect(WEBSITE_ADDON.priceMonthlyUsd).toBe(6);
  });

  it("pro limits are at least free limits (never a downgrade)", () => {
    const free = getPlan("free");
    const pro = getPlan("pro");
    expect(pro.limits.websites).toBeGreaterThanOrEqual(free.limits.websites);
    expect(pro.limits.monitoredPages).toBeGreaterThanOrEqual(free.limits.monitoredPages);
    expect(pro.priceMonthlyUsd).toBeGreaterThan(free.priceMonthlyUsd);
  });

  it("formatLimit renders Infinity as Unlimited", () => {
    expect(formatLimit(Infinity)).toBe("Unlimited");
    expect(formatLimit(5)).toBe("5");
    expect(formatLimit(2500)).toBe("2,500");
  });

  it("throws on unknown plan ids", () => {
    expect(() => getPlan("enterprise" as never)).toThrow();
  });
});
