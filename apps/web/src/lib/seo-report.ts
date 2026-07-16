/**
 * SEO health report derived from the latest completed scan's PageSnapshot
 * rows. Pure module — no Prisma imports — so every check is unit-testable.
 *
 * Length guidance (title 50–60, description 120–160) is shared with the free
 * Meta Tag Checker via `@/lib/tools/meta-tags`; the thresholds live there.
 *
 * Broken-link checks read the statuses the worker's per-scan link check
 * records on PageLink rows (apps/worker/src/check-links.ts). Links the check
 * never probed (null status) are silently skipped — never assumed broken.
 *
 * Health score formula (documented, clamped to 0–100):
 *   score = 100 − 25 × critical − 5 × warning − 1 × info
 * Every issue deducts individually — e.g. two noindex pages cost 50 points.
 */

import { isBrokenLinkStatus } from "@mykavo/comparison-engine";
import {
  evaluateCanonical,
  evaluateH1,
  evaluateMetaDescription,
  evaluateRobotsMeta,
  evaluateTitle,
} from "@/lib/tools/meta-tags";

export type SeoSeverity = "critical" | "warning" | "info";

export type SeoCheckId =
  | "page-error"
  | "noindex"
  | "broken-link"
  | "missing-title"
  | "title-length"
  | "duplicate-title"
  | "missing-description"
  | "description-length"
  | "missing-h1"
  | "multiple-h1"
  | "missing-canonical";

/** The PageSnapshot columns the report reads — matches the Prisma select. */
export interface SeoSnapshotInput {
  monitoredPageId: string;
  url: string;
  httpStatus: number | null;
  errorCode: string | null;
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  /** Prisma Json column — expected string[], but never trusted to be one. */
  h1Values: unknown;
  /**
   * Internal PageLink rows for the page. `statusCode` comes from the worker's
   * per-scan link check; null means the link was never probed.
   */
  links?: Array<{ normalizedUrl: string; statusCode: number | null }>;
}

export interface SeoIssue {
  severity: SeoSeverity;
  check: SeoCheckId;
  pageUrl: string;
  monitoredPageId: string;
  message: string;
  /** The offending raw value (title text, robots meta, …) when there is one. */
  value?: string;
}

export interface SeoReport {
  issues: SeoIssue[];
  pagesAnalyzed: number;
  pagesWithIssues: number;
  counts: Record<SeoSeverity, number>;
  /** 0–100; see the formula at the top of this file. */
  score: number;
}

/** Per-issue score deductions. */
export const SCORE_WEIGHTS: Record<SeoSeverity, number> = {
  critical: 25,
  warning: 5,
  info: 1,
};

const CHECK_SEVERITY: Record<SeoCheckId, SeoSeverity> = {
  "page-error": "critical",
  noindex: "critical",
  "broken-link": "warning",
  "missing-title": "warning",
  "title-length": "warning",
  "duplicate-title": "warning",
  "missing-description": "warning",
  "description-length": "warning",
  "missing-h1": "warning",
  "multiple-h1": "info",
  "missing-canonical": "info",
};

/** Display metadata per check: card title + one-liner on why it matters. */
export const SEO_CHECK_META: Record<SeoCheckId, { title: string; why: string }> = {
  "page-error": {
    title: "Pages returning errors",
    why: "Pages that fail to load are invisible to visitors and get dropped from search results.",
  },
  noindex: {
    title: "Pages blocked from indexing",
    why: "A noindex robots meta removes the page from search results entirely — make sure it's intentional.",
  },
  "broken-link": {
    title: "Broken internal links",
    why: "Links that lead to errors dead-end visitors and waste crawl budget — search engines read them as a poorly maintained site.",
  },
  "missing-title": {
    title: "Missing title tags",
    why: "The title tag is the headline searchers click; pages without one rank and convert poorly.",
  },
  "title-length": {
    title: "Title length outside 50–60 characters",
    why: "Short titles waste the space searchers see; long ones get truncated in results.",
  },
  "duplicate-title": {
    title: "Duplicate titles across pages",
    why: "Pages sharing a title compete with each other and look interchangeable in search results.",
  },
  "missing-description": {
    title: "Missing meta descriptions",
    why: "Without a description, search engines improvise a snippet from page content.",
  },
  "description-length": {
    title: "Description length outside 120–160 characters",
    why: "The description is your pitch under the headline — too short undersells, too long gets cut off.",
  },
  "missing-h1": {
    title: "Missing H1 headings",
    why: "Every page should have one clear main heading so readers and crawlers know what it's about.",
  },
  "multiple-h1": {
    title: "Multiple H1 headings",
    why: "More than one H1 dilutes the page's main topic; most pages should have exactly one.",
  },
  "missing-canonical": {
    title: "Missing canonical URLs",
    why: "A canonical URL protects against duplicate-content issues when a page is reachable at several URLs.",
  },
};

