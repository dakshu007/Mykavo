import { describe, expect, it } from "vitest";
import { scanSummaryEmail, failureAlertEmail } from "./templates";

describe("scanSummaryEmail", () => {
  const data = {
    websiteName: "Aurora Outdoor",
    websiteHost: "aurora-outdoor.com",
    scanTime: "Jul 8, 2026 6:00 AM",
    totalChanges: 2,
    highestSeverity: "CRITICAL" as const,
    changes: [
      { severity: "CRITICAL" as const, title: "HTTP status changed 200 → 404", pagePath: "/checkout" },
      { severity: "HIGH" as const, title: "Canonical URL removed", pagePath: "/" },
    ],
    dashboardUrl: "https://fluxen.app/dashboard/changes",
  };

  it("uses a severity-led subject with the host", () => {
    expect(scanSummaryEmail(data).subject).toBe("Critical changes detected on aurora-outdoor.com");
  });

  it("includes each change title and the dashboard CTA", () => {
    const { html } = scanSummaryEmail(data);
    expect(html).toContain("HTTP status changed 200 → 404");
    expect(html).toContain("Canonical URL removed");
    expect(html).toContain("aurora-outdoor.com/checkout");
    expect(html).toContain(data.dashboardUrl);
    expect(html).toContain("2 changes on Aurora Outdoor");
  });

  it("HTML-escapes interpolated values", () => {
    const evil = scanSummaryEmail({
      ...data,
      websiteName: "<script>alert(1)</script>",
      changes: [{ severity: "HIGH", title: "a & b <c>", pagePath: "/x" }],
    });
    expect(evil.html).not.toContain("<script>alert(1)</script>");
    expect(evil.html).toContain("&lt;script&gt;");
    expect(evil.html).toContain("a &amp; b &lt;c&gt;");
  });

  it("provides a plain-text alternative", () => {
    const { text } = scanSummaryEmail(data);
    expect(text).toContain("[Critical] HTTP status changed 200 → 404");
    expect(text).toContain("Review: https://fluxen.app/dashboard/changes");
  });
});

describe("failureAlertEmail", () => {
  it("builds a failure subject and includes the reason", () => {
    const { subject, html } = failureAlertEmail({
      websiteName: "Aurora Outdoor",
      websiteHost: "aurora-outdoor.com",
      scanTime: "Jul 8, 2026",
      reason: "The homepage returned HTTP 500.",
      dashboardUrl: "https://fluxen.app/dashboard",
    });
    expect(subject).toBe("Scan failed for aurora-outdoor.com");
    expect(html).toContain("The homepage returned HTTP 500.");
  });
});
