/**
 * Brand video allowances per plan, in one place. Kept apart from monitoring
 * and keyword-agent limits so a change here can never alter either.
 *
 * Two counters:
 * - "video": a video project's FIRST export. Re-exporting the same video
 *   after edits is free, up to RENDERS_PER_VIDEO (that is server time, not AI).
 *   Free is one video for the life of the account, not per month.
 * - "video_script": AI-written scene plans (new videos and rewrites). Cheap,
 *   but capped so drafts cannot be farmed.
 */

export type VideoPlanId = "free" | "starter" | "pro" | "agency";
export type VideoQuotaKind = "video" | "video_script";
export type VideoFormat = "landscape" | "portrait" | "square";
export type VideoDuration = 30 | 60;

export const VIDEO_FORMATS: readonly VideoFormat[] = ["landscape", "portrait", "square"];
export const VIDEO_DURATIONS: readonly VideoDuration[] = [30, 60];

export interface VideoLimits {
  /** Exported videos per period (lifetime on Free). */
  videos: number;
  /** AI scene plans per period. */
  scripts: number;
  watermark: boolean;
  /** Output height for landscape (720 or 1080); other formats scale to match. */
  quality: 720 | 1080;
  formats: readonly VideoFormat[];
  /** Free counts for the life of the account; paid plans refill monthly. */
  lifetime: boolean;
}

export const VIDEO_LIMITS: Record<VideoPlanId, VideoLimits> = {
  free: { videos: 1, scripts: 3, watermark: true, quality: 720, formats: ["landscape"], lifetime: true },
  starter: { videos: 2, scripts: 10, watermark: false, quality: 1080, formats: ["landscape"], lifetime: false },
  pro: { videos: 5, scripts: 25, watermark: false, quality: 1080, formats: VIDEO_FORMATS, lifetime: false },
  agency: { videos: 20, scripts: 80, watermark: false, quality: 1080, formats: VIDEO_FORMATS, lifetime: false },
};

/** A trial shows every format, but it is not a paid plan: the watermark stays. */
const TRIAL_LIMITS: VideoLimits = {
  videos: 1,
  scripts: 3,
  watermark: true,
  quality: 720,
  formats: VIDEO_FORMATS,
  lifetime: true,
};

export function videoLimitsFor(planId: string, onTrial: boolean): VideoLimits {
  if (onTrial) return TRIAL_LIMITS;
  return VIDEO_LIMITS[(planId in VIDEO_LIMITS ? planId : "free") as VideoPlanId];
}

/** Exports allowed per video (the first one uses the "video" quota). */
export const RENDERS_PER_VIDEO = 5;
/** AI rewrites of one video's script after the first (each also uses "video_script"). */
export const SCRIPT_REWRITES_PER_VIDEO = 2;
/** Brand kit refreshes per website per day (each is a browser visit). */
export const BRAND_REFRESHES_PER_DAY = 3;
/** A kit older than this is refreshed by the next scan, unless it was edited. */
export const BRAND_KIT_MAX_AGE_DAYS = 30;

/** The canvas the scenes are laid out on, in CSS pixels. */
export const BASE_SIZE: Record<VideoFormat, { width: number; height: number }> = {
  landscape: { width: 1280, height: 720 },
  portrait: { width: 720, height: 1280 },
  square: { width: 720, height: 720 },
};

/** Output pixel size: 720p renders the canvas 1:1, 1080p at 1.5x. */
export function outputSize(format: VideoFormat, quality: 720 | 1080): { width: number; height: number; scale: number } {
  const base = BASE_SIZE[format];
  const scale = quality === 1080 ? 1.5 : 1;
  return { width: Math.round(base.width * scale), height: Math.round(base.height * scale), scale };
}

export const VIDEO_FPS = 30;

/** The AI spend that counts against the video budget (ai_usage.feature). */
export const VIDEO_FEATURE = "brand_video";
