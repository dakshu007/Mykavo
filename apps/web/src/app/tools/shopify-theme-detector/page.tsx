import type { Metadata } from "next";
import { withSocial } from "@/lib/social-metadata";
import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { ToolFaqSection } from "@/components/landing/tool-faq";
import { ToolConversionCta } from "@/components/tools/tool-conversion-cta";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { site } from "@/config/site";
import { ShopifyDetector } from "./shopify-detector";
import { SHOPIFY_DETECTOR_FAQS } from "./faqs";

const DESCRIPTION =
  "Free Shopify theme detector: enter a store URL to see its theme, the original theme it was built from, its version, and the apps the page loads.";

export const metadata: Metadata = withSocial({
  title: "Shopify Theme Detector - What Theme & Apps Is That Store Using?",
  description: DESCRIPTION,
  alternates: { canonical: "/tools/shopify-theme-detector" },
});

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Shopify Theme & App Detector",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
  url: `${site.url}/tools/shopify-theme-detector`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

const mono = "font-mono text-[13px] text-[#151515]";
const inlineLink = "font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4";

export default function ShopifyThemeDetectorPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav />
      <main className="mx-auto max-w-225 px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// free tool //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-5xl`}>
            Shopify Theme &amp; App{" "}
            <span className="relative inline-block">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Detector</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            See which Shopify theme a store runs, the original theme behind a renamed one, its version, whether it came
            from the Theme Store, and the apps the page loads. Free, no account needed.
          </p>
        </div>

        <ShopifyDetector />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>How Shopify theme detection works</h2>
          <p>
            Shopify writes a small <span className={mono}>Shopify.theme</span> object into every storefront page. It holds
            the theme&apos;s name in the merchant&apos;s library, its <span className={mono}>schema_name</span> and{" "}
            <span className={mono}>schema_version</span>, which name the original theme and its version even after a
            rename, and a <span className={mono}>theme_store_id</span> that is only set for Theme Store themes. The
            detector reads that object, plus the store&apos;s myshopify.com address when the page exposes it.
          </p>
          <p>
            Apps are found from the files they load. Theme app extensions are served from{" "}
            <span className={mono}>cdn.shopify.com/extensions/</span> with the app&apos;s handle in the path, and older
            apps load scripts from their own domains, such as Klaviyo or Judge.me. Apps that run only in the admin, or
            only on pages you didn&apos;t check, leave nothing to find, so the list shows what this page reveals and
            nothing more.
          </p>
          <p>
            For store owners, every theme update and app install is a change to what shoppers see, and Shopify won&apos;t
            tell you when one breaks a page. MyKavo watches your storefront from outside with nothing to install. A{" "}
            <Link href="/shopify-app" className={inlineLink}>
              MyKavo app for Shopify
            </Link>{" "}
            is coming soon; until then, see{" "}
            <Link href="/website-monitoring-for-shopify" className={inlineLink}>
              website monitoring for Shopify
            </Link>
            .
          </p>
        </section>

        <ToolConversionCta
          heading="Know when a theme update or app breaks your store."
          body="MyKavo re-scans your product and landing pages on a schedule and alerts you when a script disappears, an SEO tag changes, or a button you watch goes missing."
        />

        <ToolFaqSection faqs={SHOPIFY_DETECTOR_FAQS} toolName="Shopify Theme & App Detector" toolPath="/tools/shopify-theme-detector" />
      </main>
      <LandingFooter />
    </div>
  );
}
