import { describe, expect, it, vi } from "vitest";
import type { StrikingOpportunity } from "@mykavo/shared";

vi.mock("@mykavo/database", () => ({ prisma: {} }));
vi.mock("@/lib/billing/subscription", () => ({ getWorkspacePlan: vi.fn() }));

const { FREE_VISIBLE_OPPORTUNITIES, limitForPlan } = await import("./striking");

const opp = (i: number): StrikingOpportunity => ({
  query: `query ${i}`,
  page: `https://example.com/${i}`,
  position: 12,
  impressions: 100,
  clicks: 1,
  ctr: 0.01,
  estimatedExtraClicks: 7,
  action: "supporting_post",
  competingPages: [],
  reason: "r",
});

describe("limitForPlan", () => {
  const all = Array.from({ length: 25 }, (_, i) => opp(i));

  it("sends Free plans only the top 10 and a count of the rest", () => {
    const { visible, hiddenCount } = limitForPlan(all, true);
    expect(visible).toHaveLength(FREE_VISIBLE_OPPORTUNITIES);
    expect(visible[0]?.query).toBe("query 0");
    expect(hiddenCount).toBe(15);
  });

  it("sends paid plans everything", () => {
    expect(limitForPlan(all, false)).toEqual({ visible: all, hiddenCount: 0 });
  });

  it("hides nothing when a Free site has fewer than 10", () => {
    expect(limitForPlan(all.slice(0, 4), true).hiddenCount).toBe(0);
  });
});
