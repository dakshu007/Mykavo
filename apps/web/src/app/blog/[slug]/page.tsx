import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@fluxen/database";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { collectFaqItems, parsePost, readingTimeMinutes } from "@/components/blog/blocks";
import { PostContent, PostTocRail } from "@/components/blog/post-content";
import { ButtonLink } from "@/components/ui/button";
import { site } from "@/config/site";

// Dynamic on purpose: publishing from the dashboard must be visible
// immediately, without a redeploy. ISR + revalidatePath is a future optimization.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/** Only published posts are visible publicly — drafts 404. */
async function getPublishedPost(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
  });
}

/**
 * Escape "<" so post-authored text (e.g. "</script>") can't terminate the
 * script element — JSON.stringify alone does not prevent this.
 */
function jsonLdScript(payload: object): string {
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};

  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `${site.url}/blog/${post.slug}`,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
  };
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const { segments, headings } = parsePost(post.content);
  const faqItems = collectFaqItems(segments);
  const readMinutes = readingTimeMinutes(post.content);
  const showTocRail = headings.length >= 2;
  const authorInitial = post.authorName.trim().charAt(0).toUpperCase() || "F";

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription ?? post.excerpt ?? undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.authorName },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
    mainEntityOfPage: `${site.url}/blog/${post.slug}`,
  };

  const faqJsonLd =
    faqItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd) }}
        />
      )}
      <MarketingNav />
      <main className="flex-1">
        {/* Hero band */}
        <section className="border-b border-line/60 bg-primary-soft/40">
          <div className="mx-auto w-full max-w-300 px-5 pb-14 pt-10 lg:px-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
            >
              <ArrowLeft className="size-4" aria-hidden /> All posts
            </Link>
            <div className="mx-auto mt-8 max-w-3xl text-center">
              <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                Blog
              </span>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                {post.title}
              </h1>
              <p className="mt-5 text-sm text-ink-secondary">
                By <span className="font-medium text-ink">{post.authorName}</span>
                {post.publishedAt && (
                  <>
                    <span aria-hidden> · </span>
                    <time dateTime={post.publishedAt.toISOString()}>
                      {dateFormat.format(post.publishedAt)}
                    </time>
                  </>
                )}
                <span aria-hidden> · </span>
                {readMinutes} min read
              </p>
              <div className="mt-7">
                <ButtonLink href="/signup">Start free</ButtonLink>
              </div>
              <p className="mt-2.5 text-[12px] text-ink-faint">* No credit card required</p>
            </div>
          </div>
        </section>

        {/* Body: article + optional sticky ToC rail */}
        <section className="mx-auto w-full max-w-300 px-5 py-12 lg:px-8">
          <div className="flex justify-center gap-10">
            <article className="w-full min-w-0 max-w-3xl">
              <div className="rounded-card bg-card p-7 shadow-card sm:p-10">
                <PostContent content={post.content} />
              </div>

              {/* Author bio */}
              <aside className="mt-10 rounded-card bg-card p-7 shadow-card sm:p-8">
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden
                    className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold text-primary"
                  >
                    {authorInitial}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ink">{post.authorName}</p>
                    <p className="mt-0.5 text-sm leading-6 text-ink-secondary">
                      Team Fluxen — writing about website monitoring, SEO, and
                      catching regressions before customers do.
                    </p>
                  </div>
                </div>
              </aside>

              {/* End-of-post product CTA */}
              <aside className="mt-10 rounded-card bg-card p-7 text-center shadow-card sm:p-10">
                <h2 className="text-xl font-semibold tracking-tight text-ink">
                  Know what changed. Fix what matters.
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-secondary">
                  Fluxen monitors your websites for visual, SEO, link, script, and
                  performance changes — and alerts you before small problems become
                  expensive problems.
                </p>
                <div className="mt-5">
                  <ButtonLink href="/signup">Start Monitoring Free</ButtonLink>
                </div>
              </aside>
            </article>

            {showTocRail && (
              <aside className="hidden w-72 shrink-0 lg:block">
                <PostTocRail headings={headings} />
              </aside>
            )}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
