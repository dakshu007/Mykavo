/**
 * AI Keyword Agent allowances per plan. Kept apart from the monitoring limits
 * (apps/web/src/config/plans.ts) on purpose, so a mistake here can never
 * change what monitoring allows (spec round 7).
 */

export type AgentPlanId = "free" | "starter" | "pro" | "agency";
export type QuotaKind = "report" | "post";

export interface AgentLimits {
  /** Deep analysis reports per quota period. */
  reports: number;
  /** AI posts per quota period. */
  posts: number;
  /** Opportunities sent to the browser; the rest stay a count. */
  visibleOpportunities: number;
}

export const AGENT_LIMITS: Record<AgentPlanId, AgentLimits> = {
  free: { reports: 1, posts: 1, visibleOpportunities: 10 },
  starter: { reports: 2, posts: 3, visibleOpportunities: Infinity },
  pro: { reports: 8, posts: 10, visibleOpportunities: Infinity },
  agency: { reports: 30, posts: 40, visibleOpportunities: Infinity },
};

/** The 14-day trial gets a taste of writing, not the full Pro allowance. */
export const TRIAL_POST_LIMIT = 3;

export function agentLimitsFor(planId: string, onTrial: boolean): AgentLimits {
  const base = AGENT_LIMITS[(planId in AGENT_LIMITS ? planId : "free") as AgentPlanId];
  return onTrial ? { ...base, posts: Math.min(base.posts, TRIAL_POST_LIMIT) } : base;
}

/** One free rewrite per post (spec round 1). */
export const FREE_REGENERATIONS_PER_POST = 1;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** The anchor's day and time of day, placed in the given UTC month (clamped). */
function anchorIn(year: number, month: number, anchor: Date): Date {
  const day = Math.min(anchor.getUTCDate(), daysInMonth(year, month));
  return new Date(
    Date.UTC(year, month, day, anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds()),
  );
}

/**
 * The monthly quota window that contains `now`, refilling on the anchor's
 * day of the month: the billing renewal date for paid plans (works for yearly
 * billing too), or the signup date on Free. All UTC. Changing plan does not
 * move the anchor, so upgrading and downgrading never resets the quota.
 */
export function quotaPeriod(now: Date, anchor: Date): { start: Date; end: Date } {
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();
  let start = anchorIn(year, month, anchor);
  if (start > now) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    start = anchorIn(year, month, anchor);
  }
  let endYear = year;
  let endMonth = month + 1;
  if (endMonth > 11) {
    endMonth = 0;
    endYear += 1;
  }
  return { start, end: anchorIn(endYear, endMonth, anchor) };
}
