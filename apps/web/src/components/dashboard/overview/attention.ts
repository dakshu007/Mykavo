import type { ChangeSeverity, WebsiteStatus } from "@mykavo/database";
import { pathOf } from "./format";

/**
 * "Needs your attention" derivation for the Overview page. Pure: the page
 * loads the rows, this module decides what is worth interrupting someone for,
 * in what order, and how much of it fits on the page.
 *
 * WHAT COUNTS
 * -----------
 * - Open (NEW / REVIEWED) change events at CRITICAL, HIGH or MEDIUM. LOW and
 *   INFO stay on the Changes page; they are counted, never listed here.
 * - Website problems, which are not change events but stop monitoring just
 *   as surely: a website in ERROR, a website MyKavo paused because the plan no
 *   longer covers it, a last scan that FAILED, and a site that is currently
 *   failing its uptime check.
 *
 * Websites paused by their owner are a choice, not a problem, and are left
 * out. So are websites MyKavo paused for inactivity (DORMANT): opening the
 * dashboard is exactly what resumes them (see the dashboard layout), so by
 * the time anyone reads the row it would already be wrong.
 */

/** Change severities the attention list shows, most severe first. */
export const ATTENTION_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM"] as const;
export type AttentionSeverity = (typeof ATTENTION_SEVERITIES)[number];

/** Rows shown before the list collapses into "View all changes". */
export const ATTENTION_ROW_LIMIT = 8;

/** Ordering weight. Website problems share the top tier with CRITICAL. */
const RANK = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 } as const satisfies Record<AttentionSeverity, number>;

export function isAttentionSeverity(severity: ChangeSeverity): severity is AttentionSeverity {
  return (ATTENTION_SEVERITIES as readonly ChangeSeverity[]).includes(severity);
}

export interface AttentionWebsite {
  id: string;
  name: string;
  url: string;
  status: WebsiteStatus;
}

export interface AttentionChange {
  id: string;
  websiteId: string;
  title: string;
  severity: ChangeSeverity;
  detectedAt: Date;
  /** Null for site-wide changes (robots.txt, sitemap). */
  pageUrl: string | null;
}

export interface LatestScan {
  id: string;
  status: "COMPLETED" | "PARTIAL" | "FAILED";
  /** Already user-facing (see scanErrorMessage in @mykavo/shared). */
  errorMessage: string | null;
  finishedAt: Date;
}

export type AutoPauseReason = "DORMANT" | "OVER_LIMIT";

export interface AttentionInput {
  websites: AttentionWebsite[];
  /** Open changes, any severity; only CRITICAL/HIGH/MEDIUM become rows. */
  openChanges: AttentionChange[];
  /**
   * Open CRITICAL/HIGH/MEDIUM totals per website. openChanges is a capped
   * query, so this is what tells the list how much it is not showing.
   */
  openAttentionTotals: ReadonlyMap<string, number>;
  latestScans: ReadonlyMap<string, LatestScan>;
  autoPause: ReadonlyMap<string, AutoPauseReason>;
  /** Websites whose latest uptime check failed, with when it ran. */
  down: ReadonlyMap<string, Date>;
  limit?: number;
}

export type AttentionBadge =
  | { type: "severity"; severity: AttentionSeverity }
  | { type: "problem"; label: string; tone: "critical" | "warning" };

export interface AttentionRow {
  key: string;
  rank: number;
  badge: AttentionBadge;
  title: string;
  /** Page path, "Site-wide", or a one-line explanation of the problem. */
  detail: string | null;
  at: Date | null;
  href: string;
  /** Visible label of the single primary action. */
  actionLabel: string;
}

export interface AttentionGroup {
  websiteId: string;
  websiteName: string;
  websiteUrl: string;
  rows: AttentionRow[];
  /** Items for this website that did not fit under the row limit. */
  hiddenCount: number;
}

export interface AttentionResult {
  groups: AttentionGroup[];
  /** Rows rendered across all groups. */
  shownCount: number;
  /** Every attention item in the workspace, shown or not. */
  totalCount: number;
  /** Websites with at least one attention item. */
  websiteIds: ReadonlySet<string>;
}

/** The website problem rows for one website (zero, one or two of them). */
export function websiteProblems(
  website: AttentionWebsite,
  latestScan: LatestScan | undefined,
  autoPause: AutoPauseReason | undefined,
  downSince: Date | undefined,
): AttentionRow[] {
  const rows: AttentionRow[] = [];
  const websiteHref = `/dashboard/websites/${website.id}`;
  const lastFailed = latestScan?.status === "FAILED" ? latestScan : null;

  if (website.status === "ERROR") {
    rows.push({
      key: `error:${website.id}`,
      rank: RANK.CRITICAL,
      badge: { type: "problem", label: "Error", tone: "critical" },
      title: "Monitoring stopped because of an error",
      detail:
        lastFailed?.errorMessage ??
        "Open the website to see what went wrong, then run a new scan.",
      at: lastFailed?.finishedAt ?? null,
      href: websiteHref,
      actionLabel: "Open website",
    });
  } else if (website.status === "PAUSED") {
    if (autoPause === "OVER_LIMIT") {
      rows.push({
        key: `paused:${website.id}`,
        rank: RANK.HIGH,
        badge: { type: "problem", label: "Paused", tone: "warning" },
        title: "Paused by MyKavo when your trial ended",
        detail: "Your plan covers fewer websites. Upgrade to resume monitoring. The baseline is kept.",
        at: null,
        href: "/dashboard/billing?from=paused:over-limit",
        actionLabel: "Upgrade",
      });
    }
    // An owner's pause, or DORMANT (resumed by this very visit): nothing to do.
    return rows;
  } else if (lastFailed) {
    rows.push({
      key: `scan:${lastFailed.id}`,
      rank: RANK.CRITICAL,
      badge: { type: "problem", label: "Scan failed", tone: "critical" },
      title: "The last scan failed",
      detail: lastFailed.errorMessage ?? "No pages could be checked in this scan.",
      at: lastFailed.finishedAt,
      href: `/dashboard/scans/${lastFailed.id}`,
      actionLabel: "View scan",
    });
  }

  if (downSince) {
    rows.push({
      key: `down:${website.id}`,
      rank: RANK.CRITICAL,
      badge: { type: "problem", label: "Down", tone: "critical" },
      title: "The website is not responding to uptime checks",
      detail: null,
      at: downSince,
      href: websiteHref,
      actionLabel: "Open website",
    });
  }

  return rows;
}

