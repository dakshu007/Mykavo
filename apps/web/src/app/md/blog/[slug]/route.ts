/**
 * /blog/<slug>.md (rewritten here in next.config.ts): a blog post as plain
 * Markdown for AI assistants and agents (see lib/seo/post-markdown). The
 * HTML page stays the canonical: the Link header says so, so search engines
 * never treat this as a duplicate.
 *
 * Cached at the CDN for 10 minutes, so a crawler pass over every post costs
 * one database read per post per 10 minutes at most.
 */

import { prisma } from "@mykavo/database";
import { site } from "@/config/site";
import { livePostWhere } from "@/lib/blog-schedule";
import { postToMarkdown } from "@/lib/seo/post-markdown";

export const dynamic = "force-dynamic";

const SLUG = /^[a-z0-9-]{1,200}$/;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  if (!SLUG.test(slug)) return new Response("Not found\n", { status: 404 });
  const post = await prisma.blogPost.findFirst({
    where: { slug, ...livePostWhere() },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      keyTakeaways: true,
      content: true,
      authorName: true,
      publishedAt: true,
      updatedAt: true,
    },
  });
  if (!post) {
    return new Response("Not found\n", { status: 404, headers: { "cache-control": "no-store" } });
  }
  return new Response(postToMarkdown(post, site.url), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=600",
      link: `<${site.url}/blog/${post.slug}>; rel="canonical"`,
    },
  });
}
