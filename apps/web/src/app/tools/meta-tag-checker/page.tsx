import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { MetaTagChecker } from "./meta-tag-checker";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Free Meta Tag Checker",
  description:
    "Free meta tag checker: analyze any page's title tag, meta description, canonical URL, robots meta, Open Graph tags, and H1 headings - with clear pass/warn guidance.",
  alternates: { canonical: "/tools/meta-tag-checker" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Meta Tag Checker",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Check a page's title, meta description, canonical, robots meta, Open Graph tags, and H1 headings with actionable SEO guidance.",
  url: `${site.url}/tools/meta-tag-checker`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

export default function MetaTagCheckerPage() {
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
          <h1 className={`${fontDisplay} text-4xl leading-[1.08] text-[#151515] sm:text-5xl`}>
            Meta Tag{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Checker</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            Check any page&apos;s title tag, meta description, canonical URL, robots meta, Open
            Graph tags, and H1 headings - with clear pass/warn guidance. Free, no account
            needed.
          </p>
        </div>

        <MetaTagChecker />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <div>
            <p className={`${eyebrow} mb-3`}>{"// why it matters //"}</p>
            <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
              Why meta tags matter
            </h2>
          </div>
          <p>
            Meta tags are the handful of HTML elements that decide how a page appears in search
            results and social shares. The title tag (ideally 50-60 characters) is the headline
            searchers click; the meta description (120-160 characters) is the pitch underneath
            it. The canonical URL tells search engines which version of a page to rank, and a
            single stray{" "}
            <span className="rounded bg-[#F3F1E6] px-1.5 py-0.5 font-mono text-[13px] text-[#151515]">
              noindex
            </span>{" "}
            in the robots meta can silently remove the page from Google entirely.
          </p>
          <p>
            This checker fetches the page&apos;s raw HTML and grades each tag: whether it
            exists, whether its length sits in the recommended range, whether the page is
            indexable, whether Open Graph tags (og:title, og:description, og:image) are present
            for link previews, and whether the page has exactly one H1 heading. Every check
            comes with a plain-English explanation, not just a score.
          </p>
          <p>
            The dangerous part about meta tags is not getting them right once - it&apos;s
            keeping them right. CMS plugins, theme updates, migrations, and redeploys overwrite
            titles and canonicals all the time, and nobody notices until traffic drops. MyKavo
            monitors these exact tags on every page you care about and emails you the moment
            one of them changes.
          </p>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
