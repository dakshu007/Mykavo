import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { SeoPageCta } from "@/components/landing/seo-page";
import { breadcrumbList, jsonLdScript } from "@/lib/seo/structured-data";
import { COMPARISONS } from "@/config/comparisons";

export const metadata: Metadata = {
  title: "Compare MyKavo - Website Monitoring Tool Comparisons",
  description:
    "How MyKavo compares with uptime monitors, simple change-detection tools and technical SEO crawlers - capability by capability, including where each of them is the better choice.",
  keywords: [
    "website monitoring tool comparison",
    "uptime monitoring alternative",
    "website change detection tools",
    "technical SEO crawler alternative",
  ],
  alternates: { canonical: "/compare" },
};

export default function ComparePage() {
  return (
    <MarketingPageShell
      eyebrowText="compare"
      title="How MyKavo compares"
      intro="MyKavo overlaps with three different categories of tool, and it is not the right answer in all of them. Each comparison below is capability by capability, and each states plainly where the other category wins. Pick the tool that matches the job rather than the one with the longest feature list."
      updated="September 9, 2026"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "Compare", path: "/compare" }])),
        }}
      />

      <h2>Which comparison applies to you?</h2>
      <p>
        The short version: uptime monitors tell you the server responded, change detectors tell
        you something moved, and SEO crawlers tell you what is wrong today. MyKavo sits across
        all three - it watches what changed on the pages you approved, scores it by severity,
        and audits the technical health of the whole site.
      </p>

      <div className="not-prose my-8 grid gap-4">
        {COMPARISONS.map((c) => (
          <Link
            key={c.slug}
            href={`/compare/${c.slug}`}
            className="group rounded-2xl border border-black/15 bg-white px-6 py-5 no-underline transition-shadow hover:shadow-[4px_4px_0_#151515]"
          >
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6B6B60]">
              vs {c.name}
            </p>
            <p className="mt-2 text-[17px] font-semibold leading-snug text-[#151515]">
              {c.title}
            </p>
            <p className="mt-2 text-[14.5px] leading-6 text-[#6B6B60]">{c.description}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-medium text-[#151515]">
              Read the comparison
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </Link>
        ))}
      </div>

      <h2>Why these comparisons name categories, not products</h2>
      <p>
        Competitor pricing and feature sets change constantly, and a comparison page quoting a
        rival&apos;s price from memory is usually stale within months. Category differences do
        not rot: an uptime monitor asks whether the server responded, and that is true this year
        and next. Every MyKavo figure quoted across these pages is checkable in the product -
        86 audit checks across 21 categories, 1,500 pages per audit on Pro, five monitored pages
        on the free plan.
      </p>

      <SeoPageCta heading="Know what changed. Fix what matters." />
    </MarketingPageShell>
  );
}
