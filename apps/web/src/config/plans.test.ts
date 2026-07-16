import { describe, expect, it } from "vitest";
import { getPlan, plans, formatLimit, WEBSITE_ADDON } from "./plans";

describe("plans config", () => {
  it("contains exactly two plans: free and pro ($20)", () => {
    expect(plans.map((p) => [p.id, p.priceMonthlyUsd])).toEqual([
      ["free", 0],
      ["pro", 20],
    ]);
  });

  it("free plan matches spec §37 limits", () => {
    expect(getPlan("free").limits).toMatchObject({
      websites: 1,
      pagesPerWebsite: 5,
      scanFrequency: "WEEKLY",
      historyDays: 30,
    });
  });

  it("pro plan includes 8 base websites with 20 pages each", () => {
    const pro = getPlan("pro");
    expect(pro.limits.websites).toBe(8);
    expect(pro.limits.pagesPerWebsite).toBe(20);
    expect(pro.limits.scanFrequency).toBe("DAILY");
    expect(pro.limits.manualScans).toBe(true);
    expect(pro.limits.conversionElementMonitoring).toBe(true);
  });

  it("team seats are a Pro feature: free is single-seat, pro gets 5", () => {
    expect(getPlan("free").limits.maxMembers).toBe(1);
    expect(getPlan("pro").limits.maxMembers).toBe(5);
    expect(getPlan("pro").features).toContain("Up to 5 team members");
  });

  it("website add-on grants 1 site for $6/mo, capped at 3 units", () => {
    expect(WEBSITE_ADDON.websitesPerUnit).toBe(1);
    expect(WEBSITE_ADDON.maxUnits).toBe(3);
    expect(WEBSITE_ADDON.priceMonthlyUsd).toBe(6);
  });

  it("pro can never exceed base + capped add-on capacity (11 websites)", () => {
    const pro = getPlan("pro");
    expect(
      pro.limits.websites + WEBSITE_ADDON.maxUnits * WEBSITE_ADDON.websitesPerUnit,
    ).toBe(11);
  });

  it("pro limits are at least free limits (never a downgrade)", () => {
    const free = getPlan("free");
    const pro = getPlan("pro");
    expect(pro.limits.websites).toBeGreaterThanOrEqual(free.limits.websites);
    expect(pro.limits.pagesPerWebsite).toBeGreaterThanOrEqual(free.limits.pagesPerWebsite);
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
