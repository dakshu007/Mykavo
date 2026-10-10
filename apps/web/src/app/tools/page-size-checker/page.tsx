import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { ToolFaqSection } from "@/components/landing/tool-faq";
import { ToolConversionCta } from "@/components/tools/tool-conversion-cta";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { site } from "@/config/site";
import { PageSizeChecker } from "./page-size-checker";
import { PAGE_SIZE_CHECKER_FAQS } from "./faqs";

const description =
  "Free page size checker: measure a web page's HTML size, total weight and request count. See scripts, stylesheets, images and fonts by size and third-party share.";

export const metadata: Metadata = {
  title: "Free Page Size Checker - Page Weight & Request Counter",
  description,
  alternates: { canonical: "/tools/page-size-checker" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Page Size & Request Counter",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description,
  url: `${site.url}/tools/page-size-checker`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

const inlineLink = "font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4";

export default function PageSizeCheckerPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav />
      <main className="mx-auto max-w-225 px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// free tool //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-5xl`}>
            Page Size{" "}
            <span className="relative inline-block">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Checker</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            See how heavy a page is and what it loads: the HTML size, every script, stylesheet, image, preloaded font
            and iframe it references, which of them are third-party, and the heaviest files. Free, no account needed.
          </p>
        </div>

        <PageSizeChecker />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>Why pages get heavier over time</h2>
          <p>
            Pages rarely get slow in one go. They put on weight a release at a time: a hero image uploaded at full
            camera resolution, a new chat widget, a second analytics tag, a slider library added for one section. Each
            change looks small on its own, and nobody compares the page with how it was three months ago.
          </p>
          <p>
            This checker reads the page&apos;s HTML and lists the files it references directly: scripts, stylesheets,
            images (the <span className="font-mono text-[13px] text-[#151515]">src</span> or first{" "}
            <span className="font-mono text-[13px] text-[#151515]">srcset</span> candidate), preloaded fonts and
            iframes. It then downloads up to 40 of them to measure their size and splits them into first-party and
            third-party by domain. It is not a browser, so files loaded from CSS or by JavaScript are not counted. If a
            script you didn&apos;t expect shows up in the list, the{" "}
            <Link href="/tools/script-detector" className={inlineLink}>
              Script Detector
            </Link>{" "}
            tells you which service it belongs to.
          </p>
          <p>
            A single measurement gives you a number without context. MyKavo loads each page you monitor in a real
            browser on every scan, records its page weight and request count, and compares them with your approved
            baseline, flagging a weight increase over 20% or a request count increase over 25%. That turns
            &ldquo;the site feels slower&rdquo; into the scan, and the change, where it happened.
          </p>
        </section>

        <ToolConversionCta
          heading="Page weight creeps up a release at a time. See which release did it."
          body="This check is one snapshot. MyKavo measures your monitored pages in a real browser every scan and flags page weight and request count increases against your approved baseline."
        />

        <ToolFaqSection faqs={PAGE_SIZE_CHECKER_FAQS} toolName="Page Size Checker" toolPath="/tools/page-size-checker" />
      </main>
      <LandingFooter />
    </div>
  );
}
