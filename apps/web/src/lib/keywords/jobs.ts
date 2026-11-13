import { getWorkspaceEntitlement, isAiPaused, prisma, Prisma } from "@mykavo/database";
import {
  AGENT_FEATURE,
  FREE_REGENERATIONS_PER_POST,
  agentBudgetMicroUsd,
  agentLimitsFor,
  quotaPeriod,
  type AgentLimits,
  type QuotaKind,
  type WriteJobInput,
} from "@mykavo/keyword-agent/pure";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { enqueueAiAgentJob } from "@/lib/queue";

/**
 * Starting AI Keyword Agent jobs. Quota is reserved in the same transaction
 * that creates the job, under a per-workspace advisory lock, so parallel
 * clicks cannot slip past the limit (spec round 1). Counts come from
 * ai_quota_use, which has no foreign keys: deleting a website or a post never
 * gives quota back. A failed job is refunded by the worker.
 */

export type AgentJobKind = "setup" | "deep" | "write";

export interface Allowance {
  /** The plan the allowance comes from ("free" when there is no entitlement). */
  planId: string;
  limits: AgentLimits;
  unlimited: boolean;
  onTrial: boolean;
  period: { start: Date; end: Date };
  used: Record<QuotaKind, number>;
  /** Set when AI generation must not start (payment problem). */
  blocked: string | null;
}

const PAYMENT_PROBLEM = new Set(["on_hold", "failed", "past_due", "unpaid"]);

export async function loadAllowance(workspaceId: string, now: Date = new Date()): Promise<Allowance> {
  const [ent, workspace] = await Promise.all([
    getWorkspaceEntitlement(prisma, workspaceId),
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { createdAt: true } }),
  ]);
  const onTrial = ent?.billedBy === "trial";
  const paid = ent?.billedBy === "dodo" || ent?.billedBy === "shopify";
  // Paid plans refill on the renewal date, Free and trials on the signup date.
  const anchor = paid && ent?.currentPeriodEnd ? ent.currentPeriodEnd : workspace.createdAt;
  const period = quotaPeriod(now, anchor);
  const rows = await prisma.aiQuotaUse.groupBy({
    by: ["kind"],
    where: { workspaceId, refundedAt: null, createdAt: { gte: period.start } },
    _count: { _all: true },
  });
  const used = { report: 0, post: 0 } as Record<QuotaKind, number>;
  for (const r of rows) if (r.kind === "report" || r.kind === "post") used[r.kind] = r._count._all;
  return {
    planId: ent?.planId ?? "free",
    limits: agentLimitsFor(ent?.planId ?? "free", onTrial),
    unlimited: ent?.unlimited === true,
    onTrial,
    period,
    used,
    blocked:
      paid && ent && PAYMENT_PROBLEM.has(ent.status)
        ? "Your last payment didn't go through. Update your billing to keep using AI features."
        : null,
  };
}

export function remaining(allowance: Allowance, kind: QuotaKind): number {
  if (allowance.unlimited) return Infinity;
  const limit = kind === "report" ? allowance.limits.reports : allowance.limits.posts;
  return Math.max(0, limit - allowance.used[kind]);
}

export type StartResult =
  | { ok: true; jobId: string; reused: boolean }
  | { ok: false; status: number; code: string; error: string };

const QUOTA_KIND: Record<AgentJobKind, QuotaKind | null> = { setup: null, deep: "report", write: "post" };

function startOfUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Cheap refusals before anything is reserved: switch off, cap at $0 or spent. */
async function aiAvailable(now: Date): Promise<StartResult | null> {
  if (await isAiPaused(prisma)) {
    return { ok: false, status: 503, code: "paused", error: "AI features are paused for a moment. Monitoring is not affected." };
  }
  const budget = agentBudgetMicroUsd(env.AI_AGENT_MONTHLY_BUDGET_USD);
  const spent = await prisma.aiUsage.aggregate({
    where: { feature: AGENT_FEATURE, createdAt: { gte: startOfUtcMonth(now) } },
    _sum: { costMicroUsd: true },
  });
  if ((spent._sum.costMicroUsd ?? 0) >= budget) {
    return {
      ok: false,
      status: 503,
      code: "budget",
      error:
        budget === 0
          ? "The AI keyword agent isn't switched on yet."
          : "The AI keyword agent has reached this month's limit. It will be back next month.",
    };
  }
  return null;
}

