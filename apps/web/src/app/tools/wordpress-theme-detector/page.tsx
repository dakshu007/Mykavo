import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { ToolFaqSection } from "@/components/landing/tool-faq";
import { ToolConversionCta } from "@/components/tools/tool-conversion-cta";
import { WORDPRESS_DETECTOR_FAQS } from "@/config/tool-faqs";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { WordPressDetector } from "./wordpress-detector";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "WordPress Theme Detector - What Theme & Plugins Is That Site Using?",
  description:
    "Free WordPress theme and plugin detector: enter any URL to see the theme, its version and author, the parent theme, and the plugins the page loads.",
  alternates: { canonical: "/tools/wordpress-theme-detector" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "WordPress Theme & Plugin Detector",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Free WordPress theme and plugin detector: enter any URL to see the theme, its version and author, the parent theme, and the plugins the page loads.",
  url: `${site.url}/tools/wordpress-theme-detector`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

export default function WordPressThemeDetectorPage() {
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
            WordPress Theme &amp; Plugin{" "}
            <span className="relative inline-block">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Detector</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            See what WordPress theme a site uses - its name, version, author and parent theme - plus the plugins the page loads, from Yoast and WooCommerce to Elementor. Free, no account needed.
          </p>
        </div>

        <WordPressDetector />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
            How WordPress theme detection works
          </h2>
          <p>
            Every WordPress theme and plugin lives in its own folder, and the files it loads keep that folder in their address: <span className="font-mono text-[13px] text-[#151515]">/wp-content/themes/astra/</span> or <span className="font-mono text-[13px] text-[#151515]">/wp-content/plugins/woocommerce/</span>. The detector reads the page&apos;s HTML, collects those folders, then opens the theme&apos;s <span className="font-mono text-[13px] text-[#151515]">style.css</span>, whose header names the theme, its version, its author and - for a child theme - the parent it&apos;s built on.
          </p>
          <p>
            Popular plugins that announce themselves in the page, such as Yoast SEO, Rank Math, WooCommerce and Elementor, are recognised too. What no outside tool can see is a plugin that never loads anything on the public page: most security, backup and admin tools work only inside wp-admin. Results show what this page reveals, nothing invented.
          </p>
          <p>
            Running WordPress yourself? Themes and plugins update constantly, and an update that breaks a layout or a checkout button still returns 200 OK, so uptime monitors stay green. The free <Link href="/wordpress-plugin" className="font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4">MyKavo WordPress plugin</Link> checks your key pages after every update and names the update behind any change.
          </p>
        </section>

        <ToolConversionCta
          heading="Plugin updates break pages quietly. Find out which one did it."
          body="MyKavo checks your WordPress site's key pages after every plugin, theme and core update, and shows you exactly what changed, with screenshots, before customers notice."
        />

        <ToolFaqSection faqs={WORDPRESS_DETECTOR_FAQS} toolName="WordPress Theme & Plugin Detector" toolPath="/tools/wordpress-theme-detector" />
      </main>
      <LandingFooter />
    </div>
  );
}
