import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocArticlePage } from "@/components/landing/doc-article";
import { DOC_SECTIONS, findDocArticle } from "@/config/docs";

type Params = { params: Promise<{ section: string; article: string }> };

export function generateStaticParams() {
  return DOC_SECTIONS.flatMap((section) =>
    section.articles.map((article) => ({ section: section.slug, article: article.slug })),
  );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { section, article } = await params;
  const found = findDocArticle(section, article);
  if (!found) return {};
  return {
    title: `${found.article.title} - MyKavo Docs`,
    description: found.article.description,
    keywords: found.article.keywords,
    alternates: { canonical: `/docs/${section}/${article}` },
    openGraph: {
      title: found.article.title,
      description: found.article.description,
      url: `/docs/${section}/${article}`,
      type: "article",
    },
  };
}

export default async function Page({ params }: Params) {
  const { section, article } = await params;
  const found = findDocArticle(section, article);
  if (!found) notFound();
  return (
    <DocArticlePage
      section={found.section}
      article={found.article}
      siblings={found.section.articles}
    />
  );
}
