import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNav />
      <main className="mx-auto max-w-225 px-5 py-14 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="label-micro mb-3">Free tool</p>
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Website Change Detector
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-ink-secondary">
            Snapshot any page&apos;s HTTP status, SEO tags, links, and scripts. Save it, come back
            later, and see exactly what changed - or compare two URLs side-by-side. Free, no
            account needed.
          </p>
        </div>
        <Suspense>
          <ChangeDetector />
        </Suspense>

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-ink-secondary">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
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
            pages flipping to <span className="font-mono text-[13px] text-ink">noindex</span>,
            titles being overwritten, canonicals disappearing, analytics scripts being dropped
            during a rebuild, or a page suddenly returning an error status.
          </p>
          <p>
            This free tool checks one page at a time, on demand. MyKavo does this automatically
            for every important page on every website you manage - on a schedule, with visual
            screenshot comparison, broken-link detection, and severity-ranked email alerts.
          </p>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
