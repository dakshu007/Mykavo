import { describe, expect, it } from "vitest";
import { auditReportEmail, auditUnavailableEmail } from "./templates";

const base = {
  host: "example.com",
  pagesCrawled: 48,
  healthScore: 72,
  checkCount: 98,
  errorCount: 3,
  warningCount: 9,
  noticeCount: 20,
  issues: [
    {
      title: "Page is noindex",
      severity: "ERROR" as const,
      explain: "Google is told not to index this page.",
      fix: "Remove the noindex robots tag.",
      count: 2,
      exampleUrl: "https://example.com/pricing?a=1&b=<x>",
    },
  ],
  hidden: { types: 14, errors: 1, warnings: 8, notices: 20 },
  fullReportUrl: "https://mykavo.app/signup?from=audit-email",
  proUrl: "https://mykavo.app/pricing",
  trialDays: 14,
  proAuditPages: 1500,
};

describe("auditReportEmail", () => {
  it("leads with the score, shows the issue and locks the rest behind signup", () => {
    const email = auditReportEmail(base);
    expect(email.subject).toBe("Your free site audit for example.com: 72/100");
    expect(email.html).toContain("Page is noindex");
    expect(email.html).toContain("14 more issue types in your full report");
    expect(email.html).toContain("See the full report free");
    expect(email.html).toContain("Try Pro free for 14 days.");
    expect(email.text).toContain("1 error, 8 warnings, 20 notices");
  });

  it("escapes URLs taken from the crawled site", () => {
    const email = auditReportEmail(base);
    expect(email.html).not.toContain("<x>");
    expect(email.html).toContain("&amp;b=&lt;x&gt;");
  });

  it("offers monitoring instead of a locked report when nothing is hidden", () => {
    const email = auditReportEmail({ ...base, hidden: { types: 0, errors: 0, warnings: 0, notices: 0 } });
    expect(email.html).toContain("Monitor this site free");
    expect(email.html).not.toContain("full report");
  });

  it("uses no em or en dashes in its copy", () => {
    for (const email of [auditReportEmail(base), auditUnavailableEmail({ host: "example.com", monitorUrl: "https://mykavo.app/signup" })]) {
      expect(email.html + email.text + email.subject).not.toMatch(/[–—]/);
    }
  });
});