/** Group ordering for the report page: most serious checks first. */
export const SEO_CHECK_ORDER: readonly SeoCheckId[] = [
  "page-error",
  "noindex",
  "broken-link",
  "missing-title",
  "title-length",
  "duplicate-title",
  "missing-description",
  "description-length",
  "missing-h1",
  "multiple-h1",
  "missing-canonical",
];

/**
 * Defensive parse of the h1Values Json column: only a string array is
 * trusted; anything else (null, object, mixed array) yields no H1 values.
 */
export function parseH1Values(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((v): v is string => typeof v === "string");
}

function issue(
  check: SeoCheckId,
  snapshot: SeoSnapshotInput,
  message: string,
  value?: string,
): SeoIssue {
  return {
    severity: CHECK_SEVERITY[check],
    check,
    pageUrl: snapshot.url,
    monitoredPageId: snapshot.monitoredPageId,
    message,
    ...(value !== undefined ? { value } : {}),
  };
}

/**
 * A page counts as errored when the scan recorded an error code, an HTTP
 * status ≥ 400, or no HTTP response at all. Errored pages are excluded from
 * content checks (their extracted fields are absent or meaningless) and
 * flagged with a single critical page-error issue instead.
 */
function pageErrorMessage(snapshot: SeoSnapshotInput): string | null {
  if (snapshot.httpStatus !== null && snapshot.httpStatus >= 400) {
    return `Page returned HTTP ${snapshot.httpStatus}.`;
  }
  if (snapshot.errorCode !== null) {
    return `Page could not be scanned (${snapshot.errorCode}).`;
  }
  if (snapshot.httpStatus === null) {
    return "Page recorded no HTTP response.";
  }
  return null;
}

/** Run every content check against one successfully scanned page. */
function contentIssues(snapshot: SeoSnapshotInput): SeoIssue[] {
  const issues: SeoIssue[] = [];

  const robots = evaluateRobotsMeta(snapshot.robotsMeta);
  if (robots.status === "fail") {
    // Only noindex makes evaluateRobotsMeta fail.
    issues.push(issue("noindex", snapshot, robots.detail, snapshot.robotsMeta ?? undefined));
  }

  const title = evaluateTitle(snapshot.title);
  if (snapshot.title === null || snapshot.title.trim() === "") {
    issues.push(issue("missing-title", snapshot, evaluateTitle(null).detail));
  } else if (title.status === "warn") {
    issues.push(issue("title-length", snapshot, title.detail, snapshot.title));
  }

  const description = evaluateMetaDescription(snapshot.metaDescription);
  if (snapshot.metaDescription === null || snapshot.metaDescription.trim() === "") {
    issues.push(issue("missing-description", snapshot, evaluateMetaDescription(null).detail));
  } else if (description.status === "warn") {
    issues.push(
      issue("description-length", snapshot, description.detail, snapshot.metaDescription),
    );
  }

  const h1Values = parseH1Values(snapshot.h1Values);
  const h1 = evaluateH1(h1Values.length, h1Values);
  if (h1.status === "fail") {
    issues.push(issue("missing-h1", snapshot, h1.detail));
  } else if (h1.status === "warn") {
    issues.push(issue("multiple-h1", snapshot, h1.detail, h1Values.join(" · ")));
  }

  const canonical = evaluateCanonical(snapshot.canonicalUrl);
  if (canonical.status === "warn") {
    issues.push(issue("missing-canonical", snapshot, canonical.detail));
  }

  return issues;
}

/**
 * One issue per unique broken internal link (deduped across pages — the same
 * dead footer link on 20 pages is one problem, not 20). Attached to the first
 * page that references it; the message carries the page reach.
 */
