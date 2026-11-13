import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { safeEditUrl } from "@/lib/integrations/wp-drafts";

type Params = { params: Promise<{ id: string }> };

const result = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    token: z.string().max(40),
    version: z.number().int().min(1),
    wpPostId: z.number().int().positive(),
    editUrl: z.string().max(500).optional(),
  }),
  z.object({
    ok: z.literal(false),
    token: z.string().max(40),
    error: z.string().trim().min(1).max(300),
  }),
]);

/**
 * POST: the plugin reports what happened to one queued draft. Only a draft
 * of this site, still queued with the same token, is updated: a resend made
 * meanwhile stays queued for the next collection.
 */
export async function POST(request: Request, { params }: Params) {
  const ctx = await authenticateSiteRequest(request, { automated: true });
  if (!ctx || ctx.platform !== "wordpress") return unauthorizedSite();
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const parsed = result.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid result." }, { status: 400 });
  const r = parsed.data;
  const queuedAt = new Date(r.token);
  if (Number.isNaN(queuedAt.getTime())) return NextResponse.json({ error: "Invalid result." }, { status: 400 });

  const where = { id, websiteId: ctx.website.id, status: "queued", queuedAt };
  // The edit link must point into the WordPress site this token belongs to
  // (which can differ from the monitored address, e.g. www or a subfolder).
  const siteUrl = r.ok
    ? ((await prisma.siteConnection.findUnique({ where: { id: ctx.connectionId }, select: { siteUrl: true } }))?.siteUrl ??
      ctx.website.url)
    : ctx.website.url;
  const { count } = r.ok
    ? await prisma.wpDraft.updateMany({
        where,
        data: {
          status: "delivered",
          postVersion: r.version,
          wpPostId: r.wpPostId,
          editUrl: safeEditUrl(r.editUrl, siteUrl),
          error: null,
          deliveredAt: new Date(),
        },
      })
    : await prisma.wpDraft.updateMany({ where, data: { status: "failed", error: r.error } });

  if (r.ok && count > 0) {
    // The owner saved it to their site: the post is no longer just a MyKavo draft.
    await prisma.contentPost
      .updateMany({ where: { wpDraft: { id }, status: "draft" }, data: { status: "exported" } })
      .catch(() => undefined);
  }
  return NextResponse.json({ updated: count });
}
