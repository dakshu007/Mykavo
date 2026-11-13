import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@mykavo/database";
import { FREE_REGENERATIONS_PER_POST } from "@mykavo/keyword-agent/pure";
import { PostEditor } from "@/components/keywords/post-editor";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { canUseKeywordAgent } from "@/lib/keywords/access";

export const metadata: Metadata = { title: "Edit post - MyKavo", robots: { index: false } };

type Params = { params: Promise<{ websiteId: string; postId: string }> };

function asFaq(value: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((f) =>
    f && typeof f === "object" && typeof (f as { question?: unknown }).question === "string" && typeof (f as { answer?: unknown }).answer === "string"
      ? [{ question: (f as { question: string }).question, answer: (f as { answer: string }).answer }]
      : [],
  );
}

/** The post editor. Loads exactly one post, scoped to the caller's workspace. */
export default async function PostEditorPage({ params }: Params) {
  const session = await requireSession();
  if (!(await canUseKeywordAgent(session.user))) notFound();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { websiteId, postId } = await params;

  const post = await prisma.contentPost.findFirst({
    where: { id: postId, websiteId, workspaceId: workspace.id },
    select: {
      id: true,
      keyword: true,
      title: true,
      slug: true,
      metaDescription: true,
      bodyHtml: true,
      faq: true,
      jsonLd: true,
      reviewNotes: true,
      status: true,
      version: true,
      regenerationsUsed: true,
      website: { select: { id: true, name: true, url: true } },
    },
  });
  if (!post) notFound();

  const rewriting = await prisma.aiJob.findFirst({
    where: { websiteId, kind: "write", status: { in: ["queued", "running"] }, input: { path: ["postId"], equals: post.id } },
    select: { id: true, status: true, step: true, progress: true, error: true },
  });

  return (
    <div className="max-w-5xl space-y-5">
      <Link href={`/dashboard/keywords/${websiteId}`} className="inline-flex items-center gap-1 text-[13px] text-ink-secondary hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> {post.website.name}
      </Link>
      <PostEditor
        websiteId={websiteId}
        post={{
          id: post.id,
          keyword: post.keyword,
          title: post.title,
          slug: post.slug,
          metaDescription: post.metaDescription,
          bodyHtml: post.bodyHtml,
          faq: asFaq(post.faq),
          jsonLd: Array.isArray(post.jsonLd) ? (post.jsonLd as Record<string, unknown>[]) : [],
          reviewNotes: Array.isArray(post.reviewNotes) ? post.reviewNotes.filter((n): n is string => typeof n === "string") : [],
          status: post.status,
          version: post.version,
        }}
        rewritesLeft={Math.max(0, FREE_REGENERATIONS_PER_POST - post.regenerationsUsed)}
        rewriting={rewriting}
      />
    </div>
  );
}
