import { prisma } from "@mykavo/database";
import { AGENT_LIMITS, type QuotaKind } from "@mykavo/keyword-agent/pure";
import { getPlan } from "@/config/plans";
import { nextPlanFor } from "@/lib/dashboard-cards";
import { loadAllowance, remaining } from "./jobs";
import { wordpressLinkFor, wpDraftView, type WpDraftView, type WpSiteLink } from "@/lib/integrations/wp-drafts";

/**
 * Everything the AI Keywords page shows besides striking distance, read with
 * light selects only: post bodies are never loaded for a list (Supabase egress).
 */

export interface JobView {
  id: string;
  kind: string;
  status: string;
  step: string | null;
  progress: number;
  error: string | null;
  createdAt: string;
}

export interface OpportunityView {
  rank: number;
  keyword: string;
  intent: string;
  cluster: string;
  reason: string;
  suggestedTitle: string;
  competition: string;
  popularity: number;
  position: number | null;
  impressions: number | null;
}

export interface AgentPageData {
  profile: {
    businessType: string;
    services: string[];
    audience: string;
    country: string;
    language: string;
    confirmed: boolean;
  } | null;
  jobs: Partial<Record<"setup" | "deep" | "write", JobView>>;
  report: {
    id: string;
    summary: string | null;
    createdAt: string;
    opportunities: OpportunityView[];
    hiddenCount: number;
  } | null;
  posts: { id: string; keyword: string; title: string; status: string; updatedAt: string; wpDraft: WpDraftView | null }[];
  /** The site's MyKavo WordPress plugin connection, for "Save as draft in WordPress". */
  wordpress: WpSiteLink | null;
  /** Write jobs still running, by keyword, so their buttons show progress. */
  writing: Record<string, string>;
  allowance: {
    reportsLeft: number | null;
    postsLeft: number | null;
    reportsLimit: number;
    postsLimit: number;
    refillsOn: string;
    blocked: string | null;
    /** The plan that gives more, for the "upgrade to write more" buttons. Null on the top plan. */
    upgrade: UpgradeOffer | null;
  };
}

export interface UpgradeOffer {
  plan: string;
  reports: number;
  posts: number;
}

/** Free and Starter move up to Pro (a running trial keeps Pro), Pro to Agency. */
function upgradeFor(planId: string, onTrial: boolean, unlimited: boolean): UpgradeOffer | null {
  if (unlimited) return null;
  const next = onTrial ? getPlan("pro") : planId === "free" || planId === "starter" || planId === "pro" ? nextPlanFor(planId) : null;
  if (!next) return null;
  const limits = AGENT_LIMITS[next.id as keyof typeof AGENT_LIMITS];
  return limits ? { plan: next.name, reports: limits.reports, posts: limits.posts } : null;
}

const jobSelect = { id: true, kind: true, status: true, step: true, progress: true, error: true, createdAt: true } as const;

function jobView(j: { id: string; kind: string; status: string; step: string | null; progress: number; error: string | null; createdAt: Date }): JobView {
  return { ...j, createdAt: j.createdAt.toISOString() };
}

export async function loadAgentPage(workspaceId: string, websiteId: string, now = new Date()): Promise<AgentPageData> {
  const [profile, recentJobs, report, posts, allowance, wordpress] = await Promise.all([
    prisma.contentProfile.findUnique({
      where: { websiteId },
      select: { businessType: true, services: true, audience: true, country: true, language: true, confirmed: true },
    }),
    prisma.aiJob.findMany({
      where: { websiteId, workspaceId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { ...jobSelect, input: true },
    }),
    prisma.keywordReport.findFirst({
      where: { websiteId, workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        summary: true,
        createdAt: true,
        opportunities: {
          orderBy: { rank: "asc" },
          select: {
            rank: true,
            keyword: true,
            intent: true,
            cluster: true,
            reason: true,
            suggestedTitle: true,
            competition: true,
            popularity: true,
            position: true,
            impressions: true,
          },
        },
      },
    }),
    prisma.contentPost.findMany({
      where: { websiteId, workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        keyword: true,
        title: true,
        status: true,
        updatedAt: true,
        version: true,
        wpDraft: { select: { status: true, editUrl: true, error: true, queuedAt: true, deliveredAt: true, postVersion: true } },
      },
    }),
    loadAllowance(workspaceId, now),
    wordpressLinkFor(websiteId),
  ]);

  const jobs: AgentPageData["jobs"] = {};
  const writing: Record<string, string> = {};
  for (const j of recentJobs) {
    if ((j.kind === "setup" || j.kind === "deep") && !jobs[j.kind]) jobs[j.kind] = jobView(j);
    if (j.kind === "write" && (j.status === "queued" || j.status === "running")) {
      const keyword = (j.input as { keyword?: unknown } | null)?.keyword;
      if (typeof keyword === "string") writing[keyword] = j.id;
    }
  }

  // Free plans: only the top opportunities ever leave the server.
  const visible = allowance.unlimited ? Infinity : allowance.limits.visibleOpportunities;
  const opportunities = report?.opportunities ?? [];

  const left = (kind: QuotaKind) => {
    const n = remaining(allowance, kind);
    return Number.isFinite(n) ? n : null;
  };

  return {
    profile,
    jobs,
    writing,
    report: report
      ? {
          id: report.id,
          summary: report.summary,
          createdAt: report.createdAt.toISOString(),
          opportunities: opportunities.slice(0, visible),
          hiddenCount: Math.max(0, opportunities.length - visible),
        }
      : null,
    posts: posts.map(({ version, wpDraft, ...p }) => ({
      ...p,
      updatedAt: p.updatedAt.toISOString(),
      wpDraft: wpDraft ? wpDraftView(wpDraft, version) : null,
    })),
    wordpress,
    allowance: {
      reportsLeft: left("report"),
      postsLeft: left("post"),
      reportsLimit: allowance.limits.reports,
      postsLimit: allowance.limits.posts,
      refillsOn: allowance.period.end.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
      blocked: allowance.blocked,
      upgrade: upgradeFor(allowance.planId, allowance.onTrial, allowance.unlimited),
    },
  };
}
