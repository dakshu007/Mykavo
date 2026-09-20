import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlternativePage } from "@/components/landing/alternative-page";
import { ALTERNATIVES, findAlternative } from "@/config/alternatives";

type Params = { params: Promise<{ slug: string }> };

/** One static page per vendor - these are SEO landing pages, not app routes. */
export function generateStaticParams() {
  return ALTERNATIVES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const alternative = findAlternative(slug);
  if (!alternative) return {};
  return {
    title: alternative.title,
    description: alternative.description,
    keywords: alternative.keywords,
    alternates: { canonical: `/alternatives/${alternative.slug}` },
    openGraph: {
      title: alternative.title,
      description: alternative.description,
      url: `/alternatives/${alternative.slug}`,
      type: "article",
    },
  };
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const alternative = findAlternative(slug);
  if (!alternative) notFound();
  return <AlternativePage alternative={alternative} />;
}
