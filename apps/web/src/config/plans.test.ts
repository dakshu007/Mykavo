import { describe, expect, it } from "vitest";
import { getPlan, plans, formatLimit, resolvePlan, nextPlanUp } from "./plans";
import { includesClientReports, PLAN_PRICES_USD } from "@mykavo/shared";

describe("plans config", () => {
  it("contains exactly three plans: free, pro ($20) and agency ($49)", () => {
    expect(plans.map((p) => [p.id, p.priceMonthlyUsd])).toEqual([
      ["free", 0],
      ["pro", 20],
      ["agency", 49],
    ]);
  });

  it("reads every price from the shared price table", () => {
    for (const plan of plans) expect(plan.priceMonthlyUsd).toBe(PLAN_PRICES_USD[plan.id]);
  });

  it("free plan matches spec §37 limits", () => {
    expect(getPlan("free").limits).toMatchObject({
      websites: 1,
      pagesPerWebsite: 5,
      scanFrequency: "WEEKLY",
      historyDays: 30,
    });
  });

  it("pro plan includes 8 websites with 15 pages each", () => {
    const pro = getPlan("pro");
    expect(pro.limits.websites).toBe(8);
    expect(pro.limits.pagesPerWebsite).toBe(15);
    expect(pro.limits.scanFrequency).toBe("DAILY");
    expect(pro.limits.manualScans).toBe(true);
    expect(pro.limits.conversionElementMonitoring).toBe(true);
  });

  it("agency plan: 30 websites, 25 pages each, white-label, 15 seats", () => {
    const agency = getPlan("agency");
    expect(agency.limits).toMatchObject({
      websites: 30,
      pagesPerWebsite: 25,
      scanFrequency: "DAILY",
      historyDays: 365,
      whiteLabelReports: true,
      maxMembers: 15,
      manualScansPerDay: 100,
    });
    expect(agency.features).toContain("White-label client reports");
  });

  it("team seats: free is single-seat, pro 3, agency 15", () => {
    expect(getPlan("free").limits.maxMembers).toBe(1);
    expect(getPlan("pro").limits.maxMembers).toBe(3);
    expect(getPlan("pro").features).toContain("Up to 3 team members");
    expect(getPlan("agency").limits.maxMembers).toBe(15);
  });

  it("white-label reports are Agency-only for new subscribers", () => {
    expect(getPlan("free").limits.whiteLabelReports).toBe(false);
    expect(getPlan("pro").limits.whiteLabelReports).toBe(false);
    expect(getPlan("agency").limits.whiteLabelReports).toBe(true);
  });

  it("each plan is at least the one below it, on every numeric limit", () => {
    const numericKeys = [
      "websites",
      "pagesPerWebsite",
      "historyDays",
      "manualScansPerDay",
      "maxMembers",
      "siteAuditPages",
      "siteAuditsPerDay",
    ] as const;
    for (let i = 1; i < plans.length; i++) {
      const lower = plans[i - 1]!;
      const higher = plans[i]!;
      expect(higher.priceMonthlyUsd).toBeGreaterThan(lower.priceMonthlyUsd);
      for (const key of numericKeys) {
        expect(higher.limits[key], `${higher.id}.${key}`).toBeGreaterThanOrEqual(lower.limits[key]);
      }
    }
  });

  it("never advertises a site audit bigger than the worker will crawl (2,000)", () => {
    for (const plan of plans) expect(plan.limits.siteAuditPages).toBeLessThanOrEqual(2000);
  });

  it("nextPlanUp walks free -> pro -> agency -> nothing", () => {
    expect(nextPlanUp("free")?.id).toBe("pro");
    expect(nextPlanUp("pro")?.id).toBe("agency");
    expect(nextPlanUp("agency")).toBeNull();
  });
});

describe("grandfathered Pro", () => {
  it("keeps white-label reports and 5 seats, at the Pro price and limits", () => {
    const legacy = resolvePlan("pro", true);
    expect(legacy.grandfathered).toBe(true);
    expect(legacy.limits.whiteLabelReports).toBe(true);
    expect(legacy.limits.maxMembers).toBe(5);
    expect(legacy.limits.websites).toBe(getPlan("pro").limits.websites);
    expect(legacy.priceMonthlyUsd).toBe(20);
    expect(legacy.features).toContain("Up to 5 team members");
    expect(legacy.features).not.toContain("Up to 3 team members");
    expect(legacy.features).toContain("White-label client reports");
  });

  it("does not leak into the shared config object", () => {
    resolvePlan("pro", true);
    expect(getPlan("pro").limits.whiteLabelReports).toBe(false);
    expect(getPlan("pro").limits.maxMembers).toBe(3);
  });

  it("only Pro can be grandfathered", () => {
    expect(resolvePlan("free", true).limits.whiteLabelReports).toBe(false);
    expect(resolvePlan("agency", true).grandfathered).toBeUndefined();
  });

  it("agrees with the worker's client-report gate for every tier", () => {
    // The worker cannot import this config, so it decides client-report
    // emails with includesClientReports(). The two must never disagree.
    for (const plan of plans) {
      for (const grandfathered of [false, true]) {
        expect(
          resolvePlan(plan.id, grandfathered).limits.whiteLabelReports,
          `${plan.id} grandfathered=${grandfathered}`,
        ).toBe(includesClientReports(plan.id, grandfathered));
      }
    }
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

/**
 * Guards the upsell against drifting from the plans it sells.
 *
 * The sidebar card originally advertised "25 websites, a year of history" -
 * numbers from the spec's aspirational pricing table, not from this config,
 * where Pro is 8 websites at $20. A customer finding that out after paying is
 * the worst possible moment.
 */
describe("no component hardcodes a plan number", () => {
  it("keeps the upgrade card reading from this config", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const source = readFileSync(
      fileURLToPath(new URL("../components/dashboard/upgrade-card.tsx", import.meta.url)),
      "utf8",
    );
    expect(source).toContain("getPlan(PAID_PLAN_ID)");
    // Strip comments and class names: a doc comment naming the old wrong
    // number is documentation, and Tailwind classes are full of digits.
    // What is left is the copy a customer actually reads.
    const copy = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      .replace(/className="[^"]*"/g, "");
    expect(copy).not.toMatch(/\b(?:25|100|2500|500|50)\b/);
  });
});
