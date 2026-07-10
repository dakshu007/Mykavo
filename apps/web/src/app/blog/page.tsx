import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { prisma } from "@fluxen/database";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { readingTimeMinutes } from "@/components/blog/blocks";

// Dynamic on purpose: a post published from the dashboard must be visible
// immediately, without a redeploy. ISR + revalidatePath is a future optimization.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides and practical notes on website change detection, regression monitoring, SEO health, and keeping client websites working — from the Fluxen team.",
  alternates: { canonical: "/blog" },
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
    <>
      <MarketingNav />
      <main className="mx-auto w-full max-w-300 flex-1 px-5 py-16 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="label-micro mb-3">Blog</p>
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Notes on keeping websites working
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-ink-secondary">
            Change detection, regression monitoring, SEO health, and lessons from
            watching websites break — and fixing them before anyone notices.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center rounded-card bg-card px-6 py-16 text-center shadow-card">
            <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary-soft">
              <PenLine className="size-6 text-primary" aria-hidden />
            </span>
            <h2 className="text-[17px] font-semibold text-ink">No posts yet</h2>
            <p className="mt-1.5 max-w-sm text-sm leading-6 text-ink-secondary">
              We&apos;re writing our first guides on website change monitoring.
              Check back soon — or start monitoring in the meantime.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
            >
              Start Monitoring Free <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="mx-auto grid max-w-3xl gap-5">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="group rounded-card bg-card p-7 shadow-card transition-shadow hover:shadow-float"
              >
                <p className="text-[13px] text-ink-faint">
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
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="transition-colors group-hover:text-primary"
                  >
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt && (
                  <p className="mt-2 text-sm leading-7 text-ink-secondary">{post.excerpt}</p>
                )}
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
                >
                  Read post <ArrowRight className="size-4" aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
      <MarketingFooter />
    </>
  );
}
