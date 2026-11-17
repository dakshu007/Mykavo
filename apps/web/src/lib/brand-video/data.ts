import { prisma, type BrandKit, type BrandVideo } from "@mykavo/database";
import { getDefaultStorage } from "@mykavo/scanner/storage";
import {
  storyboard as storyboardSchema,
  type BrandColors,
  type StatItem,
  type Storyboard,
  type ValuePoint,
} from "@mykavo/brand-video/pure";

/**
 * Brand kits and videos as the pages and API routes see them. Images and
 * videos are handed to the browser as short-lived signed R2 links (they load
 * inside a sandboxed preview frame that carries no cookies, and videos are
 * too large for a serverless response). Without R2 (local development) the
 * small images come as data: URIs and videos through an authorized route.
 */

export interface KitView {
  name: string;
  headline: string | null;
  description: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  valuePoints: ValuePoint[];
  stats: StatItem[];
  services: string[];
  colors: BrandColors;
  palette: string[];
  headingFont: string | null;
  bodyFont: string | null;
  logoBackground: string | null;
  logoWidth: number | null;
  logoHeight: number | null;
  pageHeight: number | null;
  capturedAt: string;
  editedAt: string | null;
  assets: { logo: string | null; hero: string | null; page: string | null };
}

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", mp4: "video/mp4" };

function mimeOf(key: string): string {
  return MIME[key.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

/** A link the browser can load directly, or null. */
export async function assetUrl(key: string | null, opts: { downloadName?: string } = {}): Promise<string | null> {
  if (!key) return null;
  const storage = getDefaultStorage();
  if (storage.signedGetUrl) {
    return storage.signedGetUrl(key, { expiresSeconds: 3 * 3600, downloadName: opts.downloadName, contentType: mimeOf(key) });
  }
  // Local development: small images inline; videos go through the file route.
  if (mimeOf(key).startsWith("image/")) {
    const buf = await storage.get(key).catch(() => null);
    return buf ? `data:${mimeOf(key)};base64,${buf.toString("base64")}` : null;
  }
  return null;
}

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export async function kitView(kit: BrandKit): Promise<KitView> {
  const [logo, hero, page] = await Promise.all([assetUrl(kit.logoKey), assetUrl(kit.heroKey), assetUrl(kit.pageKey)]);
  return {
    name: kit.name,
    headline: kit.headline,
    description: kit.description,
    ctaText: kit.ctaText,
    ctaUrl: kit.ctaUrl,
    valuePoints: arr<ValuePoint>(kit.valuePoints),
    stats: arr<StatItem>(kit.stats),
    services: kit.services,
    colors: kit.colors as unknown as BrandColors,
    palette: kit.palette,
    headingFont: kit.headingFont,
    bodyFont: kit.bodyFont,
    logoBackground: kit.logoBackground,
    logoWidth: kit.logoWidth,
    logoHeight: kit.logoHeight,
    pageHeight: kit.pageHeight,
    capturedAt: kit.capturedAt.toISOString(),
    editedAt: kit.editedAt?.toISOString() ?? null,
    assets: { logo, hero, page },
  };
}

export interface JobView {
  id: string;
  kind: string;
  status: string;
  step: string | null;
  progress: number;
  error: string | null;
}

export interface VideoView {
  id: string;
  websiteId: string;
  title: string;
  durationSec: number;
  format: string;
  storyboard: Storyboard | null;
  version: number;
  regenerationsUsed: number;
  rendersUsed: number;
  scriptJob: JobView | null;
  render: {
    status: string;
    progress: number;
    error: string | null;
    job: JobView | null;
    renderedVersion: number | null;
    format: string | null;
    width: number | null;
    height: number | null;
    watermark: boolean;
    bytes: number | null;
    renderedAt: string | null;
    videoUrl: string | null;
    downloadUrl: string | null;
    posterUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

function jobView(j: { id: string; kind: string; status: string; step: string | null; progress: number; error: string | null } | null): JobView | null {
  return j ? { id: j.id, kind: j.kind, status: j.status, step: j.step, progress: j.progress, error: j.error } : null;
}

const JOB_SELECT = { id: true, kind: true, status: true, step: true, progress: true, error: true } as const;

/** Safe file name for downloads: "brightleaf-brand-video.mp4". */
function fileName(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "brand-video";
  return `${base}.mp4`;
}

export async function videoView(video: BrandVideo): Promise<VideoView> {
  const [scriptJob, renderJob] = await Promise.all([
    video.scriptJobId ? prisma.aiJob.findUnique({ where: { id: video.scriptJobId }, select: JOB_SELECT }) : null,
    video.renderJobId ? prisma.aiJob.findUnique({ where: { id: video.renderJobId }, select: JOB_SELECT }) : null,
  ]);
  const parsed = storyboardSchema.safeParse(video.storyboard);
  // A render the worker never finished (crash, expired job) reads as failed.
  let status = video.renderStatus;
  let error = video.renderError;
  if ((status === "queued" || status === "rendering") && renderJob?.status === "failed") {
    status = "failed";
    error = renderJob.error;
  }
  const ready = status === "ready" || (video.videoKey !== null && status !== "queued" && status !== "rendering");
  const storage = getDefaultStorage();
  const [videoUrl, downloadUrl, posterUrl] = ready && video.videoKey
    ? await Promise.all([
        storage.signedGetUrl ? assetUrl(video.videoKey) : Promise.resolve(`/api/brand-video/videos/${video.id}/file`),
        storage.signedGetUrl
          ? assetUrl(video.videoKey, { downloadName: fileName(video.title) })
          : Promise.resolve(`/api/brand-video/videos/${video.id}/file?download=1`),
        assetUrl(video.posterKey),
      ])
    : [null, null, null];
  return {
    id: video.id,
    websiteId: video.websiteId,
    title: video.title,
    durationSec: video.durationSec,
    format: video.format,
    storyboard: parsed.success ? parsed.data : null,
    version: video.version,
    regenerationsUsed: video.regenerationsUsed,
    rendersUsed: video.rendersUsed,
    scriptJob: jobView(scriptJob),
    render: {
      status,
      progress: video.renderProgress,
      error,
      job: jobView(renderJob),
      renderedVersion: video.renderedVersion,
      format: video.renderedFormat,
      width: video.renderWidth,
      height: video.renderHeight,
      watermark: video.watermark,
      bytes: video.videoBytes,
      renderedAt: video.renderedAt?.toISOString() ?? null,
      videoUrl,
      downloadUrl,
      posterUrl,
    },
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
  };
}

/** A video in this workspace (IDOR-safe lookup). */
export function findVideo(videoId: string, workspaceId: string) {
  return prisma.brandVideo.findFirst({ where: { id: videoId, workspaceId } });
}
