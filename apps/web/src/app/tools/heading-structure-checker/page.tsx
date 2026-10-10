import type { Metadata } from "next";
import { withSocial } from "@/lib/social-metadata";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { ToolFaqSection } from "@/components/landing/tool-faq";
import { ToolConversionCta } from "@/components/tools/tool-conversion-cta";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { site } from "@/config/site";
import { HeadingChecker } from "./heading-checker";
import { HEADING_STRUCTURE_FAQS } from "./faqs";

const description =
  "Free heading structure checker: see every H1 to H6 on a page as an outline. Flags a missing H1, multiple H1s, empty headings, skipped levels and long headings.";

export const metadata: Metadata = withSocial({
  title: "Free Heading Structure Checker - H1 to H6 Outline",
  description,
  alternates: { canonical: "/tools/heading-structure-checker" },
});

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Heading Structure Checker",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description,
  url: `${site.url}/tools/heading-structure-checker`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

const code = "font-mono text-[13px] text-[#151515]";

export default function HeadingStructureCheckerPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav />
      <main className="mx-auto max-w-225 px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// free tool //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-5xl`}>
            Heading Structure{" "}
            <span className="relative inline-block">
              <span aria-hidden className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]" />
              <span className="relative">Checker</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            See every H1 to H6 heading on a page as an indented outline, in the order a reader meets them. Spot a missing H1, empty headings and skipped levels in seconds. Free, no account needed.
          </p>
        </div>

        <HeadingChecker />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
            What a good heading outline looks like
          </h2>
          <p>
            Headings are the table of contents of a page. One <span className={code}>H1</span> says what the page is about, <span className={code}>H2</span> headings mark its main sections, and <span className={code}>H3</span> to <span className={code}>H6</span> break those sections down. Screen reader users jump between headings to find their way around, and search engines use them to understand which part of a page answers which question.
          </p>
          <p>
            This checker fetches the page, reads every heading in document order and draws the outline. It flags a missing H1, several H1s (allowed by Google, but often a theme adding one by accident), headings with no text, jumps of more than one level such as H2 to H4, and headings over 70 characters. It also shows the title tag next to the first H1, because the two are often confused. Headings inside script, style, template and noscript tags are skipped, and headings added by JavaScript after load are not seen.
          </p>
          <p>
            Headings change more often than people expect: a theme update swaps the H1 for a logo, a page builder turns a heading into a styled paragraph, or a redesign drops a section. MyKavo compares the H1 on every monitored page each scan and raises a high-severity alert when it disappears, so a broken template does not sit unnoticed until rankings move.
          </p>
        </section>

        <ToolConversionCta
          heading="A missing H1 looks fine to the eye. Catch it the day it happens."
          body="This check covers today. MyKavo re-scans your important pages on a schedule and alerts you, with before and after values, when an H1 is removed or changed."
        />

        <ToolFaqSection faqs={HEADING_STRUCTURE_FAQS} toolName="Heading Structure Checker" toolPath="/tools/heading-structure-checker" />
      </main>
      <LandingFooter />
    </div>
  );
}
