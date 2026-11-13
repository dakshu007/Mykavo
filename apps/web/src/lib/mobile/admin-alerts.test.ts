import { describe, expect, it } from "vitest";
import { dailyCounts, monthlyRevenue, pulseAlerts, type AlertInputs } from "./admin-alerts";

const calm: AlertInputs = {
  worker: { state: "healthy", minutesAgo: 2 },
  scans24h: { total: 100, failed: 1 },
  aiPaused: false,
  aiConfigured: true,
  aiPools: [{ label: "AI Writer", spentUsd: 1, capUsd: 50 }],
  aiJobsFailed24h: 0,
  wpDraftsStuck: 0,
  emailFailed24h: 0,
  paymentsOnHold: 0,
  appRequestsPending: 0,
  openIncidents: 0,
};

describe("pulseAlerts", () => {
  it("says nothing when everything is calm", () => {
    expect(pulseAlerts(calm)).toEqual([]);
  });

  it("puts a dead worker first", () => {
    const alerts = pulseAlerts({ ...calm, worker: { state: "down", minutesAgo: 90 }, appRequestsPending: 2 });
    expect(alerts[0]).toMatchObject({ level: "critical", title: "Worker looks down" });
    expect(alerts.at(-1)?.level).toBe("info");
  });

  it("flags scan failure rates only above the noise floor", () => {
    expect(pulseAlerts({ ...calm, scans24h: { total: 4, failed: 3 } })).toEqual([]);
    expect(pulseAlerts({ ...calm, scans24h: { total: 10, failed: 2 } })[0].level).toBe("warning");
    expect(pulseAlerts({ ...calm, scans24h: { total: 10, failed: 6 } })[0].level).toBe("critical");
  });

  it("warns at 80% of an AI budget and is critical at 100%", () => {
    expect(pulseAlerts({ ...calm, aiPools: [{ label: "AI Writer", spentUsd: 40, capUsd: 50 }] })[0].level).toBe("warning");
    expect(pulseAlerts({ ...calm, aiPools: [{ label: "AI Writer", spentUsd: 50, capUsd: 50 }] })[0].level).toBe("critical");
    expect(pulseAlerts({ ...calm, aiPools: [{ label: "AI Writer", spentUsd: 9, capUsd: 0 }] })).toEqual([]);
  });

  it("reports stuck WordPress drafts and failed email", () => {
    const titles = pulseAlerts({ ...calm, wpDraftsStuck: 1, emailFailed24h: 12 }).map((a) => a.title);
    expect(titles).toEqual(["12 emails failed today", "1 WordPress draft is stuck"]);
  });
});

describe("monthlyRevenue", () => {
  it("spreads yearly plans over twelve months", () => {
    const price = (id: string) => (id === "pro" ? { monthly: 29, yearly: 240 } : { monthly: 12, yearly: 0 });
    expect(monthlyRevenue([{ planId: "pro", billingInterval: "month" }, { planId: "pro", billingInterval: "year" }, { planId: "starter", billingInterval: "year" }], price)).toBe(61);
  });
});

describe("dailyCounts", () => {
  it("buckets dates by UTC day, today last", () => {
    const now = new Date("2026-11-13T10:00:00Z");
    const counts = dailyCounts([new Date("2026-11-13T01:00:00Z"), new Date("2026-11-12T23:00:00Z"), new Date("2026-11-12T01:00:00Z"), new Date("2026-10-01T00:00:00Z")], 3, now);
    expect(counts).toEqual([0, 2, 1]);
  });
});
