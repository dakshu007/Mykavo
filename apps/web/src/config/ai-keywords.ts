import { AGENT_LIMITS, FREE_REGENERATIONS_PER_POST, type AgentPlanId } from "@mykavo/keyword-agent/pure";

/**
 * Marketing copy helpers for the AI Keywords & Blog Writer. The allowances
 * come from the agent's own limits (packages/keyword-agent/src/limits.ts), so
 * no page can quote a number the product does not enforce.
 */

/** The feature's name in marketing copy. The in-app nav item is "AI Keywords". */
export const AI_KEYWORDS_NAME = "AI Keywords & Blog Writer";

/** Plan order for copy: cheapest first. */
export const AGENT_PLAN_ORDER: AgentPlanId[] = ["free", "starter", "pro", "agency"];

const PLAN_LABEL: Record<AgentPlanId, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  agency: "Agency",
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** "2 keyword reports and 3 blog posts" for one plan. */
export function keywordAllowance(id: AgentPlanId): string {
  const { reports, posts } = AGENT_LIMITS[id];
  return `${plural(reports, "keyword report")} and ${plural(posts, "blog post")}`;
}

/**
 * "1 keyword report and 1 blog post a month on Free, 2 and 3 on Starter,
 * 8 and 10 on Pro, 30 and 40 on Agency".
 */
export function keywordAllowanceSummary(): string {
  return AGENT_PLAN_ORDER.map((id, i) => {
    const { reports, posts } = AGENT_LIMITS[id];
    return i === 0
      ? `${keywordAllowance(id)} a month on ${PLAN_LABEL[id]}`
      : `${reports} and ${posts} on ${PLAN_LABEL[id]}`;
  }).join(", ");
}

/** How many keywords the Free plan shows per report (the rest stay a count). */
export const FREE_VISIBLE_KEYWORDS = AGENT_LIMITS.free.visibleOpportunities;

/** Free rewrites per post. */
export const FREE_REWRITES_PER_POST = FREE_REGENERATIONS_PER_POST;
