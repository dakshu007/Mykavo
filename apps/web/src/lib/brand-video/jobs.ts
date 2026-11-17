import { getWorkspaceEntitlement, isAiPaused, prisma, Prisma } from "@mykavo/database";
import { agentBudgetMicroUsd, quotaPeriod } from "@mykavo/keyword-agent/pure";
import {
  BRAND_REFRESHES_PER_DAY,
  RENDERS_PER_VIDEO,
  SCRIPT_REWRITES_PER_VIDEO,
  VIDEO_FEATURE,
  videoLimitsFor,
  type VideoFormat,
  type VideoLimits,
  type VideoQuotaKind,
} from "@mykavo/brand-video/pure";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { enqueueBrandVideoJob } from "@/lib/queue";

/**
 * Starting Brand Video jobs, the same way AI Keywords does: quota is reserved
 * in the transaction that creates the job, under a per-workspace advisory
 * lock, so parallel clicks cannot slip past a limit. Counts come from
 * ai_quota_use (no foreign keys: deleting a video never gives quota back). A
 * failed job is refunded by the worker.
 */

export type VideoJobKind = "brand" | "video-script" | "video-render";

export interface VideoAllowance {
  planId: string;
  limits: VideoLimits;
  unlimited: boolean;
  onTrial: boolean;
  period: { start: Date; end: Date | null };
  used: Record<VideoQuotaKind, number>;
  /** Set when paid generation must not start (payment problem). */
  blocked: string | null;
}

const PAYMENT_PROBLEM = new Set(["on_hold", "failed", "past_due", "unpaid"]);

export async function loadVideoAllowance(workspaceId: string, now: Date = new Date()): Promise<VideoAllowance> {
  const [ent, workspace] = await Promise.all([
    getWorkspaceEntitlement(prisma, workspaceId),
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { createdAt: true } }),
  ]);
  const onTrial = ent?.billedBy === "trial";
  const paid = ent?.billedBy === "dodo" || ent?.billedBy === "shopify";
  const limits = videoLimitsFor(ent?.planId ?? "free", onTrial);
  // Free (and a trial) count for the life of the account; paid plans refill
  // on the renewal date, like AI Keywords.
  const period = limits.lifetime
    ? { start: new Date(0), end: null }
    : quotaPeriod(now, paid && ent?.currentPeriodEnd ? ent.currentPeriodEnd : workspace.createdAt);
  const rows = await prisma.aiQuotaUse.groupBy({
    by: ["kind"],
    where: { workspaceId, refundedAt: null, createdAt: { gte: period.start }, kind: { in: ["video", "video_script"] } },
    _count: { _all: true },
  });
  const used: Record<VideoQuotaKind, number> = { video: 0, video_script: 0 };
  for (const r of rows) if (r.kind === "video" || r.kind === "video_script") used[r.kind] = r._count._all;
  return {
    planId: ent?.planId ?? "free",
    limits,
    unlimited: ent?.unlimited === true,
    onTrial,
    period,
    used,
    blocked:
      paid && ent && PAYMENT_PROBLEM.has(ent.status)
        ? "Your last payment didn't go through. Update your billing to keep making videos."
        : null,
  };
}

export function videosLeft(a: VideoAllowance): number {
  return a.unlimited ? Infinity : Math.max(0, a.limits.videos - a.used.video);
}

export function scriptsLeft(a: VideoAllowance): number {
  return a.unlimited ? Infinity : Math.max(0, a.limits.scripts - a.used.video_script);
}

/** What an export of this workspace gets right now. */
export function exportOptions(a: VideoAllowance): { quality: 720 | 1080; watermark: boolean; formats: readonly VideoFormat[] } {
  if (a.unlimited) return { quality: 1080, watermark: false, formats: ["landscape", "portrait", "square"] };
  return { quality: a.limits.quality, watermark: a.limits.watermark, formats: a.limits.formats };
}

export type StartResult =
  | { ok: true; jobId: string; reused: boolean }
  | { ok: false; status: number; code: string; error: string };

class QuotaError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function startOfUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** AI scripts only: the kill switch and the video AI budget. Exports use no AI. */
async function aiAvailable(now: Date): Promise<StartResult | null> {
  if (await isAiPaused(prisma)) {
    return { ok: false, status: 503, code: "paused", error: "AI features are paused for a moment. Monitoring is not affected." };
  }
  const budget = agentBudgetMicroUsd(env.AI_VIDEO_MONTHLY_BUDGET_USD);
  const spent = await prisma.aiUsage.aggregate({
    where: { feature: VIDEO_FEATURE, createdAt: { gte: startOfUtcMonth(now) } },
    _sum: { costMicroUsd: true },
  });
  if ((spent._sum.costMicroUsd ?? 0) >= budget) {
    return {
      ok: false,
      status: 503,
      code: "budget",
      error:
        budget === 0
          ? "AI scripts for brand videos aren't switched on yet. You can start from a template instead."
          : "AI scripts have reached this month's limit. You can start from a template instead.",
    };
  }
  return null;
}

