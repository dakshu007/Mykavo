import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { prisma } from "@mykavo/database";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { fontDisplay, fontSans } from "@/components/landing/style";
import { AuthorBox } from "@/components/blog/author-box";
import { BlogCta } from "@/components/blog/blog-cta";
import { authorView } from "@/lib/blog-authors";
import { livePostWhere } from "@/lib/blog-schedule";
import { ORGANIZATION_ID, breadcrumbList, jsonLdScript } from "@/lib/seo/structured-data";

/**
 * An author's page: who they are and everything they have written. The
 * page Google's author guidance and AI answer engines look for - a stable
 * URL that the posts' Person markup points at.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const dateFormat = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" });

async function load(slug: string) {
  try {
    const author = await prisma.blogAuthor.findUnique({ where: { slug } });
    if (!author) return null;
    const posts = await prisma.blogPost.findMany({
      where: { ...livePostWhere(), authorName: { equals: author.name, mode: "insensitive" } },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true, excerpt: true, publishedAt: true },
    });
    return { author, view: authorView(author), posts };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return {};
  const { view } = data;
  return {
    title: `${view.name}${view.role ? `, ${view.role}` : ""}`,
    description: view.bio ?? `Posts by ${view.name} on the MyKavo blog.`,
    alternates: { canonical: `/blog/author/${slug}` },
    openGraph: { type: "profile", title: view.name, url: view.url, ...(view.image ? { images: [view.image] } : {}) },
  };
}

export default async function BlogAuthorPage({ params }: Params) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { view, posts } = data;

  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: view.url,
    mainEntity: {
      "@type": "Person",
      name: view.name,
      ...(view.role ? { jobTitle: view.role } : {}),
      ...(view.bio ? { description: view.bio } : {}),
      ...(view.image ? { image: view.image } : {}),
      url: view.url,
      worksFor: { "@id": ORGANIZATION_ID },
      ...(view.links.length > 0 ? { sameAs: view.links.map((l) => l.href) } : {}),
    },
  };

  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(profileJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbList([
              { name: "Blog", path: "/blog" },
              { name: view.name, path: `/blog/author/${slug}` },
            ]),
          ),
        }}
      />
      <LandingNav />
      <main className="mx-auto w-full max-w-4xl px-5 pb-24 pt-28 sm:pt-32 lg:px-8">
        <Link href="/blog" className="text-sm font-semibold text-[#6B6B60] hover:text-[#151515]">
          ← All posts
        </Link>
        <section className="blog-reader mt-6 rounded-[28px] bg-card p-7 shadow-[0_20px_50px_rgba(38,54,115,0.12)] sm:p-9">
          <AuthorBox author={view} showPageLink={false} />
        </section>

        <h1 className={`${fontDisplay} mt-12 text-3xl sm:text-4xl`}>
          {posts.length > 0 ? `Posts by ${view.name}` : `${view.name} has not published a post yet`}
        </h1>
        <ul className="mt-6 grid gap-4">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="group block rounded-2xl border border-[#151515]/15 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-[#151515] hover:shadow-[5px_5px_0_#151515] motion-reduce:hover:translate-y-0"
              >
                {p.publishedAt && (
                  <time dateTime={p.publishedAt.toISOString()} className="text-[12.5px] text-[#6B6B60]">
                    {dateFormat.format(p.publishedAt)}
                  </time>
                )}
                <span className="mt-1 block text-xl font-semibold leading-snug">{p.title}</span>
                {p.excerpt && <span className="mt-2 line-clamp-2 block text-[14px] leading-6 text-[#6B6B60]">{p.excerpt}</span>}
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold">
                  Read <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-14">
          <BlogCta showMorePosts={false} />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

