import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { EeatAnalyzer } from "./eeat-analyzer";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Free E-E-A-T Analyzer & Checker",
  description:
    "Free E-E-A-T checker: analyze any page against Google's Experience, Expertise, Authoritativeness, and Trust guidelines - 20 on-page signals with a score and concrete fixes.",
  alternates: { canonical: "/tools/eeat-analyzer" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "E-E-A-T Analyzer",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Analyze a page's E-E-A-T signals: author bylines, credentials, dates, Organization schema, about/contact/privacy pages, HTTPS, citations, and more - scored per pillar with fixes.",
  url: `${site.url}/tools/eeat-analyzer`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

export default function EeatAnalyzerPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav />
      <main className="mx-auto max-w-225 px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// free tool //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.08] text-[#151515] sm:text-5xl`}>
            E-E-A-T{" "}
            <span className="relative inline-block">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Analyzer</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            Score any page against Google&apos;s Experience, Expertise, Authoritativeness,
            and Trust framework - 20 deterministic on-page signals from the Search Quality
            Rater Guidelines, each with a concrete fix. Trust is weighted double, exactly
            as Google describes it.
          </p>
        </div>
        <EeatAnalyzer />

        <section className="mx-auto mt-16 max-w-2xl space-y-4 text-[14px] leading-6 text-[#6B6B60]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515]`}>What this tool measures - honestly</h2>
          <p>
            E-E-A-T is not a Google ranking score you can read out of an API - it is the
            framework Google&apos;s human quality raters use, and its signals influence ranking
            systems indirectly. What CAN be measured are the on-page signals raters are told
            to look for: who wrote the content and what makes them qualified, whether the
            site says who runs it and how to reach them, whether claims cite sources, whether
            dates, policies, HTTPS, and structured identity are in place.
          </p>
          <p>
            This analyzer checks 20 of those signals deterministically - same page in, same
            result out - grouped into the four pillars, with Trust weighted double because
            Google&apos;s guidelines call it &quot;the most important member of the E-E-A-T family.&quot;
            Use the failed checks as a to-do list: every one is something you can actually fix today.
          </p>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
