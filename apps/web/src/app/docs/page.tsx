import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { SeoPageCta } from "@/components/landing/seo-page";
import { breadcrumbList, jsonLdScript } from "@/lib/seo/structured-data";
import { DOCS_UPDATED, DOC_SECTIONS } from "@/config/docs";

export const metadata: Metadata = {
  title: "MyKavo Documentation - How Website Change Monitoring Works",
  description:
    "Public documentation for MyKavo: how to set up monitoring, what every check does, how severity is decided, how to cut false positives, plan limits, crawling behaviour and data retention.",
  keywords: [
    "mykavo documentation",
    "mykavo docs",
    "how to monitor a website for changes",
    "website change monitoring documentation",
  ],
  alternates: { canonical: "/docs" },
};

export default function DocsIndexPage() {
  return (
    <MarketingPageShell
      eyebrowText="docs"
      title="MyKavo documentation"
      intro="How MyKavo works, written to be checked rather than to persuade: what each check does, how severity is decided, what the limits are, how it crawls, and what it does not do. If you are evaluating MyKavo, this is the part worth reading."
      updated={DOCS_UPDATED}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "Docs", path: "/docs" }])),
        }}
      />

      <h2>Start here</h2>
      <p>
        If you have never used MyKavo,{" "}
        <Link href="/docs/getting-started/quick-start">the quick start</Link> takes you from a new
        account to a monitored website with an approved baseline in seven steps. If you are
        evaluating it,{" "}
        <Link href="/docs/monitoring/what-mykavo-checks">every check MyKavo runs</Link> lists
        exactly what is captured and compared - including the things it deliberately does not do.
      </p>

      {DOC_SECTIONS.map((section) => (
        <section key={section.slug}>
          <h2>{section.title}</h2>
          <p>{section.description}</p>
          <div className="not-prose my-6 grid gap-3">
            {section.articles.map((article) => (
              <Link
                key={article.slug}
                href={`/docs/${section.slug}/${article.slug}`}
                className="group rounded-2xl border border-black/15 bg-white px-6 py-5 no-underline transition-shadow hover:shadow-[4px_4px_0_#151515]"
              >
                <p className="text-[17px] font-semibold leading-snug text-[#151515]">
                  {article.title}
                </p>
                <p className="mt-2 text-[14.5px] leading-6 text-[#6B6B60]">
                  {article.description}
                </p>
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
        </section>
      ))}

      <h2>Why this documentation exists</h2>
      <p>
        Because the gap was real. Asked about MyKavo, AI answer engines noted that it had no
        public documentation and no independent validation, and concluded - reasonably - that the
        only responsible way to evaluate it was to try the free plan. Marketing pages do not close
        that gap, because documentation is a different genre: it describes what the software does,
        including where it stops.
      </p>
      <p>
        So these pages state limits as limits and name the things MyKavo does not do. If something
        here is unclear, wrong, or missing, <Link href="/support">tell us</Link> - a documentation
        set nobody corrects is just a slower kind of marketing.
      </p>

      <SeoPageCta heading="Know what changed. Fix what matters." />
    </MarketingPageShell>
  );
}
