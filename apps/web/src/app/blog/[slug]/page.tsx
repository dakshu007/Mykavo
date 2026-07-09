import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@fluxen/database";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { BlogMarkdown } from "@/components/blog/markdown";
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

  const jsonLd = {
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNav />
      <main className="mx-auto w-full max-w-300 flex-1 px-5 py-16 lg:px-8">
        <article className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden /> All posts
          </Link>
          <header className="mb-10 mt-6">
            <p className="text-[13px] text-ink-faint">
              {post.publishedAt && (
                <time dateTime={post.publishedAt.toISOString()}>
                  {dateFormat.format(post.publishedAt)}
                </time>
              )}
              <span aria-hidden> · </span>
              {post.authorName}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-4 text-[17px] leading-8 text-ink-secondary">{post.excerpt}</p>
            )}
          </header>
          <div className="rounded-card bg-card p-7 shadow-card sm:p-10">
            <BlogMarkdown content={post.content} />
          </div>
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
      </main>
      <MarketingFooter />
    </>
  );
}
