import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { ToolFaqSection } from "@/components/landing/tool-faq";
import { ToolConversionCta } from "@/components/tools/tool-conversion-cta";
import { NOINDEX_FAQS } from "@/config/tool-faqs";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { NoindexChecker } from "./noindex-checker";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Free Noindex Checker - Is My Page Blocked From Google?",
  description:
    "Free noindex checker: see if a page can be indexed by Google. Checks robots meta tags, the X-Robots-Tag header, the HTTP status and robots.txt in one go.",
  alternates: { canonical: "/tools/noindex-checker" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Noindex Checker",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Free noindex checker: see if a page can be indexed by Google. Checks robots meta tags, the X-Robots-Tag header, the HTTP status and robots.txt in one go.",
  url: `${site.url}/tools/noindex-checker`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

export default function NoindexCheckerPage() {
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
          <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-5xl`}>
            Noindex{" "}
            <span className="relative inline-block">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Checker</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            Find out in seconds whether Google can index a page - and if not, exactly which signal is stopping it. Checks robots meta tags, the X-Robots-Tag header, the status code and robots.txt. Free, no account needed.
          </p>
        </div>

        <NoindexChecker />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
            Why pages go noindex without anyone noticing
          </h2>
          <p>
            A noindex is one line that removes a page from Google. It rarely arrives on purpose: a staging site goes live with &ldquo;discourage search engines&rdquo; still ticked, an SEO plugin update changes a default, a theme template adds a robots tag, or a server rule sends an <span className="font-mono text-[13px] text-[#151515]">X-Robots-Tag</span> header that never shows in the page source. The page looks exactly the same, so the first sign is traffic falling weeks later.
          </p>
          <p>
            This checker reads the page the way Googlebot does. It looks at every <span className="font-mono text-[13px] text-[#151515]">robots</span> and <span className="font-mono text-[13px] text-[#151515]">googlebot</span> meta tag, the X-Robots-Tag header (including bot-specific values like <span className="font-mono text-[13px] text-[#151515]">googlebot: noindex</span>), the final status code after redirects, and whether robots.txt lets Googlebot crawl the URL at all. It also flags a canonical pointing at a different page, which usually means Google indexes that URL instead.
          </p>
          <p>
            A one-off check tells you about today. MyKavo checks the robots meta on every page you monitor during each scan and treats a change from index to noindex as a critical alert, so you hear about it the day it happens. If you&apos;re chasing a page that isn&apos;t in Google, our guide to <Link href="/blog/page-not-indexed-by-google" className="font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4">why a page isn&apos;t indexed</Link> walks through every Search Console status.
          </p>
        </section>

        <ToolConversionCta
          heading="A stray noindex costs a page all its traffic. Catch it the same day."
          body="This check covers today. MyKavo re-checks your important pages on a schedule and alerts you, with before-and-after proof, the moment one turns noindex."
        />

        <ToolFaqSection faqs={NOINDEX_FAQS} toolName="Noindex Checker" toolPath="/tools/noindex-checker" />
      </main>
      <LandingFooter />
    </div>
  );
}
