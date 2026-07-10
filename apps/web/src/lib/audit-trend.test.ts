import { describe, expect, it } from "vitest";
import {
  auditTrendSummary,
  buildAuditTrend,
  formatSignedDelta,
  formatTrendDate,
  type TrendAuditInput,
} from "./audit-trend";

const HOME = "https://example.com/";
const PRICING = "https://example.com/pricing";

/** Shorthand audit factory; scores default to non-null so tests read compactly. */
function audit(
  overrides: Partial<TrendAuditInput> & { createdAt: string },
): TrendAuditInput {
  return {
    status: "COMPLETED",
    url: HOME,
    performanceScore: 50,
    accessibilityScore: 90,
    bestPracticesScore: 85,
    seoScore: 100,
    ...overrides,
  };
}

describe("buildAuditTrend", () => {
  describe("fewer than 2 completed audits", () => {
    it("returns null for an empty list", () => {
      expect(buildAuditTrend([])).toBeNull();
    });

    it("returns null for a single completed audit", () => {
      expect(buildAuditTrend([audit({ createdAt: "2026-07-09T10:00:00Z" })])).toBeNull();
    });

    it("ignores QUEUED, RUNNING, and FAILED audits", () => {
      const audits = [
        audit({ createdAt: "2026-07-09T10:00:00Z" }),
        audit({ createdAt: "2026-07-09T11:00:00Z", status: "FAILED" }),
        audit({ createdAt: "2026-07-09T12:00:00Z", status: "RUNNING" }),
        audit({ createdAt: "2026-07-09T13:00:00Z", status: "QUEUED" }),
      ];
      expect(buildAuditTrend(audits)).toBeNull();
    });

    it("returns null when the relevant url has only 1 completed audit even if another url has more", () => {
      const audits = [
        // Most recent completed audit is for /pricing, which has no history.
        audit({ createdAt: "2026-07-11T10:00:00Z", url: PRICING }),
        audit({ createdAt: "2026-07-10T10:00:00Z" }),
        audit({ createdAt: "2026-07-09T10:00:00Z" }),
      ];
      expect(buildAuditTrend(audits)).toBeNull();
    });
  });

  describe("grouping by url", () => {
    it("only charts audits of the same url", () => {
      const audits = [
        audit({ createdAt: "2026-07-11T10:00:00Z", performanceScore: 74 }),
        audit({ createdAt: "2026-07-10T10:00:00Z", url: PRICING }),
        audit({ createdAt: "2026-07-09T10:00:00Z", performanceScore: 60 }),
      ];
      const trend = buildAuditTrend(audits);
      expect(trend).not.toBeNull();
      expect(trend?.url).toBe(HOME);
      expect(trend?.points).toHaveLength(2);
      expect(trend?.points.map((p) => p.scores.performanceScore)).toEqual([60, 74]);
    });

    it("defaults to the url of the most recent completed audit", () => {
      const audits = [
        audit({ createdAt: "2026-07-12T10:00:00Z", url: PRICING }),
        audit({ createdAt: "2026-07-11T10:00:00Z" }),
        audit({ createdAt: "2026-07-10T10:00:00Z", url: PRICING }),
        audit({ createdAt: "2026-07-09T10:00:00Z" }),
      ];
      expect(buildAuditTrend(audits)?.url).toBe(PRICING);
    });

    it("prefers the picker's url when it has history", () => {
      const audits = [
        audit({ createdAt: "2026-07-12T10:00:00Z" }),
        audit({ createdAt: "2026-07-11T10:00:00Z" }),
        audit({ createdAt: "2026-07-10T10:00:00Z", url: PRICING }),
        audit({ createdAt: "2026-07-09T10:00:00Z", url: PRICING }),
      ];
      expect(buildAuditTrend(audits, PRICING)?.url).toBe(PRICING);
    });

    it("falls back to the most recent audit's url when the preferred url lacks history", () => {
      const audits = [
        audit({ createdAt: "2026-07-11T10:00:00Z" }),
        audit({ createdAt: "2026-07-10T10:00:00Z" }),
        audit({ createdAt: "2026-07-09T10:00:00Z", url: PRICING }),
      ];
      expect(buildAuditTrend(audits, PRICING)?.url).toBe(HOME);
      expect(buildAuditTrend(audits, "https://example.com/unknown")?.url).toBe(HOME);
      expect(buildAuditTrend(audits, null)?.url).toBe(HOME);
    });
  });

  describe("ordering", () => {
    it("orders points oldest → newest regardless of input order", () => {
      const audits = [
        audit({ createdAt: "2026-07-10T10:00:00Z", performanceScore: 65 }),
        audit({ createdAt: "2026-07-12T10:00:00Z", performanceScore: 74 }),
        audit({ createdAt: "2026-07-09T10:00:00Z", performanceScore: 60 }),
      ];
      const trend = buildAuditTrend(audits);
      expect(trend?.points.map((p) => p.createdAt)).toEqual([
        "2026-07-09T10:00:00Z",
        "2026-07-10T10:00:00Z",
        "2026-07-12T10:00:00Z",
      ]);
      expect(trend?.points.map((p) => p.scores.performanceScore)).toEqual([60, 65, 74]);
    });

    it("exposes firstAt and previousAt anchors", () => {
      const audits = [
        audit({ createdAt: "2026-07-12T10:00:00Z" }),
        audit({ createdAt: "2026-07-10T10:00:00Z" }),
        audit({ createdAt: "2026-07-09T10:00:00Z" }),
      ];
      const trend = buildAuditTrend(audits);
      expect(trend?.firstAt).toBe("2026-07-09T10:00:00Z");
      expect(trend?.previousAt).toBe("2026-07-10T10:00:00Z");
    });
  });

  describe("delta math", () => {
    it("computes latest minus previous per category", () => {
      const audits = [
        audit({
          createdAt: "2026-07-11T10:00:00Z",
          performanceScore: 74,
          accessibilityScore: 90,
          bestPracticesScore: 82,
          seoScore: 100,
        }),
        audit({
          createdAt: "2026-07-10T10:00:00Z",
          performanceScore: 60,
          accessibilityScore: 90,
          bestPracticesScore: 85,
          seoScore: 100,
        }),
        // Older audit must not affect the delta (latest vs previous only).
        audit({ createdAt: "2026-07-09T10:00:00Z", performanceScore: 10 }),
      ];
      const trend = buildAuditTrend(audits);
      const byKey = Object.fromEntries(
        (trend?.categories ?? []).map((c) => [c.key, c.delta]),
      );
      expect(byKey).toEqual({
        performanceScore: 14,
        accessibilityScore: 0,
        bestPracticesScore: -3,
        seoScore: 0,
      });
    });

    it("yields a null delta when either side is missing", () => {
      const audits = [
        audit({ createdAt: "2026-07-10T10:00:00Z", performanceScore: null }),
        audit({ createdAt: "2026-07-09T10:00:00Z", accessibilityScore: null }),
      ];
      const categories = buildAuditTrend(audits)?.categories ?? [];
      expect(categories.find((c) => c.key === "performanceScore")?.delta).toBeNull();
      expect(categories.find((c) => c.key === "accessibilityScore")?.delta).toBeNull();
      expect(categories.find((c) => c.key === "seoScore")?.delta).toBe(0);
    });

    it("records first and latest values for the summary", () => {
      const audits = [
        audit({ createdAt: "2026-07-11T10:00:00Z", performanceScore: 74 }),
        audit({ createdAt: "2026-07-09T10:00:00Z", performanceScore: 60 }),
      ];
      const perf = buildAuditTrend(audits)?.categories.find(
        (c) => c.key === "performanceScore",
      );
      expect(perf?.first).toBe(60);
      expect(perf?.latest).toBe(74);
      expect(perf?.previous).toBe(60);
    });
  });
});

