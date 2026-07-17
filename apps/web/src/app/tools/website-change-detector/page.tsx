import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { ChangeDetector } from "./change-detector";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Free Website Change Detector",
  description:
    "Free website change detector: snapshot any page's HTTP status, SEO tags, links, and scripts - then compare two URLs or re-check later to see exactly what changed.",
  alternates: { canonical: "/tools/website-change-detector" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Website Change Detector",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Compare two website states and detect changes to HTTP status, SEO tags, links, scripts, and page weight.",
  url: `${site.url}/tools/website-change-detector`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

export default function WebsiteChangeDetectorPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />
      <main className="mx-auto max-w-225 px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// free tool //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.1] text-[#151515] sm:text-5xl`}>
            Website{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Change</span>
            </span>{" "}
            Detector
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            Snapshot any page&apos;s HTTP status, SEO tags, links, and scripts. Save it, come back
            later, and see exactly what changed - or compare two URLs side-by-side. Free, no
            account needed.
          </p>
        </div>
        <Suspense>
          <ChangeDetector />
        </Suspense>

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
            What does this tool check?
          </h2>
          <p>
            The Website Change Detector fetches a page the same way MyKavo&apos;s monitoring
            engine does and extracts a deterministic snapshot: HTTP status and redirect chain,
            title tag, meta description, canonical URL, robots meta, H1 headings, internal and
            external link counts, third-party scripts (like Google Analytics, Tag Manager, or
            Meta Pixel), HTML page weight, and response time.
          </p>
          <p>
            Comparing two snapshots reveals the changes that most often cause silent damage:
            pages flipping to{" "}
            <span className="font-mono text-[13px] text-[#151515]">noindex</span>, titles being
            overwritten, canonicals disappearing, analytics scripts being dropped during a
            rebuild, or a page suddenly returning an error status.
          </p>
          <p>
            This free tool checks one page at a time, on demand. MyKavo does this automatically
            for every important page on every website you manage - on a schedule, with visual
            screenshot comparison, broken-link detection, and severity-ranked email alerts.
          </p>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
