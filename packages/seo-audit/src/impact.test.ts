import { describe, expect, it } from "vitest";
import { AUDIT_CHECKS } from "./registry";
import { AUDIT_IMPACT, auditImpactOf, summarizeImpact } from "./impact";

describe("AUDIT_IMPACT", () => {
  it("explains what every check costs, in plain words", () => {
    for (const id of Object.keys(AUDIT_CHECKS)) {
      const impact = AUDIT_IMPACT[id];
      expect(impact, `${id} has no business impact line`).toBeDefined();
      expect(impact.costs.length, id).toBeGreaterThan(30);
      expect(impact.hurts.length, id).toBeGreaterThan(0);
      // House style: no em or en dashes in user-facing copy.
      expect(impact.costs, id).not.toMatch(/[–—]/);
    }
  });

  it("has no lines for checks that do not exist", () => {
    for (const id of Object.keys(AUDIT_IMPACT)) {
      expect(AUDIT_CHECKS[id], `${id} is not a real check`).toBeDefined();
    }
  });
});

describe("summarizeImpact", () => {
  it("counts issue types and pages per area", () => {
    const s = summarizeImpact([
      { checkId: "http-4xx", count: 3 },
      { checkId: "title-missing", count: 2 },
      { checkId: "nope", count: 9 },
      { checkId: null, count: 1 },
    ]);
    expect(s.visitors).toEqual({ issues: 2, pages: 5 });
    expect(s.sales).toEqual({ issues: 1, pages: 3 });
    expect(s.trust).toEqual({ issues: 0, pages: 0 });
  });

  it("falls back for an unknown check", () => {
    expect(auditImpactOf("nope").costs).toBe("");
  });
});