function changeRow(change: AttentionChange, severity: AttentionSeverity): AttentionRow {
  return {
    key: `change:${change.id}`,
    rank: RANK[severity],
    badge: { type: "severity", severity },
    title: change.title,
    detail: change.pageUrl ? pathOf(change.pageUrl) : "Site-wide",
    at: change.detectedAt,
    href: `/dashboard/changes/${change.id}`,
    actionLabel: "Review",
  };
}

const time = (d: Date | null) => (d ? d.getTime() : 0);

/** Most severe first; then problems before changes; then newest first. */
function compareRows(a: AttentionRow, b: AttentionRow): number {
  if (a.rank !== b.rank) return b.rank - a.rank;
  const aProblem = a.badge.type === "problem" ? 1 : 0;
  const bProblem = b.badge.type === "problem" ? 1 : 0;
  if (aProblem !== bProblem) return bProblem - aProblem;
  return time(b.at) - time(a.at);
}

/**
 * Builds the grouped, ordered, capped attention list. Groups are websites,
 * ordered by their worst item and then by their newest; at most `limit` rows
 * are returned in total, and every group says how much of it was cut.
 */
export function buildAttention(input: AttentionInput): AttentionResult {
  const limit = input.limit ?? ATTENTION_ROW_LIMIT;
  const changesByWebsite = new Map<string, AttentionRow[]>();
  for (const change of input.openChanges) {
    if (!isAttentionSeverity(change.severity)) continue;
    const list = changesByWebsite.get(change.websiteId) ?? [];
    list.push(changeRow(change, change.severity));
    changesByWebsite.set(change.websiteId, list);
  }

  const candidates: { website: AttentionWebsite; rows: AttentionRow[]; total: number }[] = [];
  for (const website of input.websites) {
    const problems = websiteProblems(
      website,
      input.latestScans.get(website.id),
      input.autoPause.get(website.id),
      input.down.get(website.id),
    );
    const changes = changesByWebsite.get(website.id) ?? [];
    // The capped query can return fewer rows than exist; never more.
    const changeTotal = Math.max(changes.length, input.openAttentionTotals.get(website.id) ?? 0);
    const rows = [...problems, ...changes].sort(compareRows);
    const total = problems.length + changeTotal;
    if (total > 0) candidates.push({ website, rows, total });
  }

  candidates.sort((a, b) => {
    const aTop = a.rows[0];
    const bTop = b.rows[0];
    // A website whose changes all fell outside the capped query sorts last.
    if (!aTop || !bTop) return aTop ? -1 : bTop ? 1 : 0;
    return compareRows(aTop, bTop);
  });

  const groups: AttentionGroup[] = [];
  let shownCount = 0;
  let totalCount = 0;
  for (const c of candidates) {
    totalCount += c.total;
    const room = Math.max(0, limit - shownCount);
    const rows = c.rows.slice(0, room);
    shownCount += rows.length;
    if (rows.length === 0) continue;
    groups.push({
      websiteId: c.website.id,
      websiteName: c.website.name,
      websiteUrl: c.website.url,
      rows,
      hiddenCount: c.total - rows.length,
    });
  }

  return {
    groups,
    shownCount,
    totalCount,
    websiteIds: new Set(candidates.map((c) => c.website.id)),
  };
}

export interface WebsiteHealthSummary {
  /** Monitoring (ACTIVE) with nothing needing attention. */
  healthy: number;
  /** Any website with at least one attention item. */
  needsAttention: number;
  /** Still being set up (PENDING, DISCOVERING, BASELINING). */
  settingUp: number;
  /** Paused, by the owner or by MyKavo, with nothing else to act on. */
  paused: number;
}

/** Splits websites into the buckets the summary row reports. */
export function summarizeWebsiteHealth(
  websites: readonly Pick<AttentionWebsite, "id" | "status">[],
  needsAttention: ReadonlySet<string>,
): WebsiteHealthSummary {
  const summary: WebsiteHealthSummary = { healthy: 0, needsAttention: 0, settingUp: 0, paused: 0 };
  for (const w of websites) {
    if (needsAttention.has(w.id)) summary.needsAttention++;
    else if (w.status === "ACTIVE") summary.healthy++;
    else if (w.status === "PAUSED") summary.paused++;
    // ERROR always produces an attention row, so what is left is set-up.
    else summary.settingUp++;
  }
  return summary;
}
