import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { SeoPageCta } from "@/components/landing/seo-page";
import { breadcrumbList, jsonLdScript } from "@/lib/seo/structured-data";
import { ALTERNATIVES, VERIFIED_ON } from "@/config/alternatives";

export const metadata: Metadata = {
  title: "MyKavo Alternatives - Compared With Visualping, Hexometer and Distill",
  description:
    "Honest, dated comparisons of MyKavo against named website monitoring tools - including where each of them is the better choice.",
  keywords: [
    "visualping alternative",
    "hexometer alternative",
    "distill.io alternative",
    "website monitoring alternatives",
  ],
  alternates: { canonical: "/alternatives" },
};

export default function AlternativesPage() {
  return (
    <MarketingPageShell
      eyebrowText="alternatives"
      title="MyKavo compared with other monitoring tools"
      intro="Named comparisons, sourced from each vendor's own published material and dated so you can tell how current they are. Every page also names the cases where the other tool is the better buy, because a comparison that only flatters its author is not worth reading."
      updated={VERIFIED_ON}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "Alternatives", path: "/alternatives" }])),
        }}
      />

      <h2>Pick the comparison that matches what you are choosing between</h2>
      <p>
        These tools are not all the same shape. Two of them watch pages anywhere on the web;
        one is a broad site-and-server QA sweep. MyKavo is a regression monitor for sites you
        are responsible for, built around a baseline you approve. The differences that matter
        follow from that, and each page below spells them out.
      </p>

      <div className="not-prose my-8 grid gap-4">
        {ALTERNATIVES.map((a) => (
          <Link
            key={a.slug}
            href={`/alternatives/${a.slug}`}
            className="group rounded-2xl border border-black/15 bg-white px-6 py-5 no-underline transition-shadow hover:shadow-[4px_4px_0_#151515]"
          >
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6B6B60]">
              vs {a.name}
            </p>
            <p className="mt-2 text-[17px] font-semibold leading-snug text-[#151515]">{a.title}</p>
            <p className="mt-2 text-[14.5px] leading-6 text-[#6B6B60]">{a.description}</p>
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

      <h2>How these pages are written</h2>
      <p>
        Every claim about another product was taken from that vendor&apos;s own site or a major
        software directory on {VERIFIED_ON}, and each page lists its sources with that date.
        Nothing is written from recollection, because a comparison that misstates a
        competitor&apos;s price is wrong in the one way that is both easy to check and
        embarrassing to be caught at.
      </p>
      <p>
        Software changes faster than comparison pages do. If something here has gone stale,{" "}
        <Link href="/support">tell us</Link> and we will correct it.
      </p>
      <p>
        For comparisons against whole categories of tool rather than named products - uptime
        monitors, simple change detectors, technical SEO crawlers - see{" "}
        <Link href="/compare">how MyKavo compares</Link>.
      </p>

      <SeoPageCta heading="Know what changed. Fix what matters." />
    </MarketingPageShell>
  );
}