function brokenLinkIssues(healthy: SeoSnapshotInput[]): SeoIssue[] {
  const seen = new Map<string, { snapshot: SeoSnapshotInput; status: number; pages: number }>();
  for (const snapshot of healthy) {
    const counted = new Set<string>();
    for (const link of snapshot.links ?? []) {
      if (!isBrokenLinkStatus(link.statusCode)) continue;
      if (counted.has(link.normalizedUrl)) continue; // same link twice on one page
      counted.add(link.normalizedUrl);
      const entry = seen.get(link.normalizedUrl);
      if (entry) entry.pages += 1;
      else {
        seen.set(link.normalizedUrl, {
          snapshot,
          status: link.statusCode as number,
          pages: 1,
        });
      }
    }
  }
  const issues: SeoIssue[] = [];
  for (const [url, { snapshot, status, pages }] of seen) {
    const label = status === 0 ? "is unreachable" : `returns HTTP ${status}`;
    issues.push(
      issue(
        "broken-link",
        snapshot,
        `Links to a page that ${label}${pages > 1 ? ` (linked from ${pages} pages)` : ""}.`,
        url,
      ),
    );
  }
  return issues;
}

/** Duplicate titles among healthy pages, grouped by exact trimmed match. */
function duplicateTitleIssues(healthy: SeoSnapshotInput[]): SeoIssue[] {
  const byTitle = new Map<string, SeoSnapshotInput[]>();
  for (const snapshot of healthy) {
    const title = snapshot.title?.trim();
    if (!title) continue;
    const group = byTitle.get(title);
    if (group) group.push(snapshot);
    else byTitle.set(title, [snapshot]);
  }
  const issues: SeoIssue[] = [];
  for (const [title, group] of byTitle) {
    if (group.length < 2) continue;
    for (const snapshot of group) {
      issues.push(
        issue(
          "duplicate-title",
          snapshot,
          `Shares its title with ${group.length - 1} other monitored page${group.length - 1 === 1 ? "" : "s"}.`,
          title,
        ),
      );
    }
  }
  return issues;
}

/**
 * Health score: 100 minus per-issue deductions (critical 25, warning 5,
 * info 1), clamped to 0–100.
 */
export function calculateSeoScore(counts: Record<SeoSeverity, number>): number {
  const deduction =
    counts.critical * SCORE_WEIGHTS.critical +
    counts.warning * SCORE_WEIGHTS.warning +
    counts.info * SCORE_WEIGHTS.info;
  return Math.min(100, Math.max(0, 100 - deduction));
}

export interface SeoScoreBand {
  label: "Healthy" | "Needs attention" | "At risk";
  tone: "success" | "warning" | "critical";
}

/** Colour band for the big score number — always paired with a text label. */
export function seoScoreBand(score: number): SeoScoreBand {
  if (score >= 90) return { label: "Healthy", tone: "success" };
  if (score >= 70) return { label: "Needs attention", tone: "warning" };
  return { label: "At risk", tone: "critical" };
}

/** Build the full report from the latest scan's snapshot rows. */
export function buildSeoReport(snapshots: SeoSnapshotInput[]): SeoReport {
  const issues: SeoIssue[] = [];
  const healthy: SeoSnapshotInput[] = [];

  for (const snapshot of snapshots) {
    const errorMessage = pageErrorMessage(snapshot);
    if (errorMessage !== null) {
      issues.push(issue("page-error", snapshot, errorMessage));
    } else {
      healthy.push(snapshot);
      issues.push(...contentIssues(snapshot));
    }
  }
  issues.push(...duplicateTitleIssues(healthy));
  issues.push(...brokenLinkIssues(healthy));

  const order = new Map(SEO_CHECK_ORDER.map((check, index) => [check, index]));
  issues.sort(
    (a, b) =>
      (order.get(a.check) ?? 0) - (order.get(b.check) ?? 0) ||
      a.pageUrl.localeCompare(b.pageUrl),
  );

  const counts: Record<SeoSeverity, number> = { critical: 0, warning: 0, info: 0 };
  for (const found of issues) counts[found.severity] += 1;

  return {
    issues,
    pagesAnalyzed: snapshots.length,
    pagesWithIssues: new Set(issues.map((i) => i.pageUrl)).size,
    counts,
    score: calculateSeoScore(counts),
  };
}

/** Issues grouped by check id, preserving SEO_CHECK_ORDER. */
export function groupIssuesByCheck(
  issues: SeoIssue[],
): Array<{ check: SeoCheckId; issues: SeoIssue[] }> {
  const groups = new Map<SeoCheckId, SeoIssue[]>();
  for (const found of issues) {
    const group = groups.get(found.check);
    if (group) group.push(found);
    else groups.set(found.check, [found]);
  }
  return SEO_CHECK_ORDER.filter((check) => groups.has(check)).map((check) => ({
    check,
    issues: groups.get(check) as SeoIssue[],
  }));
}
