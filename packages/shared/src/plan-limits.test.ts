import { describe, expect, it } from "vitest";
import { PLAN_PRICES_USD, TRIAL_MAX_WEBSITES, pageLimitFor, toPlanTier, websiteLimitFor } from "./plan-tier";
import { historyDaysForPlan } from "./retention";

describe("Starter tier", () => {
  it("is a real tier at $7 with 90 days of history", () => {
    expect(toPlanTier("starter")).toBe("starter");
    expect(PLAN_PRICES_USD.starter).toBe(7);
    expect(historyDaysForPlan("starter")).toBe(90);
  });
});

describe("websiteLimitFor", () => {
  it("follows the tier, the trial cap and the admin's unlimited plan", () => {
    expect(websiteLimitFor({ planId: "starter" })).toBe(2);
    expect(websiteLimitFor({ planId: "pro", billedBy: "dodo" })).toBe(8);
    expect(websiteLimitFor({ planId: "pro", billedBy: "trial" })).toBe(TRIAL_MAX_WEBSITES);
    expect(websiteLimitFor({ planId: "agency", unlimited: true })).toBe(Infinity);
    expect(websiteLimitFor({ planId: "nonsense" })).toBe(1);
  });
});

describe("pageLimitFor", () => {
  it("caps pages per website by tier, Free without an entitlement", () => {
    expect(pageLimitFor(null)).toBe(5);
    expect(pageLimitFor({ planId: "starter" })).toBe(10);
    expect(pageLimitFor({ planId: "agency" })).toBe(25);
    expect(pageLimitFor({ planId: "agency", unlimited: true })).toBe(Infinity);
  });
});
