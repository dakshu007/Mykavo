import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BlogCta } from "@/components/blog/blog-cta";
import { GoogleButton } from "@/components/landing/google-cta";
import { ShareButtons } from "@/components/blog/share-buttons";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { PostTool } from "@/components/blog/post-tool";
import { authorFor } from "@/config/authors";
import { displayTags, showUpdated } from "@/lib/blog-display";
import { toolForPost } from "@/lib/blog-tools";
import { AnswerCapsule } from "@/components/landing/answer-capsule";
import { SummarizeWithAi } from "@/components/blog/summarize-with-ai";
import { livePostWhere } from "@/lib/blog-schedule";
import { prisma } from "@mykavo/database";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { fontSans, fontDisplay, gold } from "@/components/landing/style";
import { collectFaqItems, parsePost, readingTimeMinutes } from "@/components/blog/blocks";
import { PostContent, PostTocRail } from "@/components/blog/post-content";
import { site } from "@/config/site";
import { ORGANIZATION_ID, breadcrumbList, jsonLdScript } from "@/lib/seo/structured-data";

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
          where: { ...livePostWhere(), id: { not: post.id }, tags: { hasSome: post.tags } },
          select,
          orderBy: { publishedAt: "desc" },
          take: 3,
        })
      : [];
  if (tagged.length >= 3) return tagged;
  const recent = await prisma.blogPost.findMany({
    where: { ...livePostWhere(), id: { notIn: [post.id, ...tagged.map((p) => p.id)] } },
    select,
    orderBy: { publishedAt: "desc" },
    take: 3 - tagged.length,
  });
  return [...tagged, ...recent];
}

