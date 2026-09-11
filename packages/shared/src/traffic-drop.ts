/**
 * Correlating a search-traffic drop with what changed on the page.
 *
 * Search Console tells you traffic fell. So does every rank tracker and every
 * analytics suite. None of them tell you WHAT YOU DID - because none of them
 * hold a record of how the page changed. MyKavo does, so it can close the
 * loop that everybody else leaves open:
 *
 *   /pricing lost 38% of its clicks from Aug 12.
 *   On Aug 10 the H1 changed and the canonical tag was removed.
 *
 * Pure on purpose. Every judgement here - what counts as a drop, when it
 * started, which changes are plausible suspects, and crucially when to admit
 * there is no explanation - is testable without a database or the network.
 */

/** One day of Search Console data for a single page. */
export interface PageDailyPoint {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  clicks: number;
  impressions: number;
  position: number;
}

/** A change MyKavo detected on that page. */
export interface PageChange {
  id: string;
  detectedAt: Date;
  category: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
}

export interface DropSuspect extends PageChange {
  /** How many days before the drop started. 0 = the same day. */
  daysBefore: number;
}

/**
 * How much we are willing to claim.
 *
 * `unexplained` is the important one. If traffic fell and nothing changed on
 * the page, the honest answer is to say so - a Google update, seasonality or
 * a competitor are all likelier than an INFO-level alt-text tweak. Pinning the
 * blame on whatever happens to be nearest would be worse than useless: the
 * user would go and "fix" something that was never broken.
 */
export type DropConfidence = "strong" | "possible" | "unexplained";

export interface TrafficDrop {
  page: string;
  /** The first day the decline is visible. */
  onsetDate: string;
  clicksBefore: number;
  clicksAfter: number;
  /** Whole-number percentage, e.g. 38 for a 38% fall. */
  dropPercent: number;
  positionBefore: number;
  positionAfter: number;
  suspects: DropSuspect[];
  confidence: DropConfidence;
}

/** Tunables, named so the thresholds are arguable rather than magic. */
export const DROP_RULES = {
  /** Days compared against the preceding baseline. */
  windowDays: 7,
  /** Days of baseline immediately before that window. */
  baselineDays: 21,
  /** Below this many baseline clicks the page is too quiet to reason about. */
  minBaselineClicks: 20,
  /** Fractional fall in average daily clicks that counts as a drop. */
  minDropFraction: 0.25,
  /** How far back before the onset a change can still be a suspect. */
  lookbackDays: 14,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Categories where a change plausibly moves search traffic at all. */
const SEARCH_RELEVANT = new Set(["SEO", "AVAILABILITY", "CONTENT", "PERFORMANCE"]);

const SEVERITY_RANK: Record<PageChange["severity"], number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  INFO: 0,
};

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function daysBetween(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / DAY_MS);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * The first day of the recent window where a trailing 3-day average sits below
 * the baseline. Using a 3-day average rather than a single day keeps one quiet
 * Sunday from being reported as the moment everything went wrong.
 */
function findOnset(recent: PageDailyPoint[], baselineDailyMean: number): string {
  const threshold = baselineDailyMean * (1 - DROP_RULES.minDropFraction);
  for (let i = 0; i < recent.length; i++) {
    const window = recent.slice(Math.max(0, i - 2), i + 1);
    if (mean(window.map((d) => d.clicks)) < threshold) return recent[i].date;
  }
  return recent[0].date;
}

function rankSuspects(changes: PageChange[], onset: Date): DropSuspect[] {
  return changes
    .filter((change) => {
      const days = daysBetween(onset, change.detectedAt);
      // Changes AFTER the drop began cannot have caused it. One day of slack
      // absorbs timezone skew between Google's dates and our timestamps.
      return days >= -1 && days <= DROP_RULES.lookbackDays;
    })
    .map((change) => ({ ...change, daysBefore: daysBetween(onset, change.detectedAt) }))
    .sort((a, b) => {
      // Severe first; then whichever landed closest to the drop.
      const bySeverity = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (bySeverity !== 0) return bySeverity;
      return a.daysBefore - b.daysBefore;
    });
}

function judgeConfidence(suspects: DropSuspect[]): DropConfidence {
  if (suspects.length === 0) return "unexplained";
  const strong = suspects.some(
    (s) => SEVERITY_RANK[s.severity] >= SEVERITY_RANK.HIGH && SEARCH_RELEVANT.has(s.category),
  );
  return strong ? "strong" : "possible";
}

/**
 * Analyse one page's daily series against the changes recorded for it.
 * Returns null when there is no drop worth reporting - too little traffic, too
 * little history, or simply no decline.
 */
export function detectTrafficDrop(
  page: string,
  series: PageDailyPoint[],
  changes: PageChange[],
): TrafficDrop | null {
  const ordered = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const needed = DROP_RULES.windowDays + DROP_RULES.baselineDays;
  if (ordered.length < needed) return null;

  const recent = ordered.slice(-DROP_RULES.windowDays);
  const baseline = ordered.slice(-needed, -DROP_RULES.windowDays);

  const baselineClicks = baseline.reduce((sum, d) => sum + d.clicks, 0);
  // A page with a handful of clicks will swing wildly for reasons that have
  // nothing to do with the site. Reporting those as drops trains people to
  // ignore the feature.
  if (baselineClicks < DROP_RULES.minBaselineClicks) return null;

  const baselineDailyMean = baselineClicks / baseline.length;
  const recentDailyMean = mean(recent.map((d) => d.clicks));
  const fall = (baselineDailyMean - recentDailyMean) / baselineDailyMean;
  if (fall < DROP_RULES.minDropFraction) return null;

  const onsetDate = findOnset(recent, baselineDailyMean);
  const suspects = rankSuspects(changes, toDate(onsetDate));

  return {
    page,
    onsetDate,
    clicksBefore: Math.round(baselineDailyMean * DROP_RULES.windowDays),
    clicksAfter: recent.reduce((sum, d) => sum + d.clicks, 0),
    dropPercent: Math.round(fall * 100),
    positionBefore: Number(mean(baseline.map((d) => d.position)).toFixed(1)),
    positionAfter: Number(mean(recent.map((d) => d.position)).toFixed(1)),
    suspects,
    confidence: judgeConfidence(suspects),
  };
}

/**
 * Run the analysis across every page, worst drop first. Pages with an
 * explanation are surfaced above unexplained ones: an actionable finding beats
 * an interesting one.
 */
export function findTrafficDrops(
  pages: Map<string, PageDailyPoint[]>,
  changesByPage: Map<string, PageChange[]>,
): TrafficDrop[] {
  const drops: TrafficDrop[] = [];
  for (const [page, series] of pages) {
    const drop = detectTrafficDrop(page, series, changesByPage.get(page) ?? []);
    if (drop) drops.push(drop);
  }
  const order: Record<DropConfidence, number> = { strong: 0, possible: 1, unexplained: 2 };
  return drops.sort((a, b) => {
    const byConfidence = order[a.confidence] - order[b.confidence];
    if (byConfidence !== 0) return byConfidence;
    return b.dropPercent - a.dropPercent;
  });
}
