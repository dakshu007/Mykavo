import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@mykavo/database";
import { buildJsonLd, profilePages, sanitizePostHtml, slugify } from "@mykavo/keyword-agent";
import { agentContext, readBody } from "@/lib/keywords/api";

type Params = { params: Promise<{ postId: string }> };

const patch = z.object({
  /** The version the editor opened; a stale save is refused (spec round 8). */
  version: z.number().int().min(1),
  title: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(80),
  metaDescription: z.string().trim().max(200),
  bodyHtml: z.string().max(200_000),
  faq: z.array(z.object({ question: z.string().trim().max(200), answer: z.string().trim().max(1000) })).max(10),
  status: z.enum(["draft", "exported", "published"]),
});

async function ownedPost(postId: string, workspaceId: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(postId)) return null;
  return prisma.contentPost.findFirst({
    where: { id: postId, workspaceId },
    select: {
      id: true,
      version: true,
      website: { select: { id: true, name: true, url: true, contentProfile: { select: { pages: true, language: true } } } },
    },
  });
}

/** PATCH: save edits. HTML is sanitised again on the server; JSON-LD is rebuilt. */
export async function PATCH(request: Request, { params }: Params) {
  const gate = await agentContext({ mutate: true, bucket: "post-save", limit: 30 });
  if (!gate.ok) return gate.response;
  const { postId } = await params;
  const post = await ownedPost(postId, gate.ctx.workspace.id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patch.safeParse(await readBody(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  const input = parsed.data;

  const pages = profilePages.safeParse(post.website.contentProfile?.pages);
  const allowedLinks = [post.website.url, ...(pages.success ? pages.data.map((p) => p.url) : [])];
  const faq = input.faq.filter((f) => f.question && f.answer);
  const metaDescription = input.metaDescription;
  const bodyHtml = sanitizePostHtml(input.bodyHtml, { allowedLinks });

  // Only saves if nobody saved since this editor opened.
  const saved = await prisma.contentPost.updateMany({
    where: { id: post.id, version: input.version },
    data: {
      title: input.title,
      slug: slugify(input.slug || input.title),
      metaDescription,
      bodyHtml,
      faq,
      status: input.status,
      jsonLd: buildJsonLd({
        title: input.title,
        metaDescription,
        language: post.website.contentProfile?.language ?? "en",
        siteName: post.website.name,
        siteUrl: post.website.url,
        faq,
      }) as Prisma.InputJsonValue,
      version: { increment: 1 },
    },
  });
  if (saved.count === 0) {
    return NextResponse.json(
      { error: "Someone else saved this post since you opened it. Reload to see their changes.", code: "conflict" },
      { status: 409 },
    );
  }
  return NextResponse.json({ version: input.version + 1, bodyHtml });
}

/** DELETE: remove a draft. The quota it used stays used. */
export async function DELETE(_request: Request, { params }: Params) {
  const gate = await agentContext({ mutate: true, bucket: "post-delete", limit: 20 });
  if (!gate.ok) return gate.response;
  const { postId } = await params;
  const post = await ownedPost(postId, gate.ctx.workspace.id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.contentPost.delete({ where: { id: post.id } });
  return NextResponse.json({ ok: true });
}
