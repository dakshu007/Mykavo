/**
 * Pure data prep for the Lighthouse score-trend sparkline.
 *
 * Takes the raw audit list (any order, any status), groups COMPLETED audits
 * by audited URL, and produces an oldest → newest series for one URL plus
 * latest-vs-previous deltas. No React, no DOM - unit-testable in isolation.
 */

export type TrendScoreKey =
  | "performanceScore"
  | "accessibilityScore"
  | "bestPracticesScore"
  | "seoScore";

export const TREND_CATEGORIES: readonly { key: TrendScoreKey; label: string }[] = [
  { key: "performanceScore", label: "Performance" },
  { key: "accessibilityScore", label: "Accessibility" },
  { key: "bestPracticesScore", label: "Best Practices" },
  { key: "seoScore", label: "SEO" },
];

/** Structural subset of the panel's AuditView - anything with these fields works. */
export interface TrendAuditInput {
  status: string;
  url: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
}

export interface TrendPoint {
  createdAt: string;
  scores: Record<TrendScoreKey, number | null>;
}

export interface TrendCategory {
  key: TrendScoreKey;
  label: string;
  /** Score of the newest audit. */
  latest: number | null;
  /** Score of the second-newest audit. */
  previous: number | null;
  /** latest − previous; null when either side is missing. */
  delta: number | null;
  /** Score of the oldest audit (for the accessible summary). */
  first: number | null;
}

export interface AuditTrend {
  url: string;
  /** Oldest → newest. Always at least 2 points. */
  points: TrendPoint[];
  /** In TREND_CATEGORIES order. */
  categories: TrendCategory[];
  /** createdAt of the second-newest audit - the "since" of the delta line. */
  previousAt: string;
  /** createdAt of the oldest audit - the "since" of the trend summary. */
  firstAt: string;
}

function toPoint(a: TrendAuditInput): TrendPoint {
  return {
    createdAt: a.createdAt,
    scores: {
      performanceScore: a.performanceScore,
      accessibilityScore: a.accessibilityScore,
      bestPracticesScore: a.bestPracticesScore,
      seoScore: a.seoScore,
    },
  };
}

/**
 * Build the trend series, or null when there is nothing worth charting.
 *
 * URL choice: the `preferredUrl` group (the page selected in the picker) when
 * it has at least 2 completed audits; otherwise the URL of the most recent
 * completed audit, again only if that group has at least 2. Fewer than 2
 * completed audits for the chosen URL → null (no empty-state noise).
 */
export function buildAuditTrend(
  audits: readonly TrendAuditInput[],
  preferredUrl?: string | null,
): AuditTrend | null {
  const completed = audits.filter((a) => a.status === "COMPLETED");
  if (completed.length < 2) return null;

  const groups = new Map<string, TrendAuditInput[]>();
  for (const audit of completed) {
    const group = groups.get(audit.url);
    if (group) group.push(audit);
    else groups.set(audit.url, [audit]);
  }

  let chosen: TrendAuditInput[] | undefined;
  if (preferredUrl != null) {
    const preferred = groups.get(preferredUrl);
    if (preferred && preferred.length >= 2) chosen = preferred;
  }
  if (!chosen) {
    const mostRecent = completed.reduce((newest, a) =>
      Date.parse(a.createdAt) > Date.parse(newest.createdAt) ? a : newest,
    );
    const group = groups.get(mostRecent.url);
    if (group && group.length >= 2) chosen = group;
  }
  if (!chosen) return null;

  const points = chosen
    .slice()
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map(toPoint);

  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const first = points[0];

  const categories: TrendCategory[] = TREND_CATEGORIES.map(({ key, label }) => {
    const latestScore = latest.scores[key];
    const previousScore = previous.scores[key];
    return {
      key,
      label,
      latest: latestScore,
      previous: previousScore,
      delta:
        latestScore !== null && previousScore !== null
          ? latestScore - previousScore
          : null,
      first: first.scores[key],
    };
  });

  return {
    url: chosen[0].url,
    points,
    categories,
    previousAt: previous.createdAt,
    firstAt: first.createdAt,
  };
}

/** "+14", "−3" (U+2212 minus), or "0" - the sign is always in the text. */
export function formatSignedDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${-delta}`;
  return "0";
}

/** "Jul 9" - short date used by the delta line and the accessible summary. */
export function formatTrendDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Accessible one-sentence summary of the whole chart, e.g.
 * "Performance 60 → 74, Accessibility 90 → 90 across 5 audits since Jul 9."
 * Categories with no data on either end are omitted.
 */
export function auditTrendSummary(trend: AuditTrend): string {
  const parts = trend.categories
    .filter((c) => c.first !== null || c.latest !== null)
    .map((c) => `${c.label} ${c.first ?? "-"} → ${c.latest ?? "-"}`);
  const movements = parts.length > 0 ? parts.join(", ") : "No scores recorded";
  return `${movements} across ${trend.points.length} audits since ${formatTrendDate(trend.firstAt)}.`;
}
