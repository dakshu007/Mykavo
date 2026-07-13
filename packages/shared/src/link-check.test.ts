import { describe, expect, it } from "vitest";
import { mapWithConcurrency, planLinkChecks } from "./link-check";

describe("planLinkChecks", () => {
  it("dedupes URLs preserving first-seen order", () => {
    const plan = planLinkChecks(
      ["https://a.com/x", "https://a.com/y", "https://a.com/x"],
      new Map(),
    );
    expect(plan.toCheck).toEqual(["https://a.com/x", "https://a.com/y"]);
    expect(plan.dropped).toBe(0);
  });

  it("reuses known statuses instead of scheduling a probe", () => {
    const plan = planLinkChecks(
      ["https://a.com/", "https://a.com/pricing"],
      new Map([["https://a.com/", 200]]),
    );
    expect(plan.toCheck).toEqual(["https://a.com/pricing"]);
    expect(plan.reused.get("https://a.com/")).toBe(200);
  });

  it("caps probes and counts dropped URLs", () => {
    const urls = Array.from({ length: 10 }, (_, i) => `https://a.com/${i}`);
    const plan = planLinkChecks(urls, new Map(), 3);
    expect(plan.toCheck).toHaveLength(3);
    expect(plan.dropped).toBe(7);
  });

  it("reused URLs never consume the cap", () => {
    const plan = planLinkChecks(
      ["https://a.com/known", "https://a.com/1", "https://a.com/2"],
      new Map([["https://a.com/known", 200]]),
      2,
    );
    expect(plan.toCheck).toEqual(["https://a.com/1", "https://a.com/2"]);
    expect(plan.dropped).toBe(0);
  });
});

describe("mapWithConcurrency", () => {
  it("preserves input order in results", async () => {
    const out = await mapWithConcurrency([3, 1, 2], 2, async (n) => {
      await new Promise((r) => setTimeout(r, n * 5));
      return n * 10;
    });
    expect(out).toEqual([30, 10, 20]);
  });

  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 8 }, (_, i) => i), 3, async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    });
    expect(peak).toBeLessThanOrEqual(3);
  });

  it("handles an empty input", async () => {
    expect(await mapWithConcurrency([], 4, async (x) => x)).toEqual([]);
  });
});
