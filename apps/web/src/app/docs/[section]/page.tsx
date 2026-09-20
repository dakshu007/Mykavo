import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { SeoPageCta } from "@/components/landing/seo-page";
import { breadcrumbList, jsonLdScript } from "@/lib/seo/structured-data";
import { DOCS_UPDATED, DOC_SECTIONS, findDocSection } from "@/config/docs";

type Params = { params: Promise<{ section: string }> };

export function generateStaticParams() {
  return DOC_SECTIONS.map((section) => ({ section: section.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { section } = await params;
  const found = findDocSection(section);
  if (!found) return {};
  return {
    title: `${found.title} - MyKavo Docs`,
    description: found.description,
    alternates: { canonical: `/docs/${section}` },
  };
}

export default async function Page({ params }: Params) {
  const { section } = await params;
  const found = findDocSection(section);
  if (!found) notFound();

  return (
    <MarketingPageShell
      eyebrowText="docs"
      title={found.title}
      intro={found.description}
      updated={DOCS_UPDATED}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbList([
              { name: "Docs", path: "/docs" },
              { name: found.title, path: `/docs/${found.slug}` },
            ]),
          ),
        }}
      />

      <div className="not-prose my-8 grid gap-4">
        {found.articles.map((article) => (
          <Link
            key={article.slug}
            href={`/docs/${found.slug}/${article.slug}`}
            className="group rounded-2xl border border-black/15 bg-white px-6 py-5 no-underline transition-shadow hover:shadow-[4px_4px_0_#151515]"
          >
            <p className="text-[17px] font-semibold leading-snug text-[#151515]">
              {article.title}
            </p>
            <p className="mt-2 text-[14.5px] leading-6 text-[#6B6B60]">{article.description}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-medium text-[#151515]">
              Read
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </Link>
        ))}
      </div>

      <p>
        <Link href="/docs">Back to all documentation</Link>
      </p>

      <SeoPageCta heading="Know what changed. Fix what matters." />
    </MarketingPageShell>
  );
}
