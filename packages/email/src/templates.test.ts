import { describe, expect, it } from "vitest";
import {
  scanSummaryEmail,
  failureAlertEmail,
  weeklyReportEmail,
  workspaceInviteEmail,
  performanceDropEmail,
  type WeeklyReportData,
  type PerformanceDropData,
} from "./templates";

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
    dashboardUrl: "https://mykavo.app/dashboard/changes",
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
    expect(text).toContain("Review: https://mykavo.app/dashboard/changes");
  });
});

describe("weeklyReportEmail", () => {
  const base: WeeklyReportData = {
    websiteName: "Aurora Outdoor",
    websiteHost: "aurora-outdoor.com",
    periodLabel: "Jul 3 – Jul 10, 2026",
    scansRun: 7,
    scansFailed: 1,
    totalChanges: 3,
    changesBySeverity: [
      { severity: "HIGH", count: 1 },
      { severity: "MEDIUM", count: 2 },
    ],
    uptimePercent: 99.9,
    avgResponseMs: 231,
    sslDaysLeft: 83,
    lighthouse: { performance: 92, accessibility: 98, bestPractices: 100, seo: 100 },
    allQuiet: false,
    dashboardUrl: "https://mykavo.app/dashboard/websites/w1",
  };

  it("builds a changes + uptime subject", () => {
    expect(weeklyReportEmail(base).subject).toBe(
      "Weekly report for aurora-outdoor.com — 3 changes, 99.9% uptime",
    );
  });

  it("omits uptime from the subject when unknown and pluralizes correctly", () => {
    const { subject } = weeklyReportEmail({
      ...base,
      totalChanges: 1,
      changesBySeverity: [{ severity: "HIGH", count: 1 }],
      uptimePercent: null,
    });
    expect(subject).toBe("Weekly report for aurora-outdoor.com — 1 change");
  });

  it("includes stats, severity breakdown, SSL, Lighthouse, and the CTA", () => {
    const { html } = weeklyReportEmail(base);
    expect(html).toContain("Aurora Outdoor");
    expect(html).toContain("Jul 3 – Jul 10, 2026");
    expect(html).toContain("99.9%");
    expect(html).toContain("scans (1 failed)");
    expect(html).toContain("High");
    expect(html).toContain("Medium");
    expect(html).toContain("SSL certificate valid for another 83 days.");
    expect(html).toContain("Performance 92 · Accessibility 98 · Best Practices 100 · SEO 100");
    expect(html).toContain(base.dashboardUrl);
    expect(html).not.toContain("everything looks healthy");
  });

  it("sends a reassuring all-quiet variant when nothing happened", () => {
    const quiet = weeklyReportEmail({
      ...base,
      scansFailed: 0,
      totalChanges: 0,
      changesBySeverity: [],
      uptimePercent: 100,
      sslDaysLeft: null,
      lighthouse: null,
      allQuiet: true,
    });
    expect(quiet.subject).toBe(
      "Weekly report for aurora-outdoor.com — no changes, 100% uptime",
    );
    expect(quiet.html).toContain("No unexpected changes — everything looks healthy.");
    expect(quiet.text).toContain("No unexpected changes — everything looks healthy.");
  });

  it("provides a plain-text alternative with every section", () => {
    const { text } = weeklyReportEmail(base);
    expect(text).toContain("Weekly report for aurora-outdoor.com (Jul 3 – Jul 10, 2026)");
    expect(text).toContain("Uptime: 99.9%");
    expect(text).toContain("Scans: 7 run, 1 failed");
    expect(text).toContain("- [High] 1 change");
    expect(text).toContain("- [Medium] 2 changes");
    expect(text).toContain("SSL certificate valid for another 83 days.");
    expect(text).toContain("Dashboard: https://mykavo.app/dashboard/websites/w1");
  });

  it("HTML-escapes the website name", () => {
    const { html } = weeklyReportEmail({ ...base, websiteName: "<b>Evil</b> & Co" });
    expect(html).not.toContain("<b>Evil</b>");
    expect(html).toContain("&lt;b&gt;Evil&lt;/b&gt; &amp; Co");
  });
});

