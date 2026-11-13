import { prisma } from "@mykavo/database";
import { logger } from "./logger";
import { REPO_POSTS, type RepoPost } from "./content/repo-posts";

/**
 * Blog posts that ship with the code, for when the database can't be written
 * to directly. On start, the worker inserts any of them whose slug is not in
 * the blog yet, as PUBLISHED with its own publish date: a future date makes
 * it a scheduled post that goes live on its own (apps/web/src/lib/blog-schedule.ts).
 *
 * Insert only, never update: once a post exists, edits made in the blog
 * admin are kept. Each post is only inserted until `seedUntil`, so a post
 * deleted in the admin afterwards is not brought back by a later restart.
 */
export async function seedRepoPosts(posts: readonly RepoPost[] = REPO_POSTS, now: Date = new Date()): Promise<number> {
  const due = posts.filter((p) => new Date(p.seedUntil) > now);
  if (due.length === 0) return 0;
  const existing = await prisma.blogPost.findMany({
    where: { slug: { in: due.map((p) => p.slug) } },
    select: { slug: true, publishedAt: true },
  });

  // A changed publish date in the code moves a post that still has a date
  // it was shipped with. Compare-and-set: a date changed by hand in the
  // blog admin no longer matches, so it is never overwritten.
  let moved = 0;
  for (const row of existing) {
    const post = due.find((p) => p.slug === row.slug);
    const current = row.publishedAt?.getTime();
    if (!post?.movedFrom?.length || current === undefined) continue;
    const from = post.movedFrom.map((d) => new Date(d));
    if (!from.some((d) => d.getTime() === current)) continue;
    const { count } = await prisma.blogPost.updateMany({
      where: { slug: post.slug, publishedAt: { in: from } },
      data: { publishedAt: new Date(post.publishedAt) },
    });
    moved += count;
  }
  if (moved > 0) logger.info("repo blog posts moved to their new publish date", { count: moved });

  const have = new Set(existing.map((p) => p.slug));
  const missing = due.filter((p) => !have.has(p.slug));
  if (missing.length === 0) return 0;
  const { count } = await prisma.blogPost.createMany({
    data: missing.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      status: "PUBLISHED" as const,
      publishedAt: new Date(p.publishedAt),
      authorName: p.authorName,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      primaryKeyword: p.primaryKeyword,
      secondaryKeyword: p.secondaryKeyword,
      tags: p.tags,
      keyTakeaways: p.keyTakeaways,
    })),
    skipDuplicates: true,
  });
  logger.info("repo blog posts inserted", { count, slugs: missing.map((p) => p.slug).join(",") });
  return count;
}