function refillNote(a: VideoAllowance): string {
  if (!a.period.end) return "Upgrade for more.";
  return `More on ${a.period.end.toLocaleDateString("en-US", { month: "long", day: "numeric" })}.`;
}

interface StartParams {
  workspaceId: string;
  websiteId: string;
  userId: string;
  now?: Date;
}

async function enqueueOrRefund(jobId: string, undo: () => Promise<void>): Promise<StartResult> {
  try {
    await enqueueBrandVideoJob({ aiJobId: jobId });
    return { ok: true, jobId, reused: false };
  } catch (err) {
    logger.error("brand video enqueue failed", { jobId, error: err instanceof Error ? err.message : String(err) });
    const at = new Date();
    await prisma.$transaction([
      prisma.aiJob.update({
        where: { id: jobId },
        data: { status: "failed", error: "We couldn't start this job. Your allowance has been returned.", finishedAt: at },
      }),
      prisma.aiQuotaUse.updateMany({ where: { aiJobId: jobId, refundedAt: null }, data: { refundedAt: at } }),
    ]);
    await undo().catch(() => {});
    return { ok: false, status: 503, code: "queue", error: "We couldn't start this job. Please try again in a minute." };
  }
}

/** Refresh the brand kit from the homepage now. */
export async function startBrandRefresh(p: StartParams & { force: boolean }): Promise<StartResult> {
  const now = p.now ?? new Date();
  const running = await prisma.aiJob.findFirst({
    where: { websiteId: p.websiteId, kind: "brand", status: { in: ["queued", "running"] } },
    select: { id: true },
  });
  if (running) return { ok: true, jobId: running.id, reused: true };
  const recent = await prisma.aiJob.count({
    where: { websiteId: p.websiteId, kind: "brand", createdAt: { gte: new Date(now.getTime() - 86_400_000) } },
  });
  if (recent >= BRAND_REFRESHES_PER_DAY) {
    return {
      ok: false,
      status: 429,
      code: "rate",
      error: `The brand kit can be refreshed ${BRAND_REFRESHES_PER_DAY} times a day. Edit it by hand instead.`,
    };
  }
  const job = await prisma.aiJob.create({
    data: {
      websiteId: p.websiteId,
      workspaceId: p.workspaceId,
      userId: p.userId,
      kind: "brand",
      input: { force: p.force },
      step: "Waiting to start",
    },
    select: { id: true },
  });
  return enqueueOrRefund(job.id, async () => {});
}

/** The AI writes (or rewrites) a video's scene plan. */
export async function startVideoScript(
  p: StartParams & { videoId: string; rewrite: boolean; durationSec: 30 | 60; tone: string; notes: string },
): Promise<StartResult> {
  const now = p.now ?? new Date();
  const unavailable = await aiAvailable(now);
  if (unavailable) return unavailable;

  const running = await prisma.aiJob.findFirst({
    where: { websiteId: p.websiteId, kind: "video-script", status: { in: ["queued", "running"] }, input: { path: ["videoId"], equals: p.videoId } },
    select: { id: true },
  });
  if (running) return { ok: true, jobId: running.id, reused: true };

  const allowance = await loadVideoAllowance(p.workspaceId, now);
  if (allowance.blocked) return { ok: false, status: 402, code: "billing", error: allowance.blocked };

  try {
    const jobId = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ai-quota:${p.workspaceId}`}))`;
      if (p.rewrite) {
        const claimed = await tx.brandVideo.updateMany({
          where: { id: p.videoId, websiteId: p.websiteId, regenerationsUsed: { lt: SCRIPT_REWRITES_PER_VIDEO } },
          data: { regenerationsUsed: { increment: 1 } },
        });
        if (claimed.count === 0) {
          throw new QuotaError("regen", `This video has used its ${SCRIPT_REWRITES_PER_VIDEO} AI rewrites. Edit the scenes by hand instead.`);
        }
      }
      if (!allowance.unlimited) {
        const used = await tx.aiQuotaUse.count({
          where: { workspaceId: p.workspaceId, kind: "video_script", refundedAt: null, createdAt: { gte: allowance.period.start } },
        });
        if (used >= allowance.limits.scripts) {
          throw new QuotaError(
            "quota",
            `You've used all ${allowance.limits.scripts} AI video scripts${allowance.limits.lifetime ? "" : " this month"}. ${refillNote(allowance)}`,
          );
        }
      }
      const job = await tx.aiJob.create({
        data: {
          websiteId: p.websiteId,
          workspaceId: p.workspaceId,
          userId: p.userId,
          kind: "video-script",
          input: { videoId: p.videoId, durationSec: p.durationSec, tone: p.tone, notes: p.notes },
          step: "Waiting to start",
        },
        select: { id: true },
      });
      await tx.aiQuotaUse.create({ data: { workspaceId: p.workspaceId, kind: "video_script", aiJobId: job.id } });
      await tx.brandVideo.update({ where: { id: p.videoId }, data: { scriptJobId: job.id } });
      return job.id;
    });
    return enqueueOrRefund(jobId, async () => {
      if (p.rewrite) {
        await prisma.brandVideo.updateMany({
          where: { id: p.videoId, regenerationsUsed: { gt: 0 } },
          data: { regenerationsUsed: { decrement: 1 } },
        });
      }
    });
  } catch (err) {
    if (err instanceof QuotaError) return { ok: false, status: 402, code: err.code, error: err.message };
    throw err;
  }
}