describe("formatSignedDelta", () => {
  it("always spells the sign out in text", () => {
    expect(formatSignedDelta(14)).toBe("+14");
    expect(formatSignedDelta(-3)).toBe("−3");
    expect(formatSignedDelta(0)).toBe("0");
  });
});

describe("formatTrendDate", () => {
  it("formats a short month + day", () => {
    expect(formatTrendDate("2026-07-09T12:00:00Z")).toMatch(/^Jul 9|^Jul 10/);
  });
});

describe("auditTrendSummary", () => {
  it("summarizes oldest → newest per category with count and start date", () => {
    const audits = [
      audit({ createdAt: "2026-07-11T12:00:00Z", performanceScore: 74 }),
      audit({ createdAt: "2026-07-10T12:00:00Z", performanceScore: 65 }),
      audit({ createdAt: "2026-07-09T12:00:00Z", performanceScore: 60 }),
    ];
    const trend = buildAuditTrend(audits);
    expect(trend).not.toBeNull();
    const summary = auditTrendSummary(trend as NonNullable<typeof trend>);
    expect(summary).toContain("Performance 60 → 74");
    expect(summary).toContain("Accessibility 90 → 90");
    expect(summary).toContain("across 3 audits");
    expect(summary).toMatch(/since Jul (9|10)\.$/);
  });

  it("omits categories that never had a score", () => {
    const audits = [
      audit({ createdAt: "2026-07-10T12:00:00Z", seoScore: null }),
      audit({ createdAt: "2026-07-09T12:00:00Z", seoScore: null }),
    ];
    const trend = buildAuditTrend(audits);
    const summary = auditTrendSummary(trend as NonNullable<typeof trend>);
    expect(summary).not.toContain("SEO");
    expect(summary).toContain("Performance");
  });
});
