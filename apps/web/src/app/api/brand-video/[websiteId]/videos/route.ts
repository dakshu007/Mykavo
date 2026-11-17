import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { VIDEO_TONES, templateStoryboard, type StatItem, type ValuePoint } from "@mykavo/brand-video/pure";
import { getOwnedWebsite } from "@/lib/api-auth";
import { readBody, videoContext } from "@/lib/brand-video/api";
import { startVideoScript, toJson } from "@/lib/brand-video/jobs";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ websiteId: string }> };

const body = z.object({
  mode: z.enum(["ai", "template"]).default("ai"),
  durationSec: z.union([z.literal(30), z.literal(60)]),
  tone: z.enum(VIDEO_TONES).default("professional"),
  notes: z.string().trim().max(400).default(""),
});

/**
 * POST: a new brand video. "ai" writes the scene plan with AI (one script
 * from the allowance); "template" builds it from the brand kit at once, no
 * AI. Either way nothing is exported until the owner clicks Export.
 */
export async function POST(request: Request, { params }: Params) {
  const gate = await videoContext({ mutate: true, bucket: "create", limit: 10 });
  if (!gate.ok) return gate.response;
  const { websiteId } = await params;
  const website = await getOwnedWebsite(gate.ctx, websiteId);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = body.safeParse(await readBody(request));
  if (!parsed.success) return NextResponse.json({ error: "Choose 30 or 60 seconds." }, { status: 400 });
  const req = parsed.data;

  const kit = await prisma.brandKit.findUnique({ where: { websiteId: website.id } });
  if (!kit) return NextResponse.json({ error: "Your brand kit isn't ready yet. Read it from your website first." }, { status: 409 });
  const count = await prisma.brandVideo.count({ where: { websiteId: website.id } });
  if (count >= 50) return NextResponse.json({ error: "Delete a few old videos first (50 per website)." }, { status: 409 });

  const template =
    req.mode === "template"
      ? templateStoryboard(
          {
            name: kit.name,
            headline: kit.headline,
            description: kit.description,
            valuePoints: (Array.isArray(kit.valuePoints) ? kit.valuePoints : []) as unknown as ValuePoint[],
            stats: (Array.isArray(kit.stats) ? kit.stats : []) as unknown as StatItem[],
            services: kit.services,
            ctaText: kit.ctaText,
          },
          {
            target: req.durationSec,
            hasHero: Boolean(kit.heroKey),
            hasPage: Boolean(kit.pageKey && (kit.pageHeight ?? 0) > 0),
            stats: (Array.isArray(kit.stats) ? kit.stats : []) as unknown as StatItem[],
            brandName: kit.name,
            ctaText: kit.ctaText,
          },
        )
      : null;

  const video = await prisma.brandVideo.create({
    data: {
      websiteId: website.id,
      workspaceId: gate.ctx.workspace.id,
      userId: gate.ctx.userId,
      title: template?.title ?? `${kit.name} brand video`,
      durationSec: req.durationSec,
      storyboard: template ? toJson(template) : undefined,
    },
    select: { id: true },
  });
  if (!template) {
    try {
      const r = await startVideoScript({
        workspaceId: gate.ctx.workspace.id,
        websiteId: website.id,
        userId: gate.ctx.userId,
        videoId: video.id,
        rewrite: false,
        durationSec: req.durationSec,
        tone: req.tone,
        notes: req.notes,
      });
      if (!r.ok) {
        await prisma.brandVideo.delete({ where: { id: video.id } }).catch(() => {});
        return NextResponse.json({ error: r.error, code: r.code }, { status: r.status });
      }
    } catch (err) {
      await prisma.brandVideo.delete({ where: { id: video.id } }).catch(() => {});
      logger.error("brand video script start failed", { websiteId: website.id, error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  }
  return NextResponse.json({ videoId: video.id }, { status: 201 });
}