export async function startAgentJob(params: {
  workspaceId: string;
  websiteId: string;
  userId: string;
  kind: AgentJobKind;
  input?: WriteJobInput;
  now?: Date;
}): Promise<StartResult> {
  const now = params.now ?? new Date();
  const unavailable = await aiAvailable(now);
  if (unavailable) return unavailable;

  // One job of a kind per website at a time; a double click returns the same job.
  const running = await prisma.aiJob.findFirst({
    where: {
      websiteId: params.websiteId,
      kind: params.kind,
      status: { in: ["queued", "running"] },
      ...(params.kind === "write" && params.input ? { input: { path: ["keyword"], equals: params.input.keyword } } : {}),
    },
    select: { id: true },
  });
  if (running) return { ok: true, jobId: running.id, reused: true };

  if (params.kind !== "setup") {
    const profile = await prisma.contentProfile.findUnique({
      where: { websiteId: params.websiteId },
      select: { confirmed: true },
    });
    if (!profile?.confirmed) {
      return { ok: false, status: 409, code: "setup", error: "Confirm your business details first." };
    }
  } else {
    const recent = await prisma.aiJob.count({
      where: { websiteId: params.websiteId, kind: "setup", createdAt: { gte: new Date(now.getTime() - 86_400_000) } },
    });
    if (recent >= 3) {
      return { ok: false, status: 429, code: "rate", error: "Setup can run 3 times a day. Edit the details by hand instead." };
    }
  }

  const allowance = await loadAllowance(params.workspaceId, now);
  if (allowance.blocked && params.kind !== "setup") {
    return { ok: false, status: 402, code: "billing", error: allowance.blocked };
  }

  // A rewrite of an existing post uses its one free regeneration, not quota.
  const rewritePostId = params.kind === "write" ? params.input?.postId : undefined;
  const quotaKind = rewritePostId ? null : QUOTA_KIND[params.kind];

  try {
    const jobId = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ai-quota:${params.workspaceId}`}))`;
      if (rewritePostId) {
        const claimed = await tx.contentPost.updateMany({
          where: {
            id: rewritePostId,
            websiteId: params.websiteId,
            regenerationsUsed: { lt: FREE_REGENERATIONS_PER_POST },
          },
          data: { regenerationsUsed: { increment: 1 } },
        });
        if (claimed.count === 0) throw new QuotaError("regen", "This post has already used its free rewrite.");
      }
      if (quotaKind && !allowance.unlimited) {
        const limit = quotaKind === "report" ? allowance.limits.reports : allowance.limits.posts;
        const used = await tx.aiQuotaUse.count({
          where: { workspaceId: params.workspaceId, kind: quotaKind, refundedAt: null, createdAt: { gte: allowance.period.start } },
        });
        if (used >= limit) {
          const refill = allowance.period.end.toLocaleDateString("en-US", { month: "long", day: "numeric" });
          throw new QuotaError(
            "quota",
            quotaKind === "report"
              ? `You've used all ${limit} keyword ${limit === 1 ? "report" : "reports"} this month. More on ${refill}.`
              : `You've used all ${limit} AI ${limit === 1 ? "post" : "posts"} this month. More on ${refill}.`,
          );
        }
      }
      const job = await tx.aiJob.create({
        data: {
          websiteId: params.websiteId,
          workspaceId: params.workspaceId,
          userId: params.userId,
          kind: params.kind,
          input: params.input ? (params.input as Prisma.InputJsonValue) : Prisma.JsonNull,
          step: "Waiting to start",
        },
        select: { id: true },
      });
      if (quotaKind) {
        await tx.aiQuotaUse.create({ data: { workspaceId: params.workspaceId, kind: quotaKind, aiJobId: job.id } });
      }
      return job.id;
    });

    try {
      await enqueueAiAgentJob({ aiJobId: jobId });
    } catch (err) {
      logger.error("ai agent enqueue failed", { jobId, error: err instanceof Error ? err.message : String(err) });
      const at = new Date();
      await prisma.$transaction([
        prisma.aiJob.update({
          where: { id: jobId },
          data: { status: "failed", error: "We couldn't start this job. Your allowance has been returned.", finishedAt: at },
        }),
        prisma.aiQuotaUse.updateMany({ where: { aiJobId: jobId, refundedAt: null }, data: { refundedAt: at } }),
      ]);
      if (rewritePostId) {
        await prisma.contentPost.updateMany({
          where: { id: rewritePostId, regenerationsUsed: { gt: 0 } },
          data: { regenerationsUsed: { decrement: 1 } },
        });
      }
      return { ok: false, status: 503, code: "queue", error: "We couldn't start this job. Please try again in a minute." };
    }
    return { ok: true, jobId, reused: false };
  } catch (err) {
    if (err instanceof QuotaError) return { ok: false, status: 402, code: err.code, error: err.message };
    throw err;
  }
}

class QuotaError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
