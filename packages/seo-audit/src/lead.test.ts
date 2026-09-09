import { describe, expect, it } from "vitest";
import { pickLeadFinding, auditIsTrustworthy, LEAD_WITH } from "./lead";
import { AUDIT_CHECKS } from "./registry";
import type { AuditResult, AuditIssueGroup } from "./crawl";

function group(checkId: string, count = 1, url = `https://x.test/${checkId}`): AuditIssueGroup {
  return { checkId, count, urls: [{ url }] };
}

function result(partial: Partial<AuditResult> = {}): AuditResult {
  return {
    pagesCrawled: 25,
    urlsDiscovered: 40,
    healthScore: 60,
    errorCount: 2,
    warningCount: 5,
    noticeCount: 3,
    pagesWithErrors: 2,
    issues: [],
    stoppedReason: "completed",
    ...partial,
  };
}

describe("LEAD_WITH", () => {
  // A typo here would silently demote the best opener to the fallback path.
  it("only names checks that actually exist in the registry", () => {
    for (const id of LEAD_WITH) {
      expect(AUDIT_CHECKS[id], `${id} is not a real check`).toBeDefined();
    }
  });
});

describe("auditIsTrustworthy", () => {
  // The failure that prompted this: a blocked crawler sees one page returning
  // an HTTP error and it is indistinguishable from a genuinely dead site.
  // Emailing a stranger that their homepage is a 404 when they merely blocked
  // an unknown bot is the worst possible first impression.
  it("rejects a one-page crawl that only found an error", () => {
    expect(auditIsTrustworthy(result({ pagesCrawled: 1, errorCount: 1 }))).toBe(false);
  });

  it("rejects a crawl robots.txt blocked", () => {
    expect(auditIsTrustworthy(result({ stoppedReason: "blocked" }))).toBe(false);
  });

  it("rejects a crawl that reached nothing at all", () => {
    expect(auditIsTrustworthy(result({ pagesCrawled: 0 }))).toBe(false);
  });

  // A one-page site that crawled cleanly is small, not broken.
  it("accepts a single page that returned no errors", () => {
    expect(auditIsTrustworthy(result({ pagesCrawled: 1, errorCount: 0 }))).toBe(true);
  });

  it("accepts a normal crawl", () => {
    expect(auditIsTrustworthy(result())).toBe(true);
  });

  it("accepts a crawl stopped by its own page limit", () => {
    expect(auditIsTrustworthy(result({ stoppedReason: "page-limit" }))).toBe(true);
  });
});

describe("pickLeadFinding", () => {
  it("returns nothing for a clean site rather than inventing a problem", () => {
    expect(pickLeadFinding(result({ issues: [] }))).toBeNull();
  });

  // Drama beats volume. This is the whole point of the curated list.
  it("prefers one invisible page over hundreds of missing alt tags", () => {
    const picked = pickLeadFinding(
      result({ issues: [group("img-missing-alt", 240), group("noindex-page", 1)] }),
    );
    expect(picked?.checkId).toBe("noindex-page");
  });

  it("follows the curated order between two strong findings", () => {
    const picked = pickLeadFinding(
      result({ issues: [group("title-missing", 9), group("http-5xx", 1)] }),
    );
    expect(picked?.checkId).toBe("http-5xx");
  });

  // Our own fetch failing says nothing about their site.
  it("never leads with a fetch error, even when it is all there is", () => {
    expect(pickLeadFinding(result({ issues: [group("http-fetch-error", 5)] }))).toBeNull();
  });

  it("ignores a fetch error in favour of a real finding", () => {
    const picked = pickLeadFinding(
      result({ issues: [group("http-fetch-error", 9), group("h1-missing", 1)] }),
    );
    expect(picked?.checkId).toBe("h1-missing");
  });

  it("falls back to severity when nothing is on the curated list", () => {
    const picked = pickLeadFinding(
      result({ issues: [group("url-underscore", 30), group("content-duplicate", 2)] }),
    );
    // content-duplicate is the more severe of the two in the registry.
    expect(picked?.checkId).toBe("content-duplicate");
  });

  it("carries a real URL through, so the message cannot read as a mail merge", () => {
    const picked = pickLeadFinding(
      result({ issues: [group("noindex-page", 1, "https://acme.test/pricing")] }),
    );
    expect(picked?.exampleUrl).toBe("https://acme.test/pricing");
  });

  it("carries the registry's explanation and fix, not invented copy", () => {
    const picked = pickLeadFinding(result({ issues: [group("noindex-page")] }));
    expect(picked?.explain).toBe(AUDIT_CHECKS["noindex-page"].explain);
    expect(picked?.fix).toBe(AUDIT_CHECKS["noindex-page"].fix);
  });
});
