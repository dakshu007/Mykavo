import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { ToolFaqSection } from "@/components/landing/tool-faq";
import { ToolConversionCta } from "@/components/tools/tool-conversion-cta";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { site } from "@/config/site";
import { AnalyticsChecker } from "./analytics-checker";
import { ANALYTICS_TAG_FAQS } from "./faqs";

const DESCRIPTION =
  "Free analytics tag checker: enter a URL to see if GA4, Google Tag Manager, Google Ads, Meta Pixel or other analytics tags are installed, with their IDs.";

export const metadata: Metadata = {
  title: "Free Google Analytics Checker - Is GA4 or GTM Installed?",
  description: DESCRIPTION,
  alternates: { canonical: "/tools/analytics-tag-checker" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Analytics Tag Checker",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
  url: `${site.url}/tools/analytics-tag-checker`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

const mono = "font-mono text-[13px] text-[#151515]";
const inlineLink = "font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4";

export default function AnalyticsTagCheckerPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav />
      <main className="mx-auto max-w-225 px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// free tool //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-5xl`}>
            Google Analytics &amp; Tag{" "}
            <span className="relative inline-block">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Checker</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            See whether a page has GA4 or Google Tag Manager installed, which measurement IDs it sends to, and which ad
            pixels and analytics tools load with it. Free, no account needed.
          </p>
        </div>

        <AnalyticsChecker />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>How the analytics checker works</h2>
          <p>
            Analytics tools leave recognisable code in a page. GA4 loads <span className={mono}>gtag/js?id=G-...</span>{" "}
            and calls <span className={mono}>gtag(&apos;config&apos;, &apos;G-...&apos;)</span>, Tag Manager adds its{" "}
            <span className={mono}>GTM-</span> container snippet and a noscript iframe, and pixels such as Meta, LinkedIn
            and TikTok call their own init function with an ID. The checker reads the page&apos;s HTML and reports each
            ID with where it was found.
          </p>
          <p>
            It also points out setups worth a second look: the same GA4 ID configured twice, GA4 installed directly
            alongside a GTM container that may fire it again, leftover Universal Analytics code, and whether a Google
            consent mode default is set. What it can&apos;t see is anything added after the page loads, such as a GA4 tag
            that lives only inside GTM. If your reports have gone quiet, our guide on{" "}
            <Link href="/blog/google-analytics-not-tracking" className={inlineLink}>
              why Google Analytics stops tracking
            </Link>{" "}
            walks through the usual causes.
          </p>
          <p>
            Tracking rarely breaks on purpose. A theme update, a new cookie banner or a plugin cleanup removes the tag,
            the page still returns 200 OK, and nobody notices until the reports show a gap. MyKavo re-scans the pages
            you choose and alerts you when a known analytics or tag manager script stops loading.
          </p>
        </section>

        <ToolConversionCta
          heading="A missing analytics tag costs you data you can't get back."
          body="MyKavo watches your key pages on a schedule and sends a high-severity alert when Google Analytics, Tag Manager or another known tracking script disappears."
        />

        <ToolFaqSection faqs={ANALYTICS_TAG_FAQS} toolName="Analytics Tag Checker" toolPath="/tools/analytics-tag-checker" />
      </main>
      <LandingFooter />
    </div>
  );
}
