import type { Metadata } from "next";
import { withSocial } from "@/lib/social-metadata";
import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { ToolFaqSection } from "@/components/landing/tool-faq";
import { ToolConversionCta } from "@/components/tools/tool-conversion-cta";
import { HREFLANG_FAQS } from "./faqs";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { HreflangChecker } from "./hreflang-checker";
import { site } from "@/config/site";

export const metadata: Metadata = withSocial({
  title: "Free Hreflang Checker - Validate Hreflang Tags & Return Links",
  description:
    "Free hreflang checker: validate every hreflang code on a page, then confirm each alternate loads, is indexable and links back. Catches en-UK, missing self-references and more.",
  alternates: { canonical: "/tools/hreflang-checker" },
});

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Hreflang Checker",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Free hreflang checker: validate every hreflang code on a page, then confirm each alternate loads, is indexable and links back. Catches en-UK, missing self-references and more.",
  url: `${site.url}/tools/hreflang-checker`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

export default function HreflangCheckerPage() {
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
            Hreflang{" "}
            <span className="relative inline-block">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Checker</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            Check every hreflang tag on a page: valid language and region codes, a self-reference, x-default, and
            whether each alternate loads, is indexable and links back. Free, no account needed.
          </p>
        </div>

        <HreflangChecker />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
            Why hreflang quietly stops working
          </h2>
          <p>
            Hreflang tells Google which version of a page to show in each language or country. It fails silently: Google
            doesn&apos;t report most mistakes, it simply ignores the annotation and picks a version itself, so visitors in
            Germany land on the English page and nobody notices for months.
          </p>
          <p>
            The usual causes are small. A code like <span className="font-mono text-[13px] text-[#151515]">en-UK</span> 
            instead of <span className="font-mono text-[13px] text-[#151515]">en-GB</span>, an underscore, a country on
            its own, a page that doesn&apos;t list itself, or an alternate that never links back. Return links matter
            most: Google can ignore a pair that isn&apos;t confirmed from both pages. This checker validates every code,
            then opens up to 15 alternates to confirm each one loads, links back and can be indexed.
          </p>
          <p>
            An alternate that redirects, is noindex or names a different canonical breaks the set too. If one shows up
            here, check it with the <Link href="/tools/canonical-tag-checker" className="font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4">Canonical Tag Checker</Link> and the 
            <Link href="/tools/noindex-checker" className="font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4">Noindex Checker</Link>.
          </p>
        </section>

        <ToolConversionCta
          heading="Find hreflang mistakes on every page, not just one."
          body="MyKavo's Site Audit crawls your site and flags invalid hreflang codes and missing self-references, included on the free plan for up to 150 pages per crawl."
        />

        <ToolFaqSection faqs={HREFLANG_FAQS} toolName="Hreflang Checker" toolPath="/tools/hreflang-checker" />
      </main>
      <LandingFooter />
    </div>
  );
}
