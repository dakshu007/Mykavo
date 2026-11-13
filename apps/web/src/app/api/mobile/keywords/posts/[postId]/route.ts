import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { agentContext } from "@/lib/keywords/api";
import { wordpressLinkFor, wpDraftView } from "@/lib/integrations/wp-drafts";
import { htmlToBlocks, wordCount } from "@/lib/mobile/post-blocks";

type Params = { params: Promise<{ postId: string }> };

/**
 * GET: one AI post for reading on the phone, as plain text blocks (no HTML
 * reaches the app), with its WordPress draft state. Editing stays on the web.
 */
export async function GET(_request: Request, { params }: Params) {
  const gate = await agentContext({ mutate: false, bucket: "mobile-post", limit: 40 });
  if (!gate.ok) return gate.response;
  const { postId } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(postId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const post = await prisma.contentPost.findFirst({
    where: { id: postId, workspaceId: gate.ctx.workspace.id },
    select: {
      id: true,
      websiteId: true,
      keyword: true,
      title: true,
      metaDescription: true,
      bodyHtml: true,
      faq: true,
      status: true,
      version: true,
      updatedAt: true,
      website: { select: { name: true, url: true } },
      wpDraft: { select: { status: true, editUrl: true, error: true, queuedAt: true, deliveredAt: true, postVersion: true } },
    },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const blocks = htmlToBlocks(post.bodyHtml);
  const faq = Array.isArray(post.faq)
    ? (post.faq as unknown[])
        .filter((f): f is { question: string; answer: string } => {
          const o = f as { question?: unknown; answer?: unknown } | null;
          return typeof o?.question === "string" && typeof o?.answer === "string";
        })
        .map((f) => ({ question: f.question, answer: f.answer }))
    : [];

  return NextResponse.json(
    {
      id: post.id,
      websiteId: post.websiteId,
      website: post.website,
      keyword: post.keyword,
      title: post.title,
      metaDescription: post.metaDescription,
      status: post.status,
      updatedAt: post.updatedAt.toISOString(),
      words: wordCount(blocks),
      blocks,
      faq,
      wordpress: await wordpressLinkFor(post.websiteId),
      wpDraft: post.wpDraft ? wpDraftView(post.wpDraft, post.version) : null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
