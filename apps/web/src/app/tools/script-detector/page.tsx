import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
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
            Script{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Detector</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            List every external script loaded by a page and identify common services - Google
            Analytics, Tag Manager, Meta Pixel, Stripe, Hotjar, Intercom, HubSpot, and more.
            Free, no account needed.
          </p>
        </div>

        <ScriptDetector />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
            Why script monitoring matters
          </h2>
          <p>
            The scripts on a page are its supply chain. Analytics, tag managers, pixels, chat
            widgets, and payment scripts all get added by different people at different times -
            and any of them can silently disappear during a rebuild or theme update. A missing
            Google Analytics script means weeks of invisible data loss; a vanished Meta Pixel
            means ad campaigns optimizing blind; an unknown third-party script appearing out of
            nowhere can be a compromise.
          </p>
          <p>
            This detector fetches the page&apos;s HTML and lists every{" "}
            <span className="font-mono text-[13px] text-[#151515]">&lt;script src&gt;</span> tag it
            finds: the full URL, the domain it loads from, whether it&apos;s third-party, and -
            where the domain matches a known service - which product it belongs to. Note that
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
      <LandingFooter />
    </div>
  );
}
