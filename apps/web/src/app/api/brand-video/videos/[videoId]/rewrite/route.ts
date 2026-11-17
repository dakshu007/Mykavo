import { NextResponse } from "next/server";
import { z } from "zod";
import { VIDEO_TONES } from "@mykavo/brand-video/pure";
import { readBody, videoContext } from "@/lib/brand-video/api";
import { findVideo } from "@/lib/brand-video/data";
import { startVideoScript } from "@/lib/brand-video/jobs";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ videoId: string }> };
const body = z.object({
  durationSec: z.union([z.literal(30), z.literal(60)]).optional(),
  tone: z.enum(VIDEO_TONES).default("professional"),
  notes: z.string().trim().max(400).default(""),
});

/** POST: the AI rewrites this video's scenes (uses a rewrite and a script). */
export async function POST(request: Request, { params }: Params) {
  const gate = await videoContext({ mutate: true, bucket: "rewrite", limit: 6 });
  if (!gate.ok) return gate.response;
  const { videoId } = await params;
  const video = await findVideo(videoId, gate.ctx.workspace.id);
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = body.safeParse((await readBody(request)) ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const r = await startVideoScript({
      workspaceId: gate.ctx.workspace.id,
      websiteId: video.websiteId,
      userId: gate.ctx.userId,
      videoId: video.id,
      rewrite: video.storyboard !== null,
      durationSec: parsed.data.durationSec ?? (video.durationSec === 30 ? 30 : 60),
      tone: parsed.data.tone,
      notes: parsed.data.notes,
    });
    if (!r.ok) return NextResponse.json({ error: r.error, code: r.code }, { status: r.status });
    return NextResponse.json({ jobId: r.jobId }, { status: r.reused ? 200 : 202 });
  } catch (err) {
    logger.error("brand video rewrite failed to start", { videoId: video.id, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
