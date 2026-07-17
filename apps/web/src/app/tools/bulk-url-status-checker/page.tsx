import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { BulkStatusChecker } from "./bulk-status-checker";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Free Bulk URL Status Checker",
  description:
    "Free bulk URL status checker: paste up to 20 URLs and check their HTTP status codes and response times in one go - spot 404s, 500s, and slow pages instantly.",
  alternates: { canonical: "/tools/bulk-url-status-checker" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Bulk URL Status Checker",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Check the HTTP status codes and response times of up to 20 URLs at once.",
  url: `${site.url}/tools/bulk-url-status-checker`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

export default function BulkUrlStatusCheckerPage() {
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
            Bulk URL{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Status Checker</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            Paste up to 20 URLs and check their HTTP status codes and response times in one go.
            Spot 404s, 500s, and slow pages instantly. Free, no account needed.
          </p>
        </div>

        <BulkStatusChecker />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
            Why bulk status checking matters
          </h2>
          <p>
            A page that returns{" "}
            <span className="font-mono text-[13px] text-[#151515]">404</span> or{" "}
            <span className="font-mono text-[13px] text-[#151515]">500</span> isn&apos;t just
            broken for visitors - search engines drop it from results, ads pointing at it burn
            budget, and internal links to it leak authority. Checking pages one at a time in a
            browser doesn&apos;t scale past a handful, and a browser&apos;s cache can hide
            problems that a fresh request would reveal.
          </p>
          <p>
            This tool requests each URL fresh - up to 20 at a time - and reports the status
            code and response time for every one. Redirects are followed to the final
            destination, so a URL that 301s to a working page shows the status the visitor
            actually receives. Each row succeeds or fails independently: one dead server
            won&apos;t hide results for the other nineteen.
          </p>
          <p>
            The catch with one-off checks is that pages break on their own schedule, not yours
            - a deploy on Friday, an expired certificate on Sunday. MyKavo checks your
            important pages automatically, on a schedule, and emails you the moment a page that
            returned 200 starts returning an error.
          </p>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
