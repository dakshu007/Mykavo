import { describe, expect, it } from "vitest";
import { summarizeAuditReport } from "./report";
import type { AuditIssueGroup, AuditResult } from "./crawl";

function group(checkId: string, count = 1): AuditIssueGroup {
  return { checkId, count, urls: [{ url: `https://x.test/${checkId}` }] };
}

function result(issues: AuditIssueGroup[], partial: Partial<AuditResult> = {}): AuditResult {
  return {
    pagesCrawled: 25,
    urlsDiscovered: 40,
    healthScore: 60,
    errorCount: 2,
    warningCount: 5,
    noticeCount: 3,
    pagesWithErrors: 2,
    issues,
    stoppedReason: "completed",
    ...partial,
  };
}

describe("summarizeAuditReport", () => {
  it("shows the most damaging issues first and counts the rest by severity", () => {
    const report = summarizeAuditReport(
      result([
        group("crawl-depth", 9), // NOTICE
        group("desc-missing", 12), // on the lead list
        group("noindex-page", 2), // top of the lead list
        group("http-redirect", 4), // NOTICE
        group("h1-missing", 3), // on the lead list, after desc-missing
      ]),
    );
    expect(report.trustworthy).toBe(true);
    expect(report.shown.map((i) => i.checkId)).toEqual(["noindex-page", "desc-missing", "h1-missing"]);
    expect(report.shown[0]).toMatchObject({ count: 2, exampleUrl: "https://x.test/noindex-page" });
    expect(report.hidden).toEqual({ types: 2, problems: { ERROR: 0, WARNING: 0, NOTICE: 13 } });
  });

  it("never reports our own failed requests as the site's problem", () => {
    const report = summarizeAuditReport(result([group("http-fetch-error", 30), group("desc-missing", 1)]));
    expect(report.shown.map((i) => i.checkId)).toEqual(["desc-missing"]);
    expect(report.hidden.types).toBe(0);
  });

  it("flags a blocked crawl as untrustworthy", () => {
    expect(summarizeAuditReport(result([], { stoppedReason: "blocked" })).trustworthy).toBe(false);
  });
});
