import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { ScriptDetector } from "./script-detector";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Free Third-Party Script Detector",
  description:
    "Free script detector: list every external script on a page and identify common services like Google Analytics, Tag Manager, Meta Pixel, Stripe, Hotjar, Intercom, and HubSpot.",
  alternates: { canonical: "/tools/script-detector" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Script Detector",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Detect external and third-party scripts on any page and identify common services like analytics, tag managers, and payment scripts.",
  url: `${site.url}/tools/script-detector`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

export default function ScriptDetectorPage() {
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
            Script Detector
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-ink-secondary">
            List every external script loaded by a page and identify common services — Google
            Analytics, Tag Manager, Meta Pixel, Stripe, Hotjar, Intercom, HubSpot, and more.
            Free, no account needed.
          </p>
        </div>

        <ScriptDetector />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-ink-secondary">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Why script monitoring matters
          </h2>
          <p>
            The scripts on a page are its supply chain. Analytics, tag managers, pixels, chat
            widgets, and payment scripts all get added by different people at different times —
            and any of them can silently disappear during a rebuild or theme update. A missing
            Google Analytics script means weeks of invisible data loss; a vanished Meta Pixel
            means ad campaigns optimizing blind; an unknown third-party script appearing out of
            nowhere can be a compromise.
          </p>
          <p>
            This detector fetches the page&apos;s HTML and lists every{" "}
            <span className="font-mono text-[13px] text-ink">&lt;script src&gt;</span> tag it
            finds: the full URL, the domain it loads from, whether it&apos;s third-party, and —
            where the domain matches a known service — which product it belongs to. Note that
            this is static analysis of the delivered HTML: scripts injected at runtime by other
            scripts (for example, tags fired through Google Tag Manager) won&apos;t appear here.
          </p>
          <p>
            A one-time inventory tells you what&apos;s there today. The expensive failures are
            the ones that happen next month: MyKavo snapshots the scripts on every monitored
            page during each scheduled scan and emails you when an important script is removed,
            replaced, or when an unfamiliar one shows up.
          </p>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
