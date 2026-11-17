/**
 * Brand video jobs from the "brand-video" queue (docs/BRAND_VIDEO.md). The
 * web app creates the ai_job row and reserves quota before queueing; this
 * file does the work, keeps progress current for the page that polls it, and
 * always ends the job as done or failed. A failed job gets its quota back.
 *
 * Kinds:
 * - "brand": refresh the brand kit from the homepage now (a scan of one page).
 * - "video-script": the AI writes the scene plan (packages/brand-video).
 * - "video-render": the MP4 export (render.ts).
 *
 * Never retried by pg-boss (retryLimit 0): a retry would spend twice.
 */
import { z } from "zod";
import { getWorkspaceEntitlement, prisma, Prisma } from "@mykavo/database";
import {
  AgentError,
  SiteReadError,
  createAgentClient,
  readSite,
  type AgentDeps,
  type AgentRun,
  type PageSummary,
} from "@mykavo/keyword-agent";
import {
  VIDEO_FEATURE,
  composeVideoHtml,
  displayDomain,
  normalizeStoryboard,
  storyboard as storyboardSchema,
  templateStoryboard,
  totalDuration,
  videoLimitsFor,
  videoScriptInput,
  writeVideoScript,
  storyboardContext,
  type BrandColors,
  type StatItem,
  type ValuePoint,
  type VideoFormat,
} from "@mykavo/brand-video";
import { scanPage, type ArtifactStorage, type BrowserPool } from "@mykavo/scanner";
import { getDefaultStorage } from "@mykavo/scanner/storage";
import type { BrandVideoJob } from "@mykavo/shared";
import { logger } from "../logger";
import { brandPrefix, saveBrandCapture } from "../brand-kit";
import { RenderError, renderVideo } from "./render";

/** Per-job AI ceiling (micro-USD): one Sonnet call with room for a retry. */
const SCRIPT_CEILING = 150_000;

const brandInput = z.object({ force: z.boolean().default(false) });
const scriptInput = videoScriptInput.extend({ videoId: z.string().min(1) });
const renderInput = z.object({
  videoId: z.string().min(1),
  format: z.enum(["landscape", "portrait", "square"]),
  quality: z.union([z.literal(720), z.literal(1080)]),
  watermark: z.boolean(),
  version: z.number().int(),
});

export class VideoJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoJobError";
  }
}

let client: AgentDeps["client"] | null = null;
function anthropic(): AgentDeps["client"] {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AgentError("failed", "The AI isn't set up on this server yet.");
  client ??= createAgentClient(key);
  return client;
}

async function progress(aiJobId: string, step: string, value: number): Promise<void> {
  await prisma.aiJob.update({ where: { id: aiJobId }, data: { step, progress: value } }).catch(() => {});
}

function userMessage(err: unknown): string {
  if (err instanceof AgentError || err instanceof SiteReadError || err instanceof RenderError || err instanceof VideoJobError) {
    return err.message;
  }
  return "Something went wrong on our side. Your allowance has been returned; please try again.";
}

async function finishFailed(aiJobId: string, kind: string, input: Prisma.JsonValue, message: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.aiJob.updateMany({
      where: { id: aiJobId, status: { in: ["queued", "running"] } },
      data: { status: "failed", error: message.slice(0, 300), finishedAt: now },
    }),
    prisma.aiQuotaUse.updateMany({ where: { aiJobId, refundedAt: null }, data: { refundedAt: now } }),
  ]);
  const videoId = (input as { videoId?: unknown } | null)?.videoId;
  if (typeof videoId !== "string") return;
  if (kind === "video-render") {
    // The export slot this job took is given back too.
    await prisma.brandVideo
      .updateMany({
        where: { id: videoId, renderJobId: aiJobId },
        data: { renderStatus: "failed", renderError: message.slice(0, 300), rendersUsed: { decrement: 1 } },
      })
      .catch(() => {});
  } else if (kind === "video-script") {
    await prisma.brandVideo
      .updateMany({ where: { id: videoId, scriptJobId: aiJobId, regenerationsUsed: { gt: 0 } }, data: { regenerationsUsed: { decrement: 1 } } })
      .catch(() => {});
  }
}

