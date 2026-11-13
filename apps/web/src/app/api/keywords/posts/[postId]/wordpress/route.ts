import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { agentContext } from "@/lib/keywords/api";
import { queueWpDraft, wordpressLinkFor, wpDraftView, WP_DRAFTS_MIN_PLUGIN } from "@/lib/integrations/wp-drafts";

type Params = { params: Promise<{ postId: string }> };

async function ownedPost(postId: string, workspaceId: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(postId)) return null;
  return prisma.contentPost.findFirst({
    where: { id: postId, workspaceId },
    select: {
      id: true,
      version: true,
      websiteId: true,
      wpDraft: { select: { status: true, editUrl: true, error: true, queuedAt: true, deliveredAt: true, postVersion: true } },
    },
  });
}

/** GET: where this post stands in WordPress. The editor polls it while a draft is on its way. */
export async function GET(_request: Request, { params }: Params) {
  const gate = await agentContext({ mutate: false, bucket: "poll", limit: 60 });
  if (!gate.ok) return gate.response;
  const { postId } = await params;
  const post = await ownedPost(postId, gate.ctx.workspace.id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(
    { draft: post.wpDraft ? wpDraftView(post.wpDraft, post.version) : null },
    { headers: { "cache-control": "no-store" } },
  );
}

/** POST: queue the post, as last saved, for the site's MyKavo WordPress plugin. */
export async function POST(_request: Request, { params }: Params) {
  const gate = await agentContext({ mutate: true, bucket: "wp-draft", limit: 20 });
  if (!gate.ok) return gate.response;
  const { postId } = await params;
  const post = await ownedPost(postId, gate.ctx.workspace.id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const link = await wordpressLinkFor(post.websiteId);
  if (!link) {
    return NextResponse.json(
      { error: "This website isn't connected to the MyKavo WordPress plugin yet." },
      { status: 409 },
    );
  }
  if (!link.supportsDrafts) {
    return NextResponse.json(
      { error: `Update the MyKavo plugin on your site to version ${WP_DRAFTS_MIN_PLUGIN} or newer to save drafts to WordPress.` },
      { status: 409 },
    );
  }

  const row = await queueWpDraft({
    contentPostId: post.id,
    websiteId: post.websiteId,
    workspaceId: gate.ctx.workspace.id,
    postVersion: post.version,
    userId: gate.ctx.userId,
  });
  return NextResponse.json({ draft: wpDraftView(row, post.version) });
}
