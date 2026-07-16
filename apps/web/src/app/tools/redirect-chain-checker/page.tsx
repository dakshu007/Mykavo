import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { RedirectChainChecker } from "./redirect-chain-checker";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Free Redirect Chain Checker",
  description:
    "Free redirect chain checker: follow every hop a URL takes, see each 301/302/307/308 status, count the hops, and catch redirect loops and overly long chains.",
  alternates: { canonical: "/tools/redirect-chain-checker" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Redirect Chain Checker",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Trace a URL's full redirect chain hop by hop, with status codes, hop counts, loop detection, and long-chain warnings.",
  url: `${site.url}/tools/redirect-chain-checker`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

export default function RedirectChainCheckerPage() {
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
            Redirect Chain Checker
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-ink-secondary">
            Trace every hop a URL takes before it lands. See each redirect&apos;s status code,
            count the hops, and catch loops and needlessly long chains. Free, no account
            needed.
          </p>
        </div>

        <RedirectChainChecker />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-ink-secondary">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Why redirect chains matter
          </h2>
          <p>
            Every redirect hop costs a full network round-trip before the visitor sees anything,
            and search engines pass less authority through each extra hop. A URL that goes{" "}
            <span className="font-mono text-[13px] text-ink">http → https → www → final</span>{" "}
            is three hops where one would do. Chains longer than two hops are worth fixing;
            loops - where a URL eventually redirects back to itself - break the page outright.
          </p>
          <p>
            This checker requests your URL and follows the Location header manually, hop by
            hop, recording each status code along the way. 301 and 308 are permanent redirects
            (search engines transfer ranking signals); 302, 303, and 307 are temporary (they
            usually don&apos;t). Mixing them up is one of the most common causes of lost
            rankings after a site migration.
          </p>
          <p>
            Redirects also change without anyone deciding they should: an expired plugin rule, a
            CDN misconfiguration, or a migration script can quietly re-route a money page to
            the homepage. MyKavo re-checks the redirect behavior of every monitored page on a
            schedule and alerts you when a destination or status unexpectedly changes.
          </p>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
