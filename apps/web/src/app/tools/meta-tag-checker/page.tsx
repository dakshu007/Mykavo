import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { MetaTagChecker } from "./meta-tag-checker";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Free Meta Tag Checker",
  description:
    "Free meta tag checker: analyze any page's title tag, meta description, canonical URL, robots meta, Open Graph tags, and H1 headings — with clear pass/warn guidance.",
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
            Meta Tag Checker
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-ink-secondary">
            Check any page&apos;s title tag, meta description, canonical URL, robots meta, Open
            Graph tags, and H1 headings — with clear pass/warn guidance. Free, no account
            needed.
          </p>
        </div>

        <MetaTagChecker />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-ink-secondary">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Why meta tags matter
          </h2>
          <p>
            Meta tags are the handful of HTML elements that decide how a page appears in search
            results and social shares. The title tag (ideally 50–60 characters) is the headline
            searchers click; the meta description (150–160 characters) is the pitch underneath
            it. The canonical URL tells search engines which version of a page to rank, and a
            single stray <span className="font-mono text-[13px] text-ink">noindex</span> in the
            robots meta can silently remove the page from Google entirely.
          </p>
          <p>
            This checker fetches the page&apos;s raw HTML and grades each tag: whether it
            exists, whether its length sits in the recommended range, whether the page is
            indexable, whether Open Graph tags (og:title, og:description, og:image) are present
            for link previews, and whether the page has exactly one H1 heading. Every check
            comes with a plain-English explanation, not just a score.
          </p>
          <p>
            The dangerous part about meta tags is not getting them right once — it&apos;s
            keeping them right. CMS plugins, theme updates, migrations, and redeploys overwrite
            titles and canonicals all the time, and nobody notices until traffic drops. Fluxen
            monitors these exact tags on every page you care about and emails you the moment
            one of them changes.
          </p>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
