import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { ToolFaqSection } from "@/components/landing/tool-faq";
import { ToolConversionCta } from "@/components/tools/tool-conversion-cta";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { site } from "@/config/site";
import { BrokenLinkChecker } from "./broken-link-checker";
import { BROKEN_LINK_CHECKER_FAQS } from "./faqs";

const description =
  "Free broken link checker: find 404 and other broken links on any page. Checks up to 100 links at once, internal and external, and shows the status of each.";

export const metadata: Metadata = {
  title: "Free Broken Link Checker (Single Page) - Find 404 Links",
  description,
  alternates: { canonical: "/tools/broken-link-checker" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Broken Link Checker",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description,
  url: `${site.url}/tools/broken-link-checker`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

const inlineLink = "font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4";
const code = "font-mono text-[13px] text-[#151515]";

export default function BrokenLinkCheckerPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav />
      <main className="mx-auto max-w-225 px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// free tool //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-5xl`}>
            Broken Link{" "}
            <span className="relative inline-block">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Checker</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            Paste a page URL and we check every link on it - internal and external - for 404s, server errors and dead
            domains. Broken links come first, with their anchor text so you can find them. Free, no account needed.
          </p>
        </div>

        <BrokenLinkChecker />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>How links break without anyone noticing</h2>
          <p>
            Links rarely break on the day they are written. They break later, when a page is renamed or deleted, a
            product is retired, a blog is moved to a new URL structure, or a site you linked to goes offline. The page
            with the link looks exactly the same, so nobody notices until a visitor clicks it and lands on a 404. If you
            want the full process for a whole site, our guide on{" "}
            <Link href="/blog/how-to-find-broken-links" className={inlineLink}>
              how to find broken links
            </Link>{" "}
            walks through it.
          </p>
          <p>
            This checker reads the links in the page&apos;s HTML, skips <span className={code}>mailto:</span>,{" "}
            <span className={code}>tel:</span>, <span className={code}>javascript:</span> and same-page{" "}
            <span className={code}>#anchors</span>, and requests each unique URL, following redirects. It reports 404,
            410, other 4xx and 5xx responses and unreachable domains as broken. Many sites answer automated checks with
            401, 403 or 429 even when the page works for people, so those are shown as &ldquo;couldn&apos;t verify&rdquo;
            rather than broken. To check a list of URLs you already have, use the{" "}
            <Link href="/tools/bulk-url-status-checker" className={inlineLink}>
              Bulk URL Status Checker
            </Link>
            .
          </p>
          <p>
            A one-off check covers one page, once. MyKavo checks the internal links on every page you monitor after each
            scan and raises a single grouped change when links that used to work start failing, so a renamed page or a
            deleted product doesn&apos;t leave dead links behind for months. External links are outside that monitoring,
            so this tool is still the place to check them.
          </p>
        </section>

        <ToolConversionCta
          heading="Broken internal links pile up quietly. Hear about them after the next scan."
          body="This check covers one page today. MyKavo re-scans your important pages on a schedule, checks their internal links, and flags them in one grouped change when links start returning errors."
        />

        <ToolFaqSection faqs={BROKEN_LINK_CHECKER_FAQS} toolName="Broken Link Checker" toolPath="/tools/broken-link-checker" />
      </main>
      <LandingFooter />
    </div>
  );
}
