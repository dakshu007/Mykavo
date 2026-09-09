/**
 * Choosing the ONE finding to lead with when talking to a site's owner.
 *
 * Separate from the audit itself because it answers a different question.
 * `runSiteAudit` asks "what is wrong with this site?" - exhaustively, ranked
 * by severity. This asks "what would make a busy person read the second
 * sentence?", which is a matter of drama and specificity rather than counts.
 * "Your checkout page is invisible to Google" earns four seconds of attention.
 * "43 images are missing alt text" does not, however many there are.
 *
 * Pure, so the judgement can be tested without crawling anything.
 */

import { AUDIT_CHECKS, SEVERITY_ORDER } from "./registry";
import type { AuditResult, AuditIssueGroup } from "./crawl";

/**
 * Checks worth LEADING with, best first. Anything not listed can still be
 * chosen, but only once nothing here matches.
 */
export const LEAD_WITH: readonly string[] = [
  // Invisible or broken - unambiguous, urgent, nobody argues with it.
  "noindex-page",
  "http-5xx",
  "redirect-loop",
  "http-4xx",
  "soft-404",
  "sec-insecure-form",
  "sec-mixed-content",
  // Visibly damaging to search presence.
  "canonical-broken",
  "canonical-redirect",
  "title-missing",
  "title-empty",
  "link-internal-broken",
  "img-broken",
  "sitemap-broken-url",
  "sitemap-noindex-url",
  "desc-missing",
  "h1-missing",
  "schema-invalid-json",
  "mobile-no-viewport",
  "sec-http-page",
];

/**
 * Never the opening line. `http-fetch-error` describes OUR request failing -
 * a timeout, a WAF, a geo-block - and says nothing about the recipient's site.
 */
export const NEVER_LEAD: ReadonlySet<string> = new Set(["http-fetch-error"]);

export interface LeadFinding {
  group: AuditIssueGroup;
  checkId: string;
  title: string;
  explain: string;
  fix: string;
  severity: string;
  /** A real URL from the site, so a message cannot read as a mail merge. */
  exampleUrl: string | null;
}

/**
 * Whether the crawl learned enough to be worth acting on.
 *
 * A crawl that reached one page and found an HTTP error there has almost
 * certainly been blocked rather than discovered a dead site: a genuinely dead
 * homepage is rare, a bot-hostile firewall is not. Both look identical from
 * the outside, so the honest answer is to say nothing rather than send a
 * confident accusation that turns out to be about our own request.
 */
export function auditIsTrustworthy(result: AuditResult): boolean {
  if (result.stoppedReason === "blocked") return false;
  if (result.pagesCrawled === 0) return false;
  if (result.pagesCrawled <= 1 && result.errorCount > 0) return false;
  return true;
}

/** Curated lead list first, then severity, then how widespread. */
export function pickLeadFinding(result: AuditResult): LeadFinding | null {
  const scored = result.issues
    .map((group) => {
      const def = AUDIT_CHECKS[group.checkId];
      if (!def || NEVER_LEAD.has(group.checkId)) return null;
      const leadIndex = LEAD_WITH.indexOf(group.checkId);
      return {
        group,
        def,
        // Lower sorts first.
        rank: [
          leadIndex === -1 ? 1 : 0,
          leadIndex === -1 ? 0 : leadIndex,
          -SEVERITY_ORDER[def.severity],
          -group.count,
        ],
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (scored.length === 0) return null;

  scored.sort((a, b) => {
    for (let i = 0; i < a.rank.length; i++) {
      if (a.rank[i] !== b.rank[i]) return a.rank[i] - b.rank[i];
    }
    return 0;
  });

  const best = scored[0];
  return {
    group: best.group,
    checkId: best.group.checkId,
    title: best.def.title,
    explain: best.def.explain,
    fix: best.def.fix,
    severity: best.def.severity,
    exampleUrl: best.group.urls[0]?.url ?? null,
  };
}
