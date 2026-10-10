import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { ToolFaqSection } from "@/components/landing/tool-faq";
import { ToolConversionCta } from "@/components/tools/tool-conversion-cta";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { CanonicalChecker } from "./canonical-checker";
import { CANONICAL_FAQS } from "./faqs";
import { site } from "@/config/site";

const description =
  "Free canonical tag checker: find every canonical a page declares in its HTML and HTTP headers, spot conflicts, and check the canonical URL returns 200, does not redirect and is not noindex.";

export const metadata: Metadata = {
  title: "Free Canonical Tag Checker - Is Your Canonical URL Correct?",
  description,
  alternates: { canonical: "/tools/canonical-tag-checker" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Canonical Tag Checker",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description,
  url: `${site.url}/tools/canonical-tag-checker`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

const mono = "font-mono text-[13px] text-[#151515]";
const inlineLink = "font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4";

export default function CanonicalTagCheckerPage() {
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
            Canonical Tag{" "}
            <span className="relative inline-block">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Checker</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            See which URL a page tells Google to index, where that instruction comes from, and whether the canonical URL actually works. Checks the HTML tag and the HTTP Link header, then follows the canonical to test its status, redirects and noindex. Free, no account needed.
          </p>
        </div>

        <CanonicalChecker />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
            What a canonical tag does, and how it goes wrong
          </h2>
          <p>
            A canonical tells search engines which URL is the main version of a page. When the same content is reachable at several addresses - with tracking parameters, filters, a trailing slash or a www prefix - the <span className={mono}>rel=&quot;canonical&quot;</span> link says which one should appear in results and collect the ranking signals. It can sit in the HTML <span className={mono}>&lt;head&gt;</span> or arrive as an HTTP <span className={mono}>Link</span> header, and Google treats it as a strong hint rather than a command.
          </p>
          <p>
            The common mistakes are quiet ones. Two plugins each add a tag and they disagree. The HTML says one URL and the server header says another. A template hardcodes the homepage as the canonical for every page, or points at the http:// version after a move to https. A canonical names a URL that redirects, returns 404 or is itself noindex, which gives Google contradictory instructions. This checker reports each of these, along with relative URLs and tags placed in the <span className={mono}>&lt;body&gt;</span>, where Google ignores them.
          </p>
          <p>
            A canonical is one of several signals that decide whether a page shows up in search. To check the others, use the <Link href="/tools/noindex-checker" className={inlineLink}>Noindex Checker</Link> for robots meta tags, X-Robots-Tag headers and robots.txt, and the <Link href="/tools/redirect-chain-checker" className={inlineLink}>Redirect Chain Checker</Link> to see every hop between a URL and where it ends up.
          </p>
        </section>

        <ToolConversionCta
          heading="Canonicals change without anyone noticing. Get told when they do."
          body="This check covers today. MyKavo records the canonical on each page you monitor every scan and sends a high-severity alert, with the previous and current value, when it changes or disappears."
        />

        <ToolFaqSection faqs={CANONICAL_FAQS} toolName="Canonical Tag Checker" toolPath="/tools/canonical-tag-checker" />
      </main>
      <LandingFooter />
    </div>
  );
}
