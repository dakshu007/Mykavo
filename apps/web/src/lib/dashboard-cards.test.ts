import { describe, expect, it, vi } from "vitest";

const used = { report: 0, post: 1 };
vi.mock("@/lib/keywords/jobs", () => ({
  loadAllowance: async () => ({
    limits: { reports: 1, posts: 1, visibleOpportunities: 10 },
    unlimited: false,
    onTrial: false,
    period: { start: new Date("2026-11-13T00:00:00Z"), end: new Date("2026-12-13T00:00:00Z") },
    used,
    blocked: null,
  }),
  remaining: (a: { limits: { reports: number; posts: number }; used: typeof used }, kind: "report" | "post") =>
    Math.max(0, (kind === "report" ? a.limits.reports : a.limits.posts) - a.used[kind]),
}));
vi.mock("@/lib/ai/explain-change", () => ({ explanationsThisMonth: async () => 0 }));

import { getPlan } from "@/config/plans";
import { findLimitHit, nextPlanFor } from "@/lib/dashboard-cards";

describe("nextPlanFor", () => {
  it("sends Free and Starter to Pro, Pro to Agency, and Agency nowhere", () => {
    expect(nextPlanFor("free")?.id).toBe("pro");
    expect(nextPlanFor("starter")?.id).toBe("pro");
    expect(nextPlanFor("pro")?.id).toBe("agency");
    expect(nextPlanFor("agency")).toBeNull();
  });
});

describe("findLimitHit", () => {
  it("puts a used-up blog post first, with the refill date and Pro's allowance", async () => {
    const hit = await findLimitHit({
      workspaceId: "ws_test",
      plan: getPlan("free"),
      websitesUsed: 1,
      websiteLimit: 1,
      keywordAgent: true,
    });
    expect(hit?.kind).toBe("posts");
    expect(hit?.key).toBe("posts:2026-11-13");
    expect(hit?.title).toBe("This month's blog post is used");
    expect(hit?.body).toBe("More on Dec 13. Pro writes 10 posts a month.");
  });

  it("says so when every website slot is used, and offers Pro's count from the plan config", async () => {
    const hit = await findLimitHit({
      workspaceId: "ws_test",
      plan: getPlan("free"),
      websitesUsed: 1,
      websiteLimit: 1,
      keywordAgent: false,
    });
    expect(hit?.kind).toBe("websites");
    expect(hit?.next.id).toBe("pro");
    expect(hit?.title).toBe("All 1 website in use");
    expect(hit?.body).toContain(`${getPlan("pro").limits.websites} websites`);
    expect(hit?.key).toBe("websites:1");
  });

  it("never shows a card on the top plan", async () => {
    const hit = await findLimitHit({
      workspaceId: "ws_test",
      plan: getPlan("agency"),
      websitesUsed: 999,
      websiteLimit: 30,
      keywordAgent: true,
    });
    expect(hit).toBeNull();
  });
});
