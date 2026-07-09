import { describe, expect, it } from "vitest";
import { parseLighthouseResult } from "./lighthouse";

describe("parseLighthouseResult", () => {
  it("maps category scores to 0–100 and vitals to rounded ms", () => {
    const lhr = {
      categories: {
        performance: { score: 0.91 },
        accessibility: { score: 1 },
        "best-practices": { score: 0.75 },
        seo: { score: 0.83 },
      },
      audits: {
        "largest-contentful-paint": { numericValue: 3429.86 },
        "first-contentful-paint": { numericValue: 1200.4 },
        "total-blocking-time": { numericValue: 0 },
        interactive: { numericValue: 4100.9 },
        "speed-index": { numericValue: 2500.5 },
        "cumulative-layout-shift": { numericValue: 0.00028 },
      },
    };
    expect(parseLighthouseResult(lhr)).toEqual({
      performanceScore: 91,
      accessibilityScore: 100,
      bestPracticesScore: 75,
      seoScore: 83,
      lcpMs: 3430,
      fcpMs: 1200,
      tbtMs: 0,
      ttiMs: 4101,
      speedIndexMs: 2501,
      cls: 0, // 0.00028 rounds to 3 decimals -> 0
    });
  });

  it("keeps CLS to 3 decimals", () => {
    const lhr = { audits: { "cumulative-layout-shift": { numericValue: 0.1274 } } };
    expect(parseLighthouseResult(lhr).cls).toBe(0.127);
  });

  it("returns null for missing categories/audits (never throws)", () => {
    const result = parseLighthouseResult({});
    expect(result.performanceScore).toBeNull();
    expect(result.lcpMs).toBeNull();
    expect(result.cls).toBeNull();
  });

  it("treats an explicit null score as null, not 0", () => {
    const lhr = { categories: { performance: { score: null } } };
    expect(parseLighthouseResult(lhr).performanceScore).toBeNull();
  });
});
