// TRANSIENT smoke test — deleted before commit. Verifies the panel SSR-renders
// the trend section with history and omits it with a single audit.
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PerformanceAuditPanel,
  type AuditView,
} from "@/components/dashboard/performance-audit-panel";

function view(overrides: Partial<AuditView> & { id: string; createdAt: string }): AuditView {
  return {
    status: "COMPLETED",
    url: "https://example.com/",
    performanceScore: 60,
    accessibilityScore: 90,
    bestPracticesScore: 85,
    seoScore: 100,
    lcpMs: 1200,
    fcpMs: 800,
    tbtMs: 50,
    ttiMs: 2000,
    speedIndexMs: 1500,
    cls: 0.01,
    errorCode: null,
    ...overrides,
  };
}

function render(initialAudits: AuditView[]): string {
  return renderToStaticMarkup(
    createElement(PerformanceAuditPanel, {
      websiteId: "w1",
      hostname: "example.com",
      homepagePath: "/",
      pagePaths: ["/pricing"],
      initialAudits,
    }),
  );
}

describe("PerformanceAuditPanel trend smoke", () => {
  it("renders the trend with >=2 completed audits of the same url", () => {
    const html = render([
      view({ id: "a2", createdAt: "2026-07-10T10:00:00Z", performanceScore: 74, bestPracticesScore: 82 }),
      view({ id: "a1", createdAt: "2026-07-09T10:00:00Z" }),
    ]);
    expect(html).toContain("Trend");
    expect(html).toContain("<polyline");
    expect(html).toContain("<circle");
    expect(html).toContain("Performance 60 → 74"); // aria summary
    expect(html).toContain("+14");
    expect(html).toContain("−3");
    expect(html).toContain("since Jul 9");
    expect(html).toContain("2 audits");
  });

  it("renders nothing trend-related with a single completed audit", () => {
    const html = render([view({ id: "a1", createdAt: "2026-07-09T10:00:00Z" })]);
    expect(html).not.toContain("Trend");
    expect(html).not.toContain("<polyline");
  });
});