/**
 * Export the MP4. The first export of a video uses one "video" from the
 * allowance; re-exports of the same video (after edits, or after upgrading
 * to drop the watermark) are free up to RENDERS_PER_VIDEO.
 */
export async function startVideoRender(p: StartParams & { videoId: string; format: VideoFormat }): Promise<StartResult> {
  const now = p.now ?? new Date();
  const allowance = await loadVideoAllowance(p.workspaceId, now);
  if (allowance.blocked) return { ok: false, status: 402, code: "billing", error: allowance.blocked };
  const opts = exportOptions(allowance);
  if (!opts.formats.includes(p.format)) {
    return { ok: false, status: 402, code: "format", error: "Vertical and square videos come with Pro and Agency." };
  }

  const video = await prisma.brandVideo.findFirst({
    where: { id: p.videoId, websiteId: p.websiteId },
    select: { id: true, version: true, storyboard: true, renderStatus: true, renderJobId: true },
  });
  if (!video) return { ok: false, status: 404, code: "missing", error: "Not found" };
  if (!video.storyboard) return { ok: false, status: 409, code: "script", error: "This video's scenes are still being written." };
  if ((video.renderStatus === "queued" || video.renderStatus === "rendering") && video.renderJobId) {
    const live = await prisma.aiJob.findFirst({
      where: { id: video.renderJobId, status: { in: ["queued", "running"] } },
      select: { id: true },
    });
    if (live) return { ok: true, jobId: live.id, reused: true };
  }

  try {
    const jobId = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ai-quota:${p.workspaceId}`}))`;
      const claimed = await tx.brandVideo.updateMany({
        where: { id: video.id, rendersUsed: { lt: RENDERS_PER_VIDEO } },
        data: { rendersUsed: { increment: 1 } },
      });
      if (claimed.count === 0) {
        throw new QuotaError("renders", `This video has been exported ${RENDERS_PER_VIDEO} times. Make a new video to export again.`);
      }
      // Has this video already used a "video" from the allowance?
      const pastJobs = await tx.aiJob.findMany({
        where: { websiteId: p.websiteId, kind: "video-render", input: { path: ["videoId"], equals: video.id } },
        select: { id: true },
      });
      const charged =
        pastJobs.length > 0 &&
        (await tx.aiQuotaUse.count({ where: { kind: "video", refundedAt: null, aiJobId: { in: pastJobs.map((j) => j.id) } } })) > 0;
      if (!charged && !allowance.unlimited) {
        const used = await tx.aiQuotaUse.count({
          where: { workspaceId: p.workspaceId, kind: "video", refundedAt: null, createdAt: { gte: allowance.period.start } },
        });
        if (used >= allowance.limits.videos) {
          throw new QuotaError(
            "quota",
            allowance.limits.lifetime
              ? `Your free plan includes ${allowance.limits.videos} video. Upgrade to export more, without the watermark.`
              : `You've exported all ${allowance.limits.videos} videos this month. ${refillNote(allowance)}`,
          );
        }
      }
      const job = await tx.aiJob.create({
        data: {
          websiteId: p.websiteId,
          workspaceId: p.workspaceId,
          userId: p.userId,
          kind: "video-render",
          input: { videoId: video.id, format: p.format, quality: opts.quality, watermark: opts.watermark, version: video.version },
          step: "Waiting to start",
        },
        select: { id: true },
      });
      if (!charged) await tx.aiQuotaUse.create({ data: { workspaceId: p.workspaceId, kind: "video", aiJobId: job.id } });
      await tx.brandVideo.update({
        where: { id: video.id },
        data: { renderStatus: "queued", renderJobId: job.id, renderProgress: 0, renderError: null },
      });
      return job.id;
    });
    return enqueueOrRefund(jobId, async () => {
      await prisma.brandVideo.updateMany({
        where: { id: video.id, renderJobId: jobId },
        data: { renderStatus: "failed", renderError: "We couldn't start this export.", rendersUsed: { decrement: 1 } },
      });
    });
  } catch (err) {
    if (err instanceof QuotaError) return { ok: false, status: 402, code: err.code, error: err.message };
    throw err;
  }
}

export function toJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}
