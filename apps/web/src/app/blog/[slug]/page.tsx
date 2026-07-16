import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@mykavo/database";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import {
  fontSans,
  fontDisplay,
  primary,
} from "@/components/landing/style";
import { collectFaqItems, parsePost, readingTimeMinutes } from "@/components/blog/blocks";
import { PostContent, PostTocRail } from "@/components/blog/post-content";
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
    <div className={`${fontSans} min-h-svh bg-[#ecf0ff] text-[#0d0c0e] antialiased`}>
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
      <LandingNav />
      <main>
        {/* Hero band on the dark canvas */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-14 pt-32 sm:pt-36 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0d0c0e]/60 transition-colors hover:text-[#0d0c0e]"
          >
            <ArrowLeft className="size-4" aria-hidden /> All posts
          </Link>
          <div className="mx-auto mt-10 max-w-3xl text-center">
            <span
              style={{ backgroundColor: primary }}
              className="inline-flex items-center rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white"
            >
              Blog
            </span>
            <h1
              className={`${fontDisplay} mt-6 text-4xl leading-[1.05] tracking-[-0.01em] text-[#0d0c0e] sm:text-5xl lg:text-6xl`}
            >
              {post.title}
            </h1>
            <p className="mt-6 text-sm text-[#0d0c0e]/60">
              By <span className="font-medium text-[#0d0c0e]">{post.authorName}</span>
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
            <div className="mt-8">
              <Link
                href="/signup"
                className="rounded-full bg-[#0d0c0e] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3556f4]"
              >
                Start free
              </Link>
            </div>
            <p className="mt-3 text-[12px] text-[#0d0c0e]/45">* No credit card required</p>
          </div>
        </section>

        {/* Body: article + optional sticky ToC rail. The article and ToC keep
            theme-token cards (bg-card & friends) so the markdown typography
            stays readable in the visitor's light OR dark app theme — white
            panels on the dark canvas in light mode, stamped-style. */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-20 lg:px-8">
          <div className="flex justify-center gap-10">
            <article className="w-full min-w-0 max-w-3xl">
              <div className="rounded-[28px] bg-card p-7 shadow-[0_20px_50px_rgba(38,54,115,0.12)] sm:p-10">
                <PostContent content={post.content} />
              </div>

              {/* Author bio */}
              <aside className="mt-8 rounded-[28px] bg-card p-7 shadow-[0_20px_50px_rgba(38,54,115,0.12)] sm:p-8">
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
                      Team MyKavo — writing about website monitoring, SEO, and catching
                      regressions before customers do.
                    </p>
                  </div>
                </div>
              </aside>

              {/* End-of-post product CTA — landing style on the dark canvas */}
              <aside
                style={{ borderColor: primary }}
                className="mt-8 rounded-[28px] border-[3px] px-7 py-12 text-center sm:px-10"
              >
                <h2 className={`${fontDisplay} text-3xl leading-tight text-[#0d0c0e] sm:text-4xl`}>
                  Know what changed. <span className="italic">Fix what matters.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#0d0c0e]/60">
                  MyKavo monitors your websites for visual, SEO, link, script, and performance
                  changes — and alerts you before small problems become expensive problems.
                </p>
                <div className="mx-auto mt-7 flex w-fit overflow-hidden rounded-full border border-[#0d0c0e]/15">
                  <Link
                    href="/signup"
                    className="bg-white px-6 py-3.5 text-sm font-semibold text-[#0d0c0e] transition-colors hover:bg-[#3556f4] hover:text-white"
                  >
                    Start monitoring free
                  </Link>
                  <Link
                    href="/blog"
                    className="bg-[#0d0c0e] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#2a2830]"
                  >
                    More posts
                  </Link>
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
      <LandingFooter />
    </div>
  );
}
