import { prisma } from "@mykavo/database";
import { minutesBetween } from "@mykavo/shared/product-events";
import { trackAfterResponse, type WorkspaceEventItem } from "@/lib/product-events";

/**
 * Mixpanel events for triaging changes: change_reviewed for every decision
 * (review, approve, ignore, resolve) and change_approved for approvals.
 * Read after the response, from the rows as they now stand.
 */

type Decision = "review" | "approve" | "ignore" | "resolve" | "update_baseline";

const DECISIONS = new Set<string>(["review", "approve", "ignore", "resolve", "update_baseline"]);

export function trackChangeDecision(input: {
  workspaceId: string;
  changeIds: string[];
  decision: string;
  /** "single" (change page), "bulk" (list), or "baseline" (approve as new baseline). */
  surface: "single" | "bulk" | "baseline";
}): void {
  const decision = input.decision.toLowerCase() as Decision;
  if (!DECISIONS.has(decision) || input.changeIds.length === 0) return;
  trackAfterResponse(input.workspaceId, async () => {
    const changes = await prisma.changeEvent.findMany({
      where: { id: { in: input.changeIds }, website: { workspaceId: input.workspaceId } },
      select: { id: true, severity: true, category: true, detectedAt: true, aiInsights: { where: { kind: "change_explanation" }, select: { id: true }, take: 1 } },
    });
    const now = new Date();
    const items: WorkspaceEventItem[] = [];
    const approving = decision === "approve" || decision === "update_baseline";
    for (const c of changes) {
      const base = {
        alert_severity: c.severity.toLowerCase(),
        change_category: c.category.toLowerCase(),
        ai_explanation_viewed: c.aiInsights.length > 0,
        surface: input.surface,
      };
      items.push({
        event: "change_reviewed",
        dedupeKey: `${c.id}:${decision}`,
        build: () => ({
          ...base,
          review_decision: decision,
          bulk_count: input.changeIds.length,
          time_since_detected_minutes: minutesBetween(c.detectedAt, now),
        }),
      });
      if (approving) {
        items.push({
          event: "change_approved",
          dedupeKey: c.id,
          build: () => ({
            ...base,
            time_to_approval_minutes: minutesBetween(c.detectedAt, now),
            updates_baseline: decision === "update_baseline",
          }),
        });
      }
    }
    return items;
  });
}
