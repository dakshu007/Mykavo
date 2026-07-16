import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNav />
      <main className="mx-auto max-w-225 px-5 py-14 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="label-micro mb-3">Free tool</p>
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Bulk URL Status Checker
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-ink-secondary">
            Paste up to 20 URLs and check their HTTP status codes and response times in one go.
            Spot 404s, 500s, and slow pages instantly. Free, no account needed.
          </p>
        </div>

        <BulkStatusChecker />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-ink-secondary">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Why bulk status checking matters
          </h2>
          <p>
            A page that returns <span className="font-mono text-[13px] text-ink">404</span> or{" "}
            <span className="font-mono text-[13px] text-ink">500</span> isn&apos;t just broken
            for visitors - search engines drop it from results, ads pointing at it burn budget,
            and internal links to it leak authority. Checking pages one at a time in a browser
            doesn&apos;t scale past a handful, and a browser&apos;s cache can hide problems that
            a fresh request would reveal.
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
      <MarketingFooter />
    </>
  );
}
