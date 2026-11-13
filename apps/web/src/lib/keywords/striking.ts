import { prisma } from "@mykavo/database";
import { brandTermsFor, findStrikingDistance, type StrikingOpportunity } from "@mykavo/shared";
import { isPlatformAdmin, type AdminCandidateInput } from "@/lib/platform-admin";
import { getWorkspacePlan } from "@/lib/billing/subscription";

/**
 * Who can open the AI Keyword Agent. Platform admins only while it is being
 * built (the spec's rollout: admins, then beta users, then everyone). Every
 * page and route re-checks this server-side.
 */
export function canUseKeywordAgent(user: AdminCandidateInput): boolean {
  return isPlatformAdmin(user);
}

/** Free plans see this many opportunities; the rest are never sent to the browser. */
export const FREE_VISIBLE_OPPORTUNITIES = 10;

export interface StrikingReport {
  website: { id: string; name: string; url: string };
  connection: { property: string | null; lastSyncAt: Date | null; lastError: string | null } | null;
  /** True once a sync has stored query-and-page rows for this site. */
  hasData: boolean;
  opportunities: StrikingOpportunity[];
  /** Opportunities withheld by the plan (only the count leaves the server). */
  hiddenCount: number;
  freePlan: boolean;
}

/** Pure: applies the Free-plan cut, so the hidden rows never reach the page. */
export function limitForPlan(
  all: StrikingOpportunity[],
  freePlan: boolean,
): { visible: StrikingOpportunity[]; hiddenCount: number } {
  if (!freePlan) return { visible: all, hiddenCount: 0 };
  return {
    visible: all.slice(0, FREE_VISIBLE_OPPORTUNITIES),
    hiddenCount: Math.max(0, all.length - FREE_VISIBLE_OPPORTUNITIES),
  };
}

/**
 * Striking distance keywords for one website in the workspace, or null when
 * the website is not in it. Reads only the capped gsc_query_page rows (at
 * most 1,000 small rows) and only the columns the finder needs.
 */
export async function loadStrikingReport(workspaceId: string, websiteId: string): Promise<StrikingReport | null> {
  const website = await prisma.website.findFirst({
    where: { id: websiteId, workspaceId },
    select: {
      id: true,
      name: true,
      url: true,
      gscConnection: { select: { property: true, lastSyncAt: true, lastError: true } },
    },
  });
  if (!website) return null;

  const [rows, plan] = await Promise.all([
    prisma.gscQueryPage.findMany({
      where: { websiteId },
      select: { query: true, page: true, clicks: true, impressions: true, ctr: true, position: true },
    }),
    getWorkspacePlan(workspaceId),
  ]);

  const freePlan = plan.id === "free";
  const all = findStrikingDistance(rows, { brandTerms: brandTermsFor(website.url) });
  const { visible, hiddenCount } = limitForPlan(all, freePlan);

  return {
    website: { id: website.id, name: website.name, url: website.url },
    connection: website.gscConnection,
    hasData: rows.length > 0,
    opportunities: visible,
    hiddenCount,
    freePlan,
  };
}
