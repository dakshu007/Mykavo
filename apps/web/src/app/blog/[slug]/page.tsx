import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BlogCta } from "@/components/blog/blog-cta";
import { prisma } from "@mykavo/database";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { fontSans, fontDisplay, gold } from "@/components/landing/style";
import { collectFaqItems, parsePost, readingTimeMinutes } from "@/components/blog/blocks";
import { PostContent, PostTocRail } from "@/components/blog/post-content";
import { site } from "@/config/site";
import { breadcrumbList, jsonLdScript } from "@/lib/seo/structured-data";

// Dynamic on purpose: publishing from the dashboard must be visible
// immediately, without a redeploy. ISR + revalidatePath is a future optimization.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/**
 * Up to three other published posts for "Keep reading": posts sharing a tag
 * first, then the most recent. Internal links between posts help readers
 * and crawlers alike find the rest of the blog.
 */
async function getRelatedPosts(post: { id: string; tags: string[] }) {
  const select = { id: true, slug: true, title: true, excerpt: true } as const;
  const tagged =
    post.tags.length > 0
      ? await prisma.blogPost.findMany({
          where: { status: "PUBLISHED", id: { not: post.id }, tags: { hasSome: post.tags } },
          select,
          orderBy: { publishedAt: "desc" },
          take: 3,
        })
      : [];
  if (tagged.length >= 3) return tagged;
  const recent = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", id: { notIn: [post.id, ...tagged.map((p) => p.id)] } },
    select,
    orderBy: { publishedAt: "desc" },
    take: 3 - tagged.length,
  });
  return [...tagged, ...recent];
}

/** Only published posts are visible publicly - drafts 404. */
async function getPublishedPost(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
  });
}

/**
 * Escape "<" so post-authored text (e.g. "</script>") can't terminate the
 * script element - JSON.stringify alone does not prevent this.
 */
// Escaping now lives in lib/seo/structured-data alongside the schema builders.

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};

  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt ?? undefined;
  const keywords = [post.primaryKeyword, post.secondaryKeyword, ...post.tags].filter(
    (keyword): keyword is string => Boolean(keyword),
  );
  return {
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
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

  const related = await getRelatedPosts(post).catch(() => []);
  const { segments, headings } = parsePost(post.content);
  const faqItems = collectFaqItems(segments);
  const readMinutes = readingTimeMinutes(post.content);
  const showTocRail = headings.length >= 2;
  const authorInitial = post.authorName.trim().charAt(0).toUpperCase() || "F";

  const jsonLdKeywords = [post.primaryKeyword, post.secondaryKeyword, ...post.tags]
    .filter((keyword): keyword is string => Boolean(keyword))
    .join(", ");
  // Every published post gets the full treatment automatically - nothing here
  // is per-post configuration. wordCount and timeRequired tell answer engines
  // this is substantive rather than thin content; `image` is required for
  // Google's article rich results and falls back to the site OG image so a
  // post is never disqualified for lacking one; articleSection carries the
  // post's own tags; isAccessibleForFree tells crawlers there is no paywall.
  const wordCount = post.content.trim().split(/\s+/).filter(Boolean).length;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription ?? post.excerpt ?? undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.authorName },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
      logo: { "@type": "ImageObject", url: `${site.url}/icon.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${site.url}/blog/${post.slug}` },
    url: `${site.url}/blog/${post.slug}`,
    image: [`${site.url}/opengraph-image.png`],
    inLanguage: "en",
    isAccessibleForFree: true,
    wordCount,
    timeRequired: `PT${Math.max(1, readMinutes)}M`,
    isPartOf: { "@type": "Blog", "@id": `${site.url}/blog#blog` },
    ...(post.tags.length > 0 ? { articleSection: post.tags } : {}),
    ...(jsonLdKeywords ? { keywords: jsonLdKeywords } : {}),
  };

  const breadcrumbJsonLd = breadcrumbList([
    { name: "Blog", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ]);

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
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }}
      />
      <LandingNav />
      <main>
        {/* Hero band on the warm paper canvas */}
        <section className="mx-auto w-full max-w-[1440px] px-5 pb-14 pt-32 sm:pt-36 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6B6B60] transition-colors hover:text-[#151515]"
          >
            <ArrowLeft className="size-4" aria-hidden /> All posts
          </Link>
          <div className="mx-auto mt-10 max-w-3xl text-center">
            <span
              style={{ backgroundColor: gold }}
              className="inline-flex items-center rounded-full border border-black/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#151515]"
            >
              Blog
            </span>
            <h1
              className={`${fontDisplay} mt-6 text-4xl leading-[1.05] tracking-[-0.01em] text-[#151515] sm:text-5xl lg:text-6xl`}
            >
              {post.title}
            </h1>
            <p className="mt-6 text-sm text-[#6B6B60]">
              By <span className="font-medium text-[#151515]">{post.authorName}</span>
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
            {post.tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap justify-center gap-1.5">
                {post.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-[#151515]/15 bg-[#FFD400]/25 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#151515]"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-8">
              <Link
                href="/signup"
                className="rounded-full border border-[#151515] bg-[#FFD400] px-6 py-3 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-colors hover:bg-[#ffe14d]"
              >
                Start free
              </Link>
            </div>
            <p className="mt-3 text-[12px] text-[#6B6B60]">* No credit card required</p>
          </div>
        </section>

        {/* Body: article + optional sticky ToC rail. The article and ToC keep
            theme-token cards (bg-card & friends) so the markdown typography
            stays readable in the visitor's light OR dark app theme. */}
        <section className="blog-reader mx-auto w-full max-w-[1440px] px-5 pb-20 lg:px-8">
          <div className="flex justify-center gap-10">
            <article className="w-full min-w-0 max-w-5xl">
              <div className="rounded-[28px] bg-card p-7 shadow-[0_20px_50px_rgba(38,54,115,0.12)] sm:p-10">
                <PostContent content={post.content} />
              </div>

              {/* Author bio */}
              <aside className="mt-8 rounded-[28px] bg-card p-7 shadow-[0_20px_50px_rgba(38,54,115,0.12)] sm:p-8">
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden
                    className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold text-accent"
                  >
                    {authorInitial}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ink">{post.authorName}</p>
                    <p className="mt-0.5 text-sm leading-6 text-ink-secondary">
                      Team MyKavo - writing about website monitoring, SEO, and catching
                      regressions before customers do.
                    </p>
                  </div>
                </div>
              </aside>

              {related.length > 0 && (
                <nav aria-label="Keep reading" className="mt-8">
                  <h2 className={`${fontDisplay} text-2xl text-[#151515]`}>Keep reading</h2>
                  <ul className="mt-4 grid gap-4 sm:grid-cols-3">
                    {related.map((r) => (
                      <li key={r.slug}>
                        <Link
                          href={`/blog/${r.slug}`}
                          className="flex h-full flex-col rounded-2xl border border-black/10 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#151515] hover:shadow-[4px_4px_0_#FFD400]"
                        >
                          <span className="text-[15px] font-semibold leading-snug text-[#151515]">{r.title}</span>
                          {r.excerpt && (
                            <span className="mt-2 line-clamp-3 text-[13.5px] leading-6 text-[#6B6B60]">{r.excerpt}</span>
                          )}
                          <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-[#151515]">
                            Read <ArrowRight className="size-3.5" aria-hidden />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              {/* End-of-post product CTA - see components/blog/blog-cta.tsx. */}
              <BlogCta />
            </article>

            {showTocRail && (
              <aside className="hidden w-72 shrink-0 lg:block">
                <PostTocRail headings={headings} />
              </aside>
            )}
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