export async function runBrandVideoJob(job: BrandVideoJob, pool: BrowserPool, storage: ArtifactStorage = getDefaultStorage()): Promise<void> {
  const row = await prisma.aiJob.findUnique({
    where: { id: job.aiJobId },
    include: { website: { select: { id: true, name: true, url: true, workspaceId: true } } },
  });
  // Idempotent: a finished job is never run (or charged) twice.
  if (!row || row.status === "done" || row.status === "failed") return;
  await prisma.aiJob.update({ where: { id: row.id }, data: { status: "running", startedAt: new Date(), step: "Starting", progress: 3 } });

  try {
    let resultId: string;
    if (row.kind === "brand") resultId = await runBrand(row.id, row.website, brandInput.parse(row.input ?? {}), pool, storage);
    else if (row.kind === "video-script") resultId = await runScript(row.id, row.workspaceId, row.website, scriptInput.parse(row.input));
    else if (row.kind === "video-render") resultId = await runRender(row.id, row.website, renderInput.parse(row.input), storage);
    else throw new VideoJobError("Unknown job type.");

    await prisma.aiJob.update({
      where: { id: row.id },
      data: { status: "done", step: "Done", progress: 100, resultId, finishedAt: new Date() },
    });
    logger.info("brand video job done", { aiJobId: row.id, kind: row.kind, websiteId: row.websiteId });
  } catch (err) {
    logger.warn("brand video job failed", {
      aiJobId: row.id,
      kind: row.kind,
      websiteId: row.websiteId,
      error: err instanceof Error ? err.message.slice(0, 300) : String(err),
    });
    await finishFailed(row.id, row.kind, row.input, userMessage(err));
  }
}

type Site = { id: string; name: string; url: string; workspaceId: string };

async function runBrand(
  aiJobId: string,
  site: Site,
  input: z.infer<typeof brandInput>,
  pool: BrowserPool,
  storage: ArtifactStorage,
): Promise<string> {
  await progress(aiJobId, "Opening your homepage", 20);
  const result = await pool.withBrowser((browser) =>
    scanPage(browser, site.url, storage, {
      artifactPrefix: `ws/${site.workspaceId}/brand-scan/${aiJobId}`,
      brand: { prefix: brandPrefix(site.workspaceId, site.id) },
    }),
  );
  // The scan's own monitoring screenshot belongs to no snapshot: drop it.
  if (result.screenshotStorageKey) await storage.delete(result.screenshotStorageKey).catch(() => {});
  if (!result.brand) throw new VideoJobError("We couldn't read your homepage's brand this time. Please try again in a few minutes.");
  await progress(aiJobId, "Saving your brand kit", 85);
  await saveBrandCapture({ websiteId: site.id, workspaceId: site.workspaceId, capture: result.brand, storage, force: input.force });
  const kit = await prisma.brandKit.findUniqueOrThrow({ where: { websiteId: site.id }, select: { id: true } });
  return kit.id;
}

/** The kit as typed values (JSON columns validated defensively). */
async function loadKit(websiteId: string) {
  const kit = await prisma.brandKit.findUnique({ where: { websiteId } });
  if (!kit) throw new VideoJobError("Your brand kit isn't ready yet. Open the brand kit first.");
  const colors = kit.colors as unknown as BrandColors;
  const arr = <T>(v: Prisma.JsonValue): T[] => (Array.isArray(v) ? (v as unknown as T[]) : []);
  return {
    row: kit,
    edit: {
      name: kit.name,
      headline: kit.headline,
      description: kit.description,
      ctaText: kit.ctaText,
      valuePoints: arr<ValuePoint>(kit.valuePoints),
      stats: arr<StatItem>(kit.stats),
      services: kit.services,
    },
    colors,
  };
}

