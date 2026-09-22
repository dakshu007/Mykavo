import { describe, expect, it } from "vitest";
import {
  welcomeEmail,
  appAccessApprovedEmail,
  scanSummaryEmail,
  failureAlertEmail,
  deployVerdictEmail,
  weeklyReportEmail,
  workspaceInviteEmail,
  performanceDropEmail,
  workerDbOutageEmail,
  workerDbRecoveryEmail,
  type DeployVerdictData,
  clientReportDeliveryEmail,
  type ClientReportDeliveryData,
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
      "Weekly report for aurora-outdoor.com - 3 changes, 99.9% uptime",
    );
  });

  it("omits uptime from the subject when unknown and pluralizes correctly", () => {
    const { subject } = weeklyReportEmail({
      ...base,
      totalChanges: 1,
      changesBySeverity: [{ severity: "HIGH", count: 1 }],
      uptimePercent: null,
    });
    expect(subject).toBe("Weekly report for aurora-outdoor.com - 1 change");
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
      "Weekly report for aurora-outdoor.com - no changes, 100% uptime",
    );
    expect(quiet.html).toContain("No unexpected changes - everything looks healthy.");
    expect(quiet.text).toContain("No unexpected changes - everything looks healthy.");
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

  it("renders '-' for scores missing on either side", () => {
    const { text } = performanceDropEmail({
      ...base,
      previous: { ...base.previous, accessibility: null, lcpMs: null },
      current: { ...base.current, seo: null },
    });
    expect(text).toContain("- Accessibility: -");
    expect(text).toContain("- SEO: -");
    expect(text).toContain("- LCP: - → 3.4 s");
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

  // A scan whose pages captured fine but whose comparison fell over must not
  // tell the reader their site failed to scan - it sends them debugging a
  // site that is working, and buries the thing that actually went wrong.
  it("says the scan was incomplete, not failed, when only the verdict is missing", () => {
    const { subject, html, text } = failureAlertEmail({
      websiteName: "Aurora Outdoor",
      websiteHost: "aurora-outdoor.com",
      scanTime: "Jul 8, 2026",
      reason: "The comparison against the approved baseline did not finish.",
      dashboardUrl: "https://mykavo.app/dashboard",
      kind: "incomplete",
    });
    expect(subject).toBe("Scan incomplete for aurora-outdoor.com - changes were not checked");
    expect(subject).not.toContain("failed");
    expect(html).toContain("Couldn't check Aurora Outdoor for changes");
    expect(text).toContain("did not finish");
  });

  it("defaults to the failure wording when no kind is given", () => {
    expect(
      failureAlertEmail({
        websiteName: "Aurora Outdoor",
        websiteHost: "aurora-outdoor.com",
        scanTime: "Jul 8, 2026",
        reason: "DNS lookup failed.",
        dashboardUrl: "https://mykavo.app/dashboard",
      }).subject,
    ).toBe("Scan failed for aurora-outdoor.com");
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

describe("deployVerdictEmail", () => {
  const base: DeployVerdictData = {
    websiteName: "Aurora Outdoor",
    websiteHost: "aurora-outdoor.com",
    scanTime: "Aug 2, 2026, 10:15 AM",
    note: "v2.4.1",
    totalChanges: 0,
    highestSeverity: null,
    changes: [],
    dashboardUrl: "https://mykavo.app/dashboard/websites/w1",
  };

  it("celebrates a clean deploy with the release tag in the subject", () => {
    const { subject, html, text } = deployVerdictEmail(base);
    expect(subject).toBe("✅ Deploy verified (v2.4.1) - aurora-outdoor.com matches its baseline");
    expect(html).toContain("No unexpected changes");
    expect(html).toContain("approved baseline");
    expect(text).toContain("Deploy verified (v2.4.1)");
  });

  it("omits the release tag when no note was sent", () => {
    const { subject } = deployVerdictEmail({ ...base, note: null });
    expect(subject).toBe("✅ Deploy verified - aurora-outdoor.com matches its baseline");
  });

  it("lists changes with the highest severity when the deploy is not clean", () => {
    const { subject, html } = deployVerdictEmail({
      ...base,
      totalChanges: 2,
      highestSeverity: "HIGH",
      changes: [
        { severity: "HIGH", title: "Title changed", pagePath: "/pricing" },
        { severity: "LOW", title: "Script added", pagePath: "/" },
      ],
    });
    expect(subject).toBe(
      "Deploy check (v2.4.1): 2 changes on aurora-outdoor.com - highest High",
    );
    expect(html).toContain("Title changed");
    expect(html).toContain("aurora-outdoor.com/pricing");
    expect(html).toContain("Review changes");
  });

  it("HTML-escapes the note and website name", () => {
    const evil = deployVerdictEmail({
      ...base,
      note: "<img src=x>",
      websiteName: "A & B",
    });
    expect(evil.html).not.toContain("<img src=x>");
    expect(evil.html).toContain("&lt;img src=x&gt;");
    expect(evil.html).toContain("A &amp; B");
  });
});

describe("clientReportDeliveryEmail", () => {
  const base: ClientReportDeliveryData = {
    websiteName: "Aurora Outdoor",
    websiteHost: "aurora-outdoor.com",
    periodLabel: "Jul 3 – Aug 2, 2026",
    brandName: "Northwind Digital",
    scansRun: 30,
    totalChanges: 3,
    uptimePercent: 99.9,
    avgResponseMs: 231,
    reportUrl: "https://mykavo.app/r/token123",
  };

  it("leads with the agency brand, not MyKavo", () => {
    const { subject, html } = clientReportDeliveryEmail(base);
    expect(subject).toBe("aurora-outdoor.com website report - Jul 3 – Aug 2, 2026");
    expect(html).toContain("Prepared by Northwind Digital");
    // Brand heads the shell; MyKavo only appears as the transparency line.
    expect(html).toContain(">Northwind Digital</span>");
    expect(html).toContain("Sent via MyKavo website monitoring");
    expect(html).toContain("View the full report");
    expect(html).toContain(base.reportUrl);
  });

  it("falls back to MyKavo voice without a brand", () => {
    const { html, text } = clientReportDeliveryEmail({ ...base, brandName: null });
    expect(html).toContain("Prepared by MyKavo");
    expect(text).toContain("Prepared by MyKavo");
  });

  it("renders all-clear and unknown stats gracefully", () => {
    const { html, text } = clientReportDeliveryEmail({
      ...base,
      totalChanges: 0,
      uptimePercent: null,
      avgResponseMs: null,
    });
    expect(html).toContain("None - all clear");
    expect(text).toContain("Uptime: -");
  });

  it("HTML-escapes the brand and website names", () => {
    const evil = clientReportDeliveryEmail({
      ...base,
      brandName: "<b>Evil</b> & Co",
      websiteName: "A & B",
    });
    expect(evil.html).not.toContain("<b>Evil</b>");
    expect(evil.html).toContain("&lt;b&gt;Evil&lt;/b&gt; &amp; Co");
    expect(evil.html).toContain("A &amp; B");
  });
});

describe("worker database outage emails", () => {
  const outage = {
    downFor: "42 minutes",
    reason: "Can't reach database server at `aws-0-us-east-1.pooler.supabase.com:5432`",
    repeat: false,
    dashboardUrl: "https://mykavo.app/dashboard/usage",
  };

  it("says plainly that nothing is running", () => {
    const mail = workerDbOutageEmail(outage);
    expect(mail.subject).toContain("cannot reach the database");
    expect(mail.text).toContain("Nothing is being scanned");
    expect(mail.text).toContain("42 minutes");
    // The reason the operator cannot infer this from the dashboard is the
    // single most useful sentence in the email.
    expect(mail.text).toContain("dashboard will look normal");
  });

  it("carries the underlying error so it can be acted on", () => {
    const mail = workerDbOutageEmail(outage);
    expect(mail.text).toContain("pooler.supabase.com:5432");
    expect(mail.html).toContain("pooler.supabase.com:5432");
  });

  it("distinguishes a reminder from a first report", () => {
    const first = workerDbOutageEmail(outage);
    const again = workerDbOutageEmail({ ...outage, repeat: true });
    expect(first.subject).not.toContain("STILL");
    expect(again.subject).toContain("STILL");
    expect(again.text).toContain("already reported");
  });

  it("escapes the error text rather than trusting it", () => {
    const mail = workerDbOutageEmail({ ...outage, reason: '<img src=x onerror="alert(1)">' });
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&lt;img");
  });

  it("reports recovery with the duration and what to do next", () => {
    const mail = workerDbRecoveryEmail({
      downFor: "2 hours",
      dashboardUrl: "https://mykavo.app/dashboard/usage",
    });
    expect(mail.subject).toContain("reconnected");
    expect(mail.subject).toContain("2 hours");
    // Scans killed mid-flight do not resume, and saying so saves the reader
    // wondering why the dashboard still shows failures.
    expect(mail.text).toContain("need running again");
  });
});

describe("welcomeEmail", () => {
  const data = {
    name: "Dakshesh Babu",
    addWebsiteUrl: "https://mykavo.app/dashboard/websites/new",
    alertsUrl: "https://mykavo.app/dashboard/notifications",
    docsUrl: "https://mykavo.app/docs",
  };

  it("says what it is for, in the subject", () => {
    const mail = welcomeEmail(data);
    expect(mail.subject).toBe("Welcome to MyKavo - start monitoring your website");
  });

  it("greets by first name only", () => {
    const mail = welcomeEmail(data);
    expect(mail.html).toContain("Welcome, Dakshesh");
    expect(mail.html).not.toContain("Dakshesh Babu");
  });

  /**
   * The name column holds whatever was stored, and rows predating the signup
   * name check can be empty. A greeting reading "Welcome, " is worse than no
   * name at all.
   */
  it("falls back to a nameless greeting rather than an empty one", () => {
    for (const name of ["", "   "]) {
      const mail = welcomeEmail({ ...data, name });
      expect(mail.subject).toBeTruthy();
      expect(mail.html).toContain("Welcome to MyKavo");
      expect(mail.html).not.toContain("Welcome, <");
      expect(mail.text.startsWith("Welcome to MyKavo")).toBe(true);
    }
  });

  /**
   * The point of the email. An account with no website is not a user yet, so
   * the single call to action is adding one.
   */
  it("leads with adding a website", () => {
    const mail = welcomeEmail(data);
    expect(mail.html).toContain(data.addWebsiteUrl);
    expect(mail.html).toContain("Add your first website");
    expect(mail.text).toContain(data.addWebsiteUrl);
  });

  it("teaches the loop, in order", () => {
    const { text } = welcomeEmail(data);
    const add = text.indexOf("Add a website");
    const baseline = text.indexOf("Approve the baseline");
    const told = text.indexOf("Get told when it changes");
    expect(add).toBeGreaterThan(-1);
    expect(add).toBeLessThan(baseline);
    expect(baseline).toBeLessThan(told);
  });

  /**
   * Deliberately NOT a feature list. Naming the audit, Search Console and the
   * rest here would recreate in the inbox exactly the several-products-at-once
   * problem the first-run work removed from the app (docs/FIRST_RUN.md).
   */
  it("does not open with a menu of every feature", () => {
    const { text } = welcomeEmail(data);
    for (const feature of ["Search Console", "Site Audit", "Analyser", "Lighthouse"]) {
      expect(text).not.toContain(feature);
    }
  });

  /**
   * New workspaces are opt-in for email alerts, which is the right default
   * and a silent trap: add a website, watch the baseline finish, never hear
   * anything, conclude the product does not work. This email is the one
   * message guaranteed to arrive before that happens, so it must say so.
   */
  it("warns that email alerts are off, and links to the switch", () => {
    const mail = welcomeEmail(data);
    expect(mail.text).toContain("Email alerts are off until you turn them on");
    expect(mail.text).toContain(data.alertsUrl);
    expect(mail.html).toContain(data.alertsUrl);
  });

  it("frames the default as a promise rather than a missing feature", () => {
    expect(welcomeEmail(data).text).toContain("we do not mail anyone who did not ask");
  });

  it("says why they are getting it", () => {
    expect(welcomeEmail(data).text).toContain("an account was created with this address");
  });

  it("escapes a name rather than trusting it", () => {
    const mail = welcomeEmail({ ...data, name: '<img src=x onerror="alert(1)">' });
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&lt;img");
  });

  it("has a plain-text part that is not HTML", () => {
    const mail = welcomeEmail(data);
    expect(mail.text).not.toContain("<");
    expect(mail.text.length).toBeGreaterThan(100);
  });
});

describe("appAccessApprovedEmail", () => {
  const data = {
    name: "Dakshesh Babu",
    downloadUrl: "https://mykavo.app/dashboard/app?download=1",
    email: "daksh@example.com",
  };

  it("says the app is ready, in the subject", () => {
    expect(appAccessApprovedEmail(data).subject).toBe(
      "Your MyKavo Android app is ready to download",
    );
  });

  it("leads with the download link", () => {
    const mail = appAccessApprovedEmail(data);
    expect(mail.html).toContain(data.downloadUrl);
    expect(mail.html).toContain("Download the Android app");
    expect(mail.text).toContain(data.downloadUrl);
  });

  /**
   * The failure this exists to prevent: access is granted to an ADDRESS, so
   * somebody who requested with a work address and signs in with a personal
   * one sees no download and concludes the approval never happened. The
   * address has to be in the email, next to the button.
   */
  it("names the address they must sign in with", () => {
    const mail = appAccessApprovedEmail(data);
    expect(mail.html).toContain("daksh@example.com");
    expect(mail.text).toContain("daksh@example.com");
    expect(mail.text).toMatch(/sign in with this address/i);
  });

  it("warns about the off-store install, so the Android prompt is expected", () => {
    expect(appAccessApprovedEmail(data).text).toMatch(/outside the Play Store/i);
  });

  it("greets by first name only, and copes with no name", () => {
    expect(appAccessApprovedEmail(data).html).toContain("Good news, Dakshesh");
    const nameless = appAccessApprovedEmail({ ...data, name: "  " });
    expect(nameless.html).toContain("Good news");
    expect(nameless.html).not.toContain("Good news, <");
  });

  it("escapes the name and the address rather than trusting them", () => {
    const mail = appAccessApprovedEmail({
      ...data,
      name: '<img src=x onerror="alert(1)">',
      email: '"><script>alert(1)</script>@x.com',
    });
    expect(mail.html).not.toContain("<img");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;img");
  });

  it("has a plain-text part that is not HTML", () => {
    expect(appAccessApprovedEmail(data).text).not.toContain("<");
  });
});
