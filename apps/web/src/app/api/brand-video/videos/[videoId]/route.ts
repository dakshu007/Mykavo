import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { getDefaultStorage } from "@mykavo/scanner/storage";
import { normalizeStoryboard, storyboard as storyboardSchema, type StatItem } from "@mykavo/brand-video/pure";
import { noStore, readBody, videoContext } from "@/lib/brand-video/api";
import { findVideo, videoView } from "@/lib/brand-video/data";
import { toJson } from "@/lib/brand-video/jobs";

type Params = { params: Promise<{ videoId: string }> };

/** GET: the video, its scenes, and the state of its script and export. */
export async function GET(_request: Request, { params }: Params) {
  const gate = await videoContext({ mutate: false, bucket: "read", limit: 120 });
  if (!gate.ok) return gate.response;
  const { videoId } = await params;
  const video = await findVideo(videoId, gate.ctx.workspace.id);
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ video: await videoView(video) }, { headers: noStore });
}

const patch = z.object({
  title: z.string().trim().min(1).max(80),
  storyboard: storyboardSchema,
  format: z.enum(["landscape", "portrait", "square"]).optional(),
});

/** PATCH: save the owner's edits to the scenes (made safe the same way an AI plan is). */
export async function PATCH(request: Request, { params }: Params) {
  const gate = await videoContext({ mutate: true, bucket: "edit", limit: 60 });
  if (!gate.ok) return gate.response;
  const { videoId } = await params;
  const video = await findVideo(videoId, gate.ctx.workspace.id);
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = patch.safeParse(await readBody(request));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Check the scenes." }, { status: 400 });
  }
  const kit = await prisma.brandKit.findUnique({ where: { websiteId: video.websiteId } });
  if (!kit) return NextResponse.json({ error: "The brand kit is missing." }, { status: 409 });
  const sb = normalizeStoryboard(
    { ...parsed.data.storyboard, title: parsed.data.title },
    {
      target: video.durationSec === 30 ? 30 : 60,
      hasHero: Boolean(kit.heroKey),
      hasPage: Boolean(kit.pageKey && (kit.pageHeight ?? 0) > 0),
      stats: (Array.isArray(kit.stats) ? kit.stats : []) as unknown as StatItem[],
      brandName: kit.name,
      ctaText: kit.ctaText,
    },
  );
  // Durations the owner set are kept as typed (within each scene's range):
  // normalize fits them to the target only when they overshoot it.
  const saved = await prisma.brandVideo.update({
    where: { id: video.id },
    data: {
      title: parsed.data.title,
      storyboard: toJson(sb),
      ...(parsed.data.format ? { format: parsed.data.format } : {}),
      version: { increment: 1 },
    },
  });
  return NextResponse.json({ video: await videoView(saved) }, { headers: noStore });
}

/** DELETE: the video and its exported files. Its allowance is not given back. */
export async function DELETE(_request: Request, { params }: Params) {
  const gate = await videoContext({ mutate: true, bucket: "delete", limit: 20 });
  if (!gate.ok) return gate.response;
  const { videoId } = await params;
  const video = await findVideo(videoId, gate.ctx.workspace.id);
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.brandVideo.delete({ where: { id: video.id } });
  const storage = getDefaultStorage();
  for (const key of [video.videoKey, video.posterKey]) if (key) await storage.delete(key).catch(() => {});
  return NextResponse.json({ ok: true });
}