describe("performanceDropEmail", () => {
  const base: PerformanceDropData = {
    websiteName: "Aurora Outdoor",
    websiteHost: "aurora-outdoor.com",
    pagePath: "/",
    previous: { performance: 90, accessibility: 98, bestPractices: 100, seo: 100, lcpMs: 1200 },
    current: { performance: 62, accessibility: 98, bestPractices: 92, seo: 100, lcpMs: 3400 },
    dashboardUrl: "https://mykavo.app/dashboard/websites/w1",
  };

  it("builds the '📉 Performance dropped on {host}: {prev} → {curr}' subject", () => {
    expect(performanceDropEmail(base).subject).toBe(
      "\u{1F4C9} Performance dropped on aurora-outdoor.com: 90 → 62",
    );
  });

  it("lists the four score deltas, the LCP change, and the dashboard link", () => {
    const { html } = performanceDropEmail(base);
    expect(html).toContain("Performance on Aurora Outdoor fell 90 → 62");
    expect(html).toContain("90 → 62 (-28)");
    expect(html).toContain("98 → 98 (±0)");
    expect(html).toContain("100 → 92 (-8)");
    expect(html).toContain("1.2 s → 3.4 s");
    expect(html).toContain("aurora-outdoor.com/");
    expect(html).toContain(base.dashboardUrl);
  });

  it("provides a plain-text alternative with every delta", () => {
    const { text } = performanceDropEmail(base);
    expect(text).toContain("Performance dropped on aurora-outdoor.com: 90 → 62");
    expect(text).toContain("Audited page: aurora-outdoor.com/");
    expect(text).toContain("- Performance: 90 → 62 (-28)");
    expect(text).toContain("- Accessibility: 98 → 98 (±0)");
    expect(text).toContain("- Best Practices: 100 → 92 (-8)");
    expect(text).toContain("- SEO: 100 → 100 (±0)");
    expect(text).toContain("- LCP: 1.2 s → 3.4 s");
    expect(text).toContain("Dashboard: https://mykavo.app/dashboard/websites/w1");
  });

  it("renders '—' for scores missing on either side", () => {
    const { text } = performanceDropEmail({
      ...base,
      previous: { ...base.previous, accessibility: null, lcpMs: null },
      current: { ...base.current, seo: null },
    });
    expect(text).toContain("- Accessibility: —");
    expect(text).toContain("- SEO: —");
    expect(text).toContain("- LCP: — → 3.4 s");
  });

  it("HTML-escapes the website name", () => {
    const { html } = performanceDropEmail({ ...base, websiteName: "<b>Evil</b> & Co" });
    expect(html).not.toContain("<b>Evil</b>");
    expect(html).toContain("&lt;b&gt;Evil&lt;/b&gt; &amp; Co");
  });
});

describe("failureAlertEmail", () => {
  it("builds a failure subject and includes the reason", () => {
    const { subject, html } = failureAlertEmail({
      websiteName: "Aurora Outdoor",
      websiteHost: "aurora-outdoor.com",
      scanTime: "Jul 8, 2026",
      reason: "The homepage returned HTTP 500.",
      dashboardUrl: "https://mykavo.app/dashboard",
    });
    expect(subject).toBe("Scan failed for aurora-outdoor.com");
    expect(html).toContain("The homepage returned HTTP 500.");
  });
});

describe("workspaceInviteEmail", () => {
  const data = {
    inviterName: "Ada Lovelace",
    workspaceName: "Aurora Agency",
    roleLabel: "Member",
    acceptUrl: "https://mykavo.app/invite/tok_abc123",
    expiresInDays: 7,
  };

  it("builds the '{inviter} invited you to {workspace} on MyKavo' subject", () => {
    expect(workspaceInviteEmail(data).subject).toBe(
      "Ada Lovelace invited you to Aurora Agency on MyKavo",
    );
  });

  it("includes the role, accept link button, and expiry note", () => {
    const { html, text } = workspaceInviteEmail(data);
    expect(html).toContain("Accept invitation");
    expect(html).toContain(data.acceptUrl);
    expect(html).toContain("Member");
    expect(html).toContain("expires in 7 days");
    expect(text).toContain(`Accept: ${data.acceptUrl}`);
    expect(text).toContain("expires in 7 days");
  });

  it("HTML-escapes the inviter and workspace names", () => {
    const evil = workspaceInviteEmail({
      ...data,
      inviterName: "<script>x</script>",
      workspaceName: "A & B <Co>",
    });
    expect(evil.html).not.toContain("<script>x</script>");
    expect(evil.html).toContain("&lt;script&gt;");
    expect(evil.html).toContain("A &amp; B &lt;Co&gt;");
  });
});
