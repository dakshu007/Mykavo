import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { ToolFaqSection } from "@/components/landing/tool-faq";
import { ToolConversionCta } from "@/components/tools/tool-conversion-cta";
import { ROBOTS_TXT_FAQS } from "@/config/tool-faqs";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { RobotsTxtTester } from "./robots-txt-tester";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Free Robots.txt Tester - Is This URL Blocked?",
  description:
    "Free robots.txt tester: check if a URL is blocked for Googlebot, Bingbot, GPTBot, ClaudeBot and other crawlers, see the exact rule that decides it, and spot common mistakes.",
  alternates: { canonical: "/tools/robots-txt-tester" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Robots.txt Tester",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Free robots.txt tester: check if a URL is blocked for Googlebot, Bingbot, GPTBot, ClaudeBot and other crawlers, see the exact rule that decides it, and spot common mistakes.",
  url: `${site.url}/tools/robots-txt-tester`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

export default function RobotsTxtTesterPage() {
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
            Robots.txt{" "}
            <span className="relative inline-block">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Tester</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            Paste any page URL to see whether Googlebot, Bingbot and the main AI crawlers may fetch it - with the exact robots.txt line that decides it. Uses Google&apos;s own matching rules. Free, no account needed.
          </p>
        </div>

        <RobotsTxtTester />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
            How robots.txt rules are matched
          </h2>
          <p>
            robots.txt is read in groups. Each crawler obeys only the group that names its own user agent - Googlebot follows a <span className="font-mono text-[13px] text-[#151515]">User-agent: Googlebot</span> group if there is one and ignores <span className="font-mono text-[13px] text-[#151515]">User-agent: *</span> entirely. Inside that group the rule with the longest matching path wins, and when an Allow and a Disallow tie, Allow wins. <span className="font-mono text-[13px] text-[#151515]">*</span> matches anything and a trailing <span className="font-mono text-[13px] text-[#151515]">$</span> anchors the end of the URL.
          </p>
          <p>
            This tester applies exactly those rules to the URL you enter, for Googlebot, Bingbot and the AI crawlers GPTBot, ClaudeBot, PerplexityBot and CCBot. It shows the deciding line, highlights it in the file, lists the sitemaps the file declares, and warns about the mistakes that hurt most: blocking the whole site, blocking CSS and JavaScript Google needs to render pages, or a robots.txt that returns a server error - which Google treats as &ldquo;block everything&rdquo;.
          </p>
          <p>
            Remember that robots.txt controls crawling, not indexing. To keep a page out of search results, let it be crawled and add a noindex - you can confirm that with our <Link href="/tools/noindex-checker" className="font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4">Noindex Checker</Link>.
          </p>
        </section>

        <ToolConversionCta
          heading="One wrong line can hide a whole site. Know the day it changes."
          body="MyKavo watches the pages that matter and alerts you when indexing signals change - with before-and-after evidence and a severity on every alert."
        />

        <ToolFaqSection faqs={ROBOTS_TXT_FAQS} toolName="Robots.txt Tester" toolPath="/tools/robots-txt-tester" />
      </main>
      <LandingFooter />
    </div>
  );
}
