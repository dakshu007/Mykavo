import type { Metadata } from "next";
import { withSocial } from "@/lib/social-metadata";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { ToolFaqSection } from "@/components/landing/tool-faq";
import { ToolConversionCta } from "@/components/tools/tool-conversion-cta";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { site } from "@/config/site";
import { StructuredDataChecker } from "./structured-data-checker";
import { STRUCTURED_DATA_FAQS } from "./faqs";

const description =
  "Free structured data checker: view every JSON-LD block on a page, find invalid JSON, and check common required properties. Also detects microdata and RDFa.";

export const metadata: Metadata = withSocial({
  title: "Free Structured Data Checker - View & Validate Schema Markup",
  description,
  alternates: { canonical: "/tools/structured-data-checker" },
});

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Structured Data Checker",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description,
  url: `${site.url}/tools/structured-data-checker`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

const code = "font-mono text-[13px] text-[#151515]";

export default function StructuredDataCheckerPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav />
      <main className="mx-auto max-w-225 px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// free tool //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-5xl`}>
            Structured Data{" "}
            <span className="relative inline-block">
              <span aria-hidden className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]" />
              <span className="relative">Checker</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            See the schema markup on any page: every JSON-LD block, each entity&apos;s type and key properties, broken JSON, and the common properties popular types need. Free, no account needed.
          </p>
        </div>

        <StructuredDataChecker />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
            Why structured data breaks without anyone noticing
          </h2>
          <p>
            Structured data is markup that tells search engines what a page describes: a product and its price, an article and its author, a business and its address. It lives in a <span className={code}>{'<script type="application/ld+json">'}</span> tag that visitors never see, which is exactly why it fails silently. A plugin update changes the output, a trailing comma makes the whole block invalid JSON, or a template stops filling in the price, and the page looks the same as before.
          </p>
          <p>
            This checker fetches the page and parses every JSON-LD block, including arrays and <span className={code}>@graph</span> containers. It lists each entity with its type and main properties, shows the parser error for any block that is not valid JSON, flags a missing <span className={code}>@context</span> or <span className={code}>@type</span>, and checks the common required and recommended properties for types such as Product, Article, FAQPage, BreadcrumbList, LocalBusiness, Event, Recipe and VideoObject. It also counts microdata and RDFa. It is not Google&apos;s full validator; for rich result eligibility, use the Rich Results Test linked from your results.
          </p>
          <p>
            A one-off check covers today. MyKavo scans your important pages on a schedule, records a fingerprint of their structured data with every scan, and alerts you when the signals around it change: titles, canonical tags, robots directives and H1 headings.
          </p>
        </section>

        <ToolConversionCta
          heading="Know when the SEO basics on your key pages change."
          body="This check covers today. MyKavo re-scans your important pages on a schedule and alerts you, with before and after values, when a title, canonical, robots tag or H1 changes."
        />

        <ToolFaqSection faqs={STRUCTURED_DATA_FAQS} toolName="Structured Data Checker" toolPath="/tools/structured-data-checker" />
      </main>
      <LandingFooter />
    </div>
  );
}
