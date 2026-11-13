import { AGENT_LIMITS } from "@mykavo/keyword-agent/pure";
import { formatLimit, getPlan, type Plan, type PlanId } from "@/config/plans";
import { explanationsThisMonth } from "@/lib/ai/explain-change";
import { loadAllowance, remaining } from "@/lib/keywords/jobs";

/** Cookies the sidebar card and the dashboard offer bar write when closed. */
export const HIDE_OFFER_COOKIE = "mk_hide_offer";
export const HIDE_LIMIT_COOKIE = "mk_hide_limit";
export const HIDE_PROMO_BAR_COOKIE = "mk_hide_promo_bar";

export type LimitKind = "posts" | "reports" | "websites" | "explanations";

/** A plan limit the workspace has reached, and the plan that lifts it. */
export interface LimitHit {
  kind: LimitKind;
  /** Kind plus period: a closed card comes back when the limit is hit again next month. */
  key: string;
  title: string;
  body: string;
  next: Plan;
}

/** The plan that lifts a limit: Free and Starter go to Pro, Pro to Agency. */
export function nextPlanFor(planId: PlanId): Plan | null {
  if (planId === "free" || planId === "starter") return getPlan("pro");
  if (planId === "pro") return getPlan("agency");
  return null;
}

function plural(n: number, word: string): string {
  return `${formatLimit(n)} ${word}${n === 1 ? "" : "s"}`;
}

function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * The first limit this workspace has reached, most useful first: AI posts,
 * keyword reports, websites, then AI change explanations. Null when nothing
 * is used up, or when no bigger plan exists. Never throws: a failed count
 * means no card, never a broken dashboard.
 */
export async function findLimitHit(params: {
  workspaceId: string;
  plan: Plan;
  websitesUsed: number;
  websiteLimit: number;
  keywordAgent: boolean;
}): Promise<LimitHit | null> {
  const { workspaceId, plan, websitesUsed, websiteLimit, keywordAgent } = params;
  const next = nextPlanFor(plan.id);
  if (!next) return null;
  const nextAgent = AGENT_LIMITS[next.id as keyof typeof AGENT_LIMITS];

  try {
    if (keywordAgent) {
      const allowance = await loadAllowance(workspaceId);
      const period = allowance.period.start.toISOString().slice(0, 10);
      const refills = shortDate(allowance.period.end);
      if (!allowance.blocked && remaining(allowance, "post") === 0) {
        return {
          kind: "posts",
          key: `posts:${period}`,
          title: allowance.limits.posts === 1 ? "This month's blog post is used" : "This month's blog posts are used",
          body: `More on ${refills}. ${next.name} writes ${plural(nextAgent.posts, "post")} a month.`,
          next,
        };
      }
      if (!allowance.blocked && remaining(allowance, "report") === 0) {
        return {
          kind: "reports",
          key: `reports:${period}`,
          title: allowance.limits.reports === 1 ? "This month's keyword report is used" : "This month's keyword reports are used",
          body: `More on ${refills}. ${next.name} runs ${plural(nextAgent.reports, "report")} a month.`,
          next,
        };
      }
    }

    if (websiteLimit !== Infinity && websitesUsed >= websiteLimit) {
      return {
        kind: "websites",
        key: `websites:${websiteLimit}`,
        title: `All ${plural(websiteLimit, "website")} in use`,
        body: `${next.name} monitors ${plural(next.limits.websites, "website")}, checked daily.`,
        next,
      };
    }

    const explanationLimit = plan.limits.aiExplanationsPerMonth;
    if (explanationLimit !== Infinity && (await explanationsThisMonth(workspaceId)) >= explanationLimit) {
      const month = new Date().toISOString().slice(0, 7);
      return {
        kind: "explanations",
        key: `explanations:${month}`,
        title: "AI explanations used up",
        body: `${next.name} explains ${formatLimit(next.limits.aiExplanationsPerMonth)} changes a month.`,
        next,
      };
    }
  } catch {
    return null;
  }
  return null;
}
