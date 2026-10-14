import { describe, expect, it } from "vitest";
import { getPlan, resolvePlan } from "@/config/plans";
import { isPlanLimitMessage } from "@/components/dashboard/limit-aware-error";

describe("trial plan", () => {
  it("is Pro with a 3-website cap and the end date", () => {
    const endsAt = new Date("2026-10-29T00:00:00Z");
    const plan = resolvePlan("pro", false, false, endsAt);
    expect(plan.id).toBe("pro");
    expect(plan.name).toBe("Pro trial");
    expect(plan.limits.websites).toBe(3);
    expect(plan.limits.scanFrequency).toBe("DAILY");
    expect(plan.trial?.endsAt).toBe(endsAt);
  });

  it("leaves paid Pro untouched", () => {
    const plan = resolvePlan("pro");
    expect(plan.trial ?? null).toBeNull();
    expect(plan.limits.websites).toBe(getPlan("pro").limits.websites);
  });
});

describe("isPlanLimitMessage", () => {
  it("spots plan limits and paid features", () => {
    expect(isPlanLimitMessage("Your Free plan monitors up to 1 website. Upgrade to Pro to monitor up to 8.")).toBe(true);
    expect(isPlanLimitMessage("Daily scans require a paid plan.")).toBe(true);
    expect(isPlanLimitMessage("Could not start the scan.")).toBe(false);
  });
});
