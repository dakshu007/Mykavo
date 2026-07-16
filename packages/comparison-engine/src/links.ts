/**
 * Broken internal link detection (spec §20). Consumes per-page link
 * observations — with the statuses the worker's link check recorded on
 * PageLink rows — from the baseline and the current scan, and emits ONE
 * grouped site-wide signal ("N internal links are broken"), never one event
 * per link per page.
 *
 * A link only counts as broken on a definite, visitor-affecting status:
 * unreachable (0), 404/410, or a 5xx. Unchecked links (null status — probe
 * capped out, timed out, or predates this feature) are never assumed broken.
 * Links already broken in the approved baseline don't re-fire — approving a
 * baseline that includes a known-broken link acknowledges it (spec §24).
 */

import type { ChangeSignal } from "@mykavo/severity-engine";

export interface LinkObservation {
  normalizedUrl: string;
  linkType: "INTERNAL" | "EXTERNAL";
  statusCode: number | null;
}

export interface PageLinkObservations {
  /** URL of the monitored page the links were extracted from. */
  pageUrl: string;
  links: LinkObservation[];
}

export interface BrokenLinkSample {
  url: string;
  /** Terminal HTTP status; 0 means unreachable (DNS/connection/TLS failure). */
  status: number;
  /** How many monitored pages link to this URL. */
  pages: number;
}

export type BrokenLinksSignal = Extract<ChangeSignal, { kind: "broken_links" }>;

/** Definite, visitor-affecting failures only — never 401/403/429 or unchecked. */
export function isBrokenLinkStatus(status: number | null): boolean {
  if (status === null) return false;
  return status === 0 || status === 404 || status === 410 || status >= 500;
}

/**
 * Diff link health between the approved baselines and the current scan.
 * Returns a single grouped signal, or null when nothing newly broke.
 *
 * `excludeUrls` should contain the monitored pages' own URLs — a monitored
 * page that breaks already raises an AVAILABILITY event; repeating it as a
 * broken link would double-report.
 */
export function compareBrokenLinks(
  baselinePages: PageLinkObservations[],
  currentPages: PageLinkObservations[],
  options: { excludeUrls?: ReadonlySet<string>; maxSamples?: number } = {},
): BrokenLinksSignal | null {
  const excludeUrls = options.excludeUrls ?? new Set<string>();
  const maxSamples = options.maxSamples ?? 50;

  // Aggregate the current scan: url → observed status + referencing pages.
  const current = new Map<string, { status: number | null; pages: Set<string> }>();
  for (const page of currentPages) {
    for (const link of page.links) {
      if (link.linkType !== "INTERNAL") continue;
      let entry = current.get(link.normalizedUrl);
      if (!entry) {
        entry = { status: null, pages: new Set() };
        current.set(link.normalizedUrl, entry);
      }
      entry.pages.add(page.pageUrl);
      if (entry.status === null) entry.status = link.statusCode;
    }
  }

  // Links already broken when the baseline was approved don't re-fire.
  const baselineBroken = new Set<string>();
  for (const page of baselinePages) {
    for (const link of page.links) {
      if (link.linkType === "INTERNAL" && isBrokenLinkStatus(link.statusCode)) {
        baselineBroken.add(link.normalizedUrl);
      }
    }
  }

  let totalChecked = 0;
  const broken: BrokenLinkSample[] = [];
  for (const [url, entry] of current) {
    if (entry.status !== null) totalChecked++;
    if (!isBrokenLinkStatus(entry.status)) continue;
    if (baselineBroken.has(url) || excludeUrls.has(url)) continue;
    broken.push({ url, status: entry.status as number, pages: entry.pages.size });
  }
  if (broken.length === 0) return null;

  broken.sort((a, b) => b.pages - a.pages || a.url.localeCompare(b.url));
  return {
    kind: "broken_links",
    count: broken.length,
    totalChecked,
    samples: broken.slice(0, maxSamples),
  };
}
