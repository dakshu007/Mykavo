/**
 * Striking distance keywords: searches where a site already ranks just off
 * the top of Google (positions 8 to 20) with real impressions, so a focused
 * improvement can move it onto, or up, page one.
 *
 * Pure and deterministic: the input is Search Console's own [query, page]
 * rows for one 28-day window, so impressions, clicks, CTR and position are
 * real. The only estimate is the extra clicks from reaching the top 5, which
 * uses a fixed, published CTR-by-position curve and is labelled as an
 * estimate wherever it is shown. No search volume is ever invented.
 */

export interface QueryPageRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  /** 0..1 */
  ctr: number;
  /** Average position, 1 = top. */
  position: number;
}

export type StrikingAction = "improve_page" | "supporting_post";

export interface StrikingOpportunity {
  query: string;
  /** The page Google ranks highest for this query (by impressions). */
  page: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  /** Rough extra clicks a month at position 4 (estimate, never shown as fact). */
  estimatedExtraClicks: number;
  action: StrikingAction;
  /** Other pages of the same site that also rank for this query. */
  competingPages: string[];
  /** Plain-English recommendation. */
  reason: string;
}

export interface StrikingOptions {
  minPosition?: number;
  maxPosition?: number;
  /** Over the 28-day window. Small sites have small numbers, so keep this low. */
  minImpressions?: number;
  /** Lower-case words that mark a branded search (the site's own name). */
  brandTerms?: string[];
}

export const STRIKING_DEFAULTS = {
  minPosition: 8,
  maxPosition: 20,
  minImpressions: 20,
} as const;

/**
 * Typical organic CTR by position, rounded from public click-through studies.
 * Used only to estimate upside; the page labels it as an estimate.
 */
const CTR_BY_POSITION = [0.28, 0.15, 0.11, 0.08, 0.07, 0.05, 0.04, 0.03, 0.03, 0.025];
const TARGET_POSITION = 4;

export function typicalCtr(position: number): number {
  const index = Math.min(Math.max(Math.round(position), 1), CTR_BY_POSITION.length) - 1;
  return CTR_BY_POSITION[index] ?? 0.02;
}

/**
 * The words that make a search "branded" for a site: the main label of its
 * hostname ("mykavo" for www.mykavo.app). Short labels are skipped because
 * they match too many ordinary words.
 */
export function brandTermsFor(siteUrl: string): string[] {
  try {
    const host = new URL(siteUrl).hostname.toLowerCase().replace(/^www\./, "");
    const label = host.split(".")[0] ?? "";
    return label.length >= 4 ? [label] : [];
  } catch {
    return [];
  }
}

function isBranded(query: string, brandTerms: string[]): boolean {
  if (brandTerms.length === 0) return false;
  const squashed = query.toLowerCase().replace(/[^a-z0-9]/g, "");
  return brandTerms.some((term) => term && squashed.includes(term.replace(/[^a-z0-9]/g, "")));
}

function reasonFor(query: string, position: number, action: StrikingAction, competing: number): string {
  const rounded = Math.round(position);
  const where =
    rounded <= 10
      ? `You're already on page one for "${query}", near the bottom (position ${rounded}).`
      : `You're on page two for "${query}" (position ${rounded}).`;
  const what =
    action === "improve_page"
      ? "Strengthening this page, with a clearer title and a section that answers the search directly, could move it into the top five."
      : "A focused post on this topic, linking to this page, gives you the best chance of reaching page one.";
  const clash =
    competing > 0
      ? ` ${competing === 1 ? "Another of your pages also ranks" : `${competing} other pages also rank`} for this, so build on one page instead of splitting it.`
      : "";
  return `${where} ${what}${clash}`;
}

/**
 * Finds the opportunities and ranks them, biggest estimated upside first.
 * Each query appears once, against the page Google shows most for it.
 */
export function findStrikingDistance(rows: QueryPageRow[], options: StrikingOptions = {}): StrikingOpportunity[] {
  const minPosition = options.minPosition ?? STRIKING_DEFAULTS.minPosition;
  const maxPosition = options.maxPosition ?? STRIKING_DEFAULTS.maxPosition;
  const minImpressions = options.minImpressions ?? STRIKING_DEFAULTS.minImpressions;
  const brandTerms = (options.brandTerms ?? []).map((t) => t.toLowerCase());

  const byQuery = new Map<string, QueryPageRow[]>();
  for (const row of rows) {
    const query = row.query.trim().toLowerCase();
    if (!query || !row.page) continue;
    const list = byQuery.get(query) ?? [];
    list.push({ ...row, query });
    byQuery.set(query, list);
  }

  const out: StrikingOpportunity[] = [];
  for (const [query, pages] of byQuery) {
    if (isBranded(query, brandTerms)) continue;
    const ranked = [...pages].sort((a, b) => b.impressions - a.impressions || a.position - b.position);
    const main = ranked[0];
    if (!main) continue;
    // Positions are averages, so 7.6 shows as "8" in Search Console.
    const position = main.position;
    if (position < minPosition - 0.5 || position >= maxPosition + 0.5) continue;
    if (main.impressions < minImpressions) continue;

    const competingPages = ranked.slice(1).filter((p) => p.position <= 30).map((p) => p.page);
    const action: StrikingAction = position < 12.5 ? "improve_page" : "supporting_post";
    const estimatedExtraClicks = Math.max(
      0,
      Math.round(main.impressions * (typicalCtr(TARGET_POSITION) - main.ctr)),
    );

    out.push({
      query,
      page: main.page,
      position: Math.round(position * 10) / 10,
      impressions: main.impressions,
      clicks: main.clicks,
      ctr: main.ctr,
      estimatedExtraClicks,
      action,
      competingPages,
      reason: reasonFor(query, position, action, competingPages.length),
    });
  }

  return out.sort(
    (a, b) =>
      b.estimatedExtraClicks - a.estimatedExtraClicks ||
      b.impressions - a.impressions ||
      a.position - b.position ||
      a.query.localeCompare(b.query),
  );
}
