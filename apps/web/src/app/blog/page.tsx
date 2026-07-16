import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PenLine, Rss } from "lucide-react";
import { prisma } from "@mykavo/database";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import {
  card,
  eyebrow,
  fontSans,
  fontDisplay,
  gold,
} from "@/components/landing/style";
import { readingTimeMinutes } from "@/components/blog/blocks";

// Dynamic on purpose: a post published from the dashboard must be visible
// immediately, without a redeploy. ISR + revalidatePath is a future optimization.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides and practical notes on website change detection, regression monitoring, SEO health, and keeping client websites working — from the MyKavo team.",
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

export default async function BlogIndexPage() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      authorName: true,
      publishedAt: true,
      content: true,
    },
  });

  return (
    <div className={`${fontSans} min-h-svh bg-[#151515] text-[#E9EBDF] antialiased`}>
      <LandingNav />
      <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>Blog</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.05] tracking-[-0.01em] sm:text-6xl`}>
            Notes on keeping
            <br />
            <span className="italic">websites working.</span>
          </h1>
          <p className="mt-6 text-[15px] leading-7 text-[#9C9E93]">
            Change detection, regression monitoring, SEO health, and lessons from watching
            websites break — and fixing them before anyone notices.
          </p>
          <Link
            href="/blog/feed.xml"
            className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#9C9E93] transition-colors hover:text-[#E9EBDF]"
          >
            <Rss className="size-3.5" aria-hidden /> RSS feed
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className={`${card} mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center`}>
            <PenLine className="mb-4 size-7" style={{ color: gold }} aria-hidden />
            <h2 className={`${fontDisplay} text-2xl text-[#E9EBDF]`}>No posts yet.</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#9C9E93]">
              We&apos;re writing our first guides on website change monitoring. Check back soon —
              or start monitoring in the meantime.
            </p>
            <Link
              href="/signup"
              className="mt-7 rounded-full bg-[#FFD400] px-6 py-3 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
            >
              Start Monitoring Free
            </Link>
          </div>
        ) : (
          <div className="mx-auto grid max-w-3xl gap-4">
            {posts.map((post) => (
              <article
                key={post.slug}
                className={`${card} group p-7 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.07] sm:p-8`}
              >
                <p className="text-[13px] text-[#9C9E93]">
                  {post.publishedAt && (
                    <time dateTime={post.publishedAt.toISOString()}>
                      {dateFormat.format(post.publishedAt)}
                    </time>
                  )}
                  <span aria-hidden> · </span>
                  {post.authorName}
                  <span aria-hidden> · </span>
                  {readingTimeMinutes(post.content)} min read
                </p>
                <h2 className={`${fontDisplay} mt-3 text-[28px] leading-tight text-[#E9EBDF]`}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="transition-colors group-hover:text-[#FFD400]"
                  >
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt && (
                  <p className="mt-3 text-sm leading-7 text-[#9C9E93]">{post.excerpt}</p>
                )}
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-[#E9EBDF]"
                  style={{ color: gold }}
                >
                  Read post{" "}
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