async function runScript(
  aiJobId: string,
  workspaceId: string,
  site: Site,
  input: z.infer<typeof scriptInput>,
): Promise<string> {
  const video = await prisma.brandVideo.findFirst({ where: { id: input.videoId, websiteId: site.id } });
  if (!video) throw new VideoJobError("This video was deleted.");
  const kit = await loadKit(site.id);

  await progress(aiJobId, "Reading your website", 15);
  let pages: PageSummary[] = [];
  let htmlLang: string | null = null;
  try {
    const snap = await readSite(site.url, { maxPages: 5 });
    pages = snap.pages;
    htmlLang = snap.htmlLang;
  } catch (err) {
    // The brand kit alone is enough to write a script.
    logger.info("brand video: site read skipped", { websiteId: site.id, error: err instanceof Error ? err.message : String(err) });
  }
  const profileRow = await prisma.contentProfile.findUnique({ where: { websiteId: site.id } });
  const profile =
    profileRow?.confirmed === true
      ? { businessType: profileRow.businessType, services: profileRow.services, audience: profileRow.audience, language: profileRow.language }
      : null;
  const language = (profile?.language ?? htmlLang ?? "en").slice(0, 2).toLowerCase();

  const ent = await getWorkspaceEntitlement(prisma, workspaceId);
  const run: AgentRun = {
    aiJobId,
    workspaceId,
    websiteId: site.id,
    plan: ent?.planId ?? "free",
    maxCostMicroUsd: SCRIPT_CEILING,
    spentMicroUsd: 0,
  };
  const deps: AgentDeps = {
    db: prisma,
    client: anthropic(),
    budgetUsd: process.env.AI_VIDEO_MONTHLY_BUDGET_USD,
    feature: VIDEO_FEATURE,
    featureLabel: "Brand videos",
  };
  const req = {
    kit: kit.edit,
    siteUrl: site.url,
    pages,
    profile,
    language,
    hasHero: Boolean(kit.row.heroKey),
    hasPage: Boolean(kit.row.pageKey && (kit.row.pageHeight ?? 0) > 0),
    input,
  };

  await progress(aiJobId, "Writing your scenes", 45);
  let sb;
  try {
    sb = await writeVideoScript(deps, run, req);
  } catch (err) {
    // A brand-new video still gets a starting point, built from the kit
    // with no AI, so the owner is never left with an empty page.
    if (!video.storyboard) {
      const fallback = templateStoryboard(kit.edit, storyboardContext(req));
      await prisma.brandVideo.update({
        where: { id: video.id },
        data: { storyboard: fallback as unknown as Prisma.InputJsonValue, title: fallback.title, version: { increment: 1 } },
      });
      if (err instanceof AgentError) {
        throw new AgentError(err.code, `${err.message} We started you from a template instead; your allowance has been returned.`);
      }
    }
    throw err;
  }

  await progress(aiJobId, "Saving your scenes", 90);
  await prisma.brandVideo.update({
    where: { id: video.id },
    data: {
      storyboard: sb as unknown as Prisma.InputJsonValue,
      title: sb.title,
      durationSec: input.durationSec,
      version: { increment: 1 },
    },
  });
  return video.id;
}

async function dataUri(storage: ArtifactStorage, key: string | null, mime: string): Promise<string | null> {
  if (!key) return null;
  const buf = await storage.get(key).catch(() => null);
  return buf ? `data:${mime};base64,${buf.toString("base64")}` : null;
}

