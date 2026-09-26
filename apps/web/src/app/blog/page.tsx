import { livePostWhere } from "@/lib/blog-schedule";
import type { Metadata } from "next";
import Link from "next/link";
import { BlogCta } from "@/components/blog/blog-cta";
import { PenLine, Rss } from "lucide-react";
import { prisma } from "@mykavo/database";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { card, eyebrow, fontSans, fontDisplay } from "@/components/landing/style";
import { readingTimeMinutes } from "@/components/blog/blocks";
import { BlogIndexList, type BlogTopic } from "@/components/blog/blog-index-list";
import { authorFor } from "@/config/authors";
import { displayTags } from "@/lib/blog-display";
import { blogIndexGraph, breadcrumbList, jsonLdScript } from "@/lib/seo/structured-data";

// Dynamic on purpose: a post published from the dashboard must be visible
// immediately, without a redeploy. ISR + revalidatePath is a future optimization.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides and practical notes on website change detection, regression monitoring, SEO health, and keeping client websites working - from the MyKavo team.",
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "/blog/feed.xml" },
  },
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/**
 * The topics worth offering as filters: every displayable tag, grouped
 * case-insensitively (first spelling wins), most-used first. A topic with a
 * single post is still a topic once there are few of them; the list is
 * capped so the row stays one glance long.
 */
function topicsOf(posts: readonly { tags: readonly string[] }[]): BlogTopic[] {
  const byKey = new Map<string, BlogTopic>();
  for (const post of posts) {
    for (const tag of displayTags(post.tags)) {
      const key = tag.toLowerCase();
      const hit = byKey.get(key);
      if (hit) hit.count += 1;
      else byKey.set(key, { label: tag, count: 1 });
    }
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 7);
}

type Props = { searchParams: Promise<{ topic?: string }> };

export default async function BlogIndexPage({ searchParams }: Props) {
  const { topic: topicParam } = await searchParams;
  const posts = await prisma.blogPost.findMany({
    where: livePostWhere(),
    orderBy: { publishedAt: "desc" },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      authorName: true,
      publishedAt: true,
      content: true,
      tags: true,
    },
  });

  // Serialized for the client list - dates preformatted so SSR and the
  // visitor's browser render the same label regardless of timezone.
  const indexPosts = posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    authorName: authorFor(post.authorName)?.name ?? post.authorName,
    publishedAtIso: post.publishedAt?.toISOString() ?? null,
    publishedAtLabel: post.publishedAt ? dateFormat.format(post.publishedAt) : null,
    readMinutes: readingTimeMinutes(post.content),
    tags: displayTags(post.tags),
  }));
  const topics = topicsOf(posts);
  // /blog?topic=WordPress opens filtered - only for a topic that exists.
  const initialTopic =
    topics.find((t) => topicParam && t.label.toLowerCase() === topicParam.toLowerCase())?.label ?? null;

  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      {/* Blog + ItemList: answer engines get the whole post inventory from one
          fetch instead of having to crawl every card to discover it. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(blogIndexGraph(posts)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "Blog", path: "/blog" }])),
        }}
      />
      <LandingNav />
      <main className="mx-auto w-full max-w-[1440px] px-5 pb-24 pt-28 sm:pt-32 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// blog //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.05] tracking-[-0.01em] sm:text-[56px]`}>
            Notes on keeping{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span aria-hidden className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]" />
              <span className="relative">websites working.</span>
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-[#6B6B60]">
            Practical guides on change detection, WordPress and deploy regressions, and SEO
            health - from watching websites break, and catching it before anyone notices.
          </p>
          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] text-[#6B6B60]">
            <span>
              {posts.length} {posts.length === 1 ? "guide" : "guides"}
            </span>
            <span aria-hidden>·</span>
            <Link
              href="/blog/feed.xml"
              className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-[#151515]"
            >
              <Rss className="size-3.5" aria-hidden /> RSS feed
            </Link>
          </p>
        </div>

        {posts.length === 0 ? (
          <div className={`${card} mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center shadow-[5px_5px_0_#FFD400]`}>
            <PenLine className="mb-4 size-7 text-[#151515]" aria-hidden />
            <h2 className={`${fontDisplay} text-2xl text-[#151515]`}>No posts yet.</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#6B6B60]">
              We&apos;re writing our first guides on website change monitoring. Check back soon -
              or start monitoring in the meantime.
            </p>
            <Link
              href="/signup"
              className="mt-7 rounded-full border border-[#151515] bg-[#FFD400] px-6 py-3 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-colors hover:bg-[#ffe14d]"
            >
              Start Monitoring Free
            </Link>
          </div>
        ) : (
          <BlogIndexList posts={indexPosts} topics={topics} initialTopic={initialTopic} />
        )}
        <div className="mx-auto mt-16 max-w-5xl">
          <BlogCta showMorePosts={false} />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