/** Only live posts are visible publicly - drafts and scheduled posts 404. */
async function getPublishedPost(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, ...livePostWhere() },
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
  const author = authorFor(post.authorName);
  const authorName = author?.name ?? post.authorName;
  const authorInitial = authorName.trim().charAt(0).toUpperCase() || "M";
  const tags = displayTags(post.tags);
  const updated = showUpdated(post.publishedAt, post.updatedAt);
  const tool = toolForPost(post);
  const postUrl = `${site.url}/blog/${post.slug}`;
  const shareImage = `${postUrl}/opengraph-image`;

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
    ...(post.excerpt ? { abstract: post.excerpt } : {}),
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    // A real, verifiable person where there is one (E-E-A-T); the
    // organisation for team posts - never a Person named "MyKavo Team".
    author: author
      ? {
          "@type": "Person",
          name: author.name,
          jobTitle: author.role,
          url: author.url,
          worksFor: { "@id": ORGANIZATION_ID },
          ...(author.image ? { image: author.image.startsWith("http") ? author.image : `${site.url}${author.image}` } : {}),
          ...(author.sameAs.length > 0 ? { sameAs: author.sameAs } : {}),
        }
      : { "@type": "Organization", "@id": ORGANIZATION_ID, name: site.name, url: site.url },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
      logo: { "@type": "ImageObject", url: `${site.url}/icon.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${site.url}/blog/${post.slug}` },
    url: `${site.url}/blog/${post.slug}`,
    image: [shareImage],
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
      <ReadingProgress />
      <main>
        {/* Hero band on the warm paper canvas */}
        <section className="mx-auto w-full max-w-[1440px] px-5 pb-10 pt-28 sm:pt-32 lg:px-8">
          {/* Back to the index. The arrow slides out left and a fresh one
              slides in from the right on hover - CSS only, still a plain link,
              and motion-reduce keeps it static. */}
          <Link
            href="/blog"
            className="group inline-flex items-center gap-2.5 rounded-full border border-[#151515]/15 bg-white/80 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-[#151515] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#151515] hover:shadow-[3px_3px_0_#151515] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151515] active:translate-y-0 active:shadow-[1px_1px_0_#151515] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="relative flex size-8 items-center justify-center overflow-hidden rounded-full bg-[#151515] text-[#FFD400] transition-colors duration-200 group-hover:bg-[#FFD400] group-hover:text-[#151515]">
              <ArrowLeft
                className="size-4 transition-transform duration-300 ease-out group-hover:-translate-x-[180%] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                aria-hidden
              />
              <ArrowLeft
                className="absolute size-4 translate-x-[180%] transition-transform duration-300 ease-out group-hover:translate-x-0 motion-reduce:hidden"
                aria-hidden
              />
            </span>
            All posts
          </Link>
          <div className="mx-auto mt-6 max-w-3xl text-center">
            <span
              style={{ backgroundColor: gold }}
              className="inline-flex items-center rounded-full border border-black/15 px-3 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#151515]"
            >
              Blog
            </span>
            <h1
              className={`${fontDisplay} mt-4 text-[34px] leading-[1.08] tracking-[-0.01em] text-[#151515] sm:text-5xl lg:text-[54px]`}
            >
              {post.title}
            </h1>
            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm text-[#6B6B60]">
              <span
                aria-hidden
                className="mr-1 flex size-7 items-center justify-center rounded-full border border-[#151515] bg-[#FFD400] text-[12px] font-bold text-[#151515]"
              >
                {authorInitial}
              </span>
              By{" "}
              <a href="#author" className="font-medium text-[#151515] underline-offset-4 hover:underline">
                {authorName}
              </a>
              {post.publishedAt && (
                <>
                  <span aria-hidden>·</span>
                  <time dateTime={post.publishedAt.toISOString()}>
                    {dateFormat.format(post.publishedAt)}
                  </time>
                </>
              )}
              {updated && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    Updated{" "}
                    <time dateTime={post.updatedAt.toISOString()}>{dateFormat.format(post.updatedAt)}</time>
                  </span>
                </>
              )}
              <span aria-hidden>·</span>
              {readMinutes} min read
            </p>
            {tags.length > 0 && (
              <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
                {tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-[#151515]/15 bg-[#FFD400]/25 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#151515]"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <GoogleButton size="md" />
              <span className="text-[12.5px] text-[#6B6B60]">Free plan · No credit card required</span>
            </div>
          </div>
        </section>

        {/* Body: article + optional sticky ToC rail. The article and ToC keep
            theme-token cards (bg-card & friends) so the markdown typography
            stays readable in the visitor's light OR dark app theme. */}
        <section className="blog-reader mx-auto w-full max-w-[1440px] px-5 pb-20 lg:px-8">
          <div className="flex justify-center gap-10">
            <article className="w-full min-w-0 max-w-5xl">
              {/* The post's answer, stated up front - the excerpt, written as
                  a self-contained answer, is what AI answers and readers in
                  a hurry both want first. */}
              {post.excerpt && <AnswerCapsule answer={post.excerpt} className="mb-8" />}
              <SummarizeWithAi url={`${site.url}/blog/${post.slug}`} />
              <div
                data-post-body
                className="rounded-[28px] bg-card p-7 shadow-[0_20px_50px_rgba(38,54,115,0.12)] sm:p-10"
              >
                <PostContent content={post.content} />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-[#151515]">Share this post</span>
                <ShareButtons url={postUrl} title={post.title} />
              </div>

              {tool && <PostTool tool={tool} />}

              {/* Author bio */}
              <aside
                id="author"
                aria-label="About the author"
                className="mt-8 scroll-mt-28 rounded-[28px] bg-card p-7 shadow-[0_20px_50px_rgba(38,54,115,0.12)] sm:p-8"
              >
                <div className="flex items-start gap-4">
                  {author?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a small, fixed-size avatar
                    <img
                      src={author.image}
                      alt=""
                      width={56}
                      height={56}
                      className="size-14 shrink-0 rounded-full border-2 border-[#151515] object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-[#151515] bg-[#FFD400] text-xl font-bold text-[#151515]"
                    >
                      {authorInitial}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="label-micro">Written by</p>
                    <p className="mt-0.5 text-[16px] font-semibold text-ink">{authorName}</p>
                    {author && <p className="text-sm text-ink-secondary">{author.role}</p>}
                    <p className="mt-2 text-sm leading-6 text-ink-secondary">
                      {author
                        ? author.bio
                        : "Team MyKavo - writing about website monitoring, SEO, and catching regressions before customers do."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
                      <Link href="/about" className="text-ink underline decoration-[#FFD400] decoration-2 underline-offset-4">
                        About MyKavo
                      </Link>
                      {author?.sameAs.map((href) => (
                        <a
                          key={href}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer me"
                          className="text-ink underline decoration-[#FFD400] decoration-2 underline-offset-4"
                        >
                          {href.includes("linkedin.com") ? "LinkedIn" : href.includes("x.com") || href.includes("twitter.com") ? "X" : href.includes("github.com") ? "GitHub" : "Profile"}
                        </a>
                      ))}
                    </div>
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

            <aside className="hidden w-72 shrink-0 lg:block">
              <div className="sticky top-24 space-y-4">
                {showTocRail && <PostTocRail headings={headings} sticky={false} />}
                {/* Signup stays in reach for the whole read, not just at the top. */}
                <div className="rounded-card border-2 border-[#151515] bg-white p-5 text-[#151515] shadow-[5px_5px_0_#FFD400]">
                  <p className="text-[15px] font-semibold leading-snug">Catch this on your own site</p>
                  <p className="mt-1.5 text-[13px] leading-5 text-[#6B6B60]">
                    MyKavo watches your pages and tells you when something important changes or breaks.
                  </p>
                  <GoogleButton size="md" className="mt-4 w-full" />
                  <Link
                    href="/signup"
                    className="mt-2.5 block text-center text-[12.5px] text-[#6B6B60] underline underline-offset-4 hover:text-[#151515]"
                  >
                    or sign up with email
                  </Link>
                </div>
                <div className="rounded-card bg-card p-5 shadow-card">
                  <p className="label-micro mb-3">Share this post</p>
                  <ShareButtons url={postUrl} title={post.title} compact />
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