async function runRender(
  aiJobId: string,
  site: Site,
  input: z.infer<typeof renderInput>,
  storage: ArtifactStorage,
): Promise<string> {
  const video = await prisma.brandVideo.findFirst({ where: { id: input.videoId, websiteId: site.id } });
  if (!video) throw new VideoJobError("This video was deleted.");
  const parsed = storyboardSchema.safeParse(video.storyboard);
  if (!parsed.success) throw new VideoJobError("This video's scenes need a quick fix before exporting.");
  const kit = await loadKit(site.id);
  const sb = normalizeStoryboard(parsed.data, {
    target: video.durationSec === 30 ? 30 : 60,
    hasHero: Boolean(kit.row.heroKey),
    hasPage: Boolean(kit.row.pageKey && (kit.row.pageHeight ?? 0) > 0),
    stats: kit.edit.stats,
    brandName: kit.edit.name,
    ctaText: kit.edit.ctaText,
  });

  // The plan at render time decides the watermark: an upgrade between the
  // click and the export never leaves a paying customer's video marked.
  const ent = await getWorkspaceEntitlement(prisma, site.workspaceId);
  const limits = videoLimitsFor(ent?.planId ?? "free", ent?.billedBy === "trial");
  const watermark = ent?.unlimited ? false : limits.watermark && input.watermark;

  await prisma.brandVideo.update({ where: { id: video.id }, data: { renderStatus: "rendering", renderProgress: 2 } });
  await progress(aiJobId, "Preparing your video", 5);
  const [logo, hero, page] = await Promise.all([
    dataUri(storage, kit.row.logoKey, "image/png"),
    dataUri(storage, kit.row.heroKey, "image/jpeg"),
    dataUri(storage, kit.row.pageKey, "image/jpeg"),
  ]);
  const html = composeVideoHtml(
    sb,
    {
      name: kit.edit.name,
      colors: kit.colors,
      headingFont: kit.row.headingFont,
      bodyFont: kit.row.bodyFont,
      logoBackground: kit.row.logoBackground,
      domain: displayDomain(site.url),
    },
    {
      logo,
      logoWidth: kit.row.logoWidth,
      logoHeight: kit.row.logoHeight,
      hero,
      page,
      pageWidth: 1280,
      pageHeight: kit.row.pageHeight,
    },
    { format: input.format as VideoFormat, watermark, mode: "render" },
  );

  await progress(aiJobId, "Recording frames", 8);
  const out = await renderVideo({
    html,
    format: input.format as VideoFormat,
    quality: input.quality,
    durationSec: totalDuration(sb),
    onProgress: async (f) => {
      const pct = Math.min(95, 8 + Math.round(f * 87));
      await progress(aiJobId, "Recording frames", pct);
      await prisma.brandVideo.update({ where: { id: video.id }, data: { renderProgress: pct } }).catch(() => {});
    },
  });

  await progress(aiJobId, "Saving your video", 96);
  const stamp = `${Date.now().toString(36)}-${aiJobId.slice(-6)}`;
  const prefix = `ws/${site.workspaceId}/video/${site.id}/${video.id}`;
  const videoKey = `${prefix}/${stamp}.mp4`;
  const posterKey = `${prefix}/${stamp}.jpg`;
  await storage.put(videoKey, out.mp4, "video/mp4");
  if (out.poster.length > 0) await storage.put(posterKey, out.poster, "image/jpeg");

  const updated = await prisma.brandVideo.updateMany({
    where: { id: video.id, renderJobId: aiJobId },
    data: {
      renderStatus: "ready",
      renderProgress: 100,
      renderError: null,
      renderedVersion: input.version,
      renderedFormat: input.format,
      renderWidth: out.width,
      renderHeight: out.height,
      watermark,
      videoKey,
      posterKey: out.poster.length > 0 ? posterKey : null,
      videoBytes: out.mp4.length,
      renderedAt: new Date(),
    },
  });
  if (updated.count === 0) {
    // A newer export took over (or the video was deleted): drop this one.
    await storage.delete(videoKey).catch(() => {});
    await storage.delete(posterKey).catch(() => {});
    return video.id;
  }
  // The previous export is replaced, not kept.
  for (const key of [video.videoKey, video.posterKey]) {
    if (key && key !== videoKey && key !== posterKey) await storage.delete(key).catch(() => {});
  }
  logger.info("brand video exported", {
    websiteId: site.id,
    videoId: video.id,
    format: input.format,
    quality: input.quality,
    bytes: out.mp4.length,
    frames: out.frames,
  });
  return video.id;
}
