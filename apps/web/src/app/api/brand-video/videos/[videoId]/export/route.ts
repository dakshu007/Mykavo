import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, videoContext } from "@/lib/brand-video/api";
import { findVideo } from "@/lib/brand-video/data";
import { startVideoRender } from "@/lib/brand-video/jobs";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ videoId: string }> };
const body = z.object({ format: z.enum(["landscape", "portrait", "square"]) });

/** POST: export the MP4 in a format. */
export async function POST(request: Request, { params }: Params) {
  const gate = await videoContext({ mutate: true, bucket: "export", limit: 6 });
  if (!gate.ok) return gate.response;
  const { videoId } = await params;
  const video = await findVideo(videoId, gate.ctx.workspace.id);
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = body.safeParse(await readBody(request));
  if (!parsed.success) return NextResponse.json({ error: "Choose a format." }, { status: 400 });
  try {
    const r = await startVideoRender({
      workspaceId: gate.ctx.workspace.id,
      websiteId: video.websiteId,
      userId: gate.ctx.userId,
      videoId: video.id,
      format: parsed.data.format,
    });
    if (!r.ok) return NextResponse.json({ error: r.error, code: r.code }, { status: r.status });
    return NextResponse.json({ jobId: r.jobId }, { status: r.reused ? 200 : 202 });
  } catch (err) {
    logger.error("brand video export failed to start", { videoId: video.id, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
