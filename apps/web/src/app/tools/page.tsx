import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { ToolConversionCta } from "@/components/tools/tool-conversion-cta";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { TOOL_CATEGORIES, TOOLS, TOOLS_HUB_PATH, toolHref, toolsByCategory, type ToolCategory } from "@/config/tools";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Free Website & SEO Tools - No Signup",
  description: `${TOOLS.length} free tools to check any page: noindex, canonical, robots.txt, broken links, SSL expiry, page size, schema, analytics tags, and WordPress and Shopify detection. No account needed.`,
  alternates: { canonical: TOOLS_HUB_PATH },
};

const CATEGORY_ORDER: ToolCategory[] = ["seo", "health", "detect"];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      name: "Free website and SEO tools",
      url: `${site.url}${TOOLS_HUB_PATH}`,
      publisher: { "@type": "Organization", name: site.name, url: site.url },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: TOOLS.length,
        itemListElement: TOOLS.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: t.name,
          url: `${site.url}${toolHref(t.slug)}`,
        })),
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site.url },
        { "@type": "ListItem", position: 2, name: "Free tools", item: `${site.url}${TOOLS_HUB_PATH}` },
      ],
    },
  ],
};

export default function ToolsHubPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// free tools //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-5xl`}>
            Check any page,{" "}
            <span className="relative inline-block">
              <span aria-hidden className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]" />
              <span className="relative">free.</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            {TOOLS.length} tools built on the same engine that runs MyKavo&apos;s monitoring. Paste a URL, get an
            answer. No account, no email.
          </p>
        </div>

        <nav aria-label="Tool categories" className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2">
          {CATEGORY_ORDER.map((cat) => (
            <a
              key={cat}
              href={`#${cat}`}
              className="rounded-full border border-[#151515]/15 bg-white px-4 py-1.5 text-[13px] font-medium text-[#151515]/80 transition-colors hover:border-[#151515] hover:text-[#151515]"
            >
              {TOOL_CATEGORIES[cat].title}
              <span className="ml-1.5 font-mono text-[11px] text-[#6B6B60]">{toolsByCategory(cat).length}</span>
            </a>
          ))}
        </nav>

        {CATEGORY_ORDER.map((cat) => (
          <section key={cat} id={cat} className="mt-16 scroll-mt-28">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2 border-b border-[#151515]/10 pb-3">
              <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>{TOOL_CATEGORIES[cat].title}</h2>
              <p className="text-[14px] text-[#6B6B60]">{TOOL_CATEGORIES[cat].description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {toolsByCategory(cat).map((t) => (
                <Link
                  key={t.slug}
                  href={toolHref(t.slug)}
                  className="group flex gap-4 rounded-2xl border border-black/10 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#151515] hover:shadow-[4px_4px_0_#151515]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FFD400]/30 text-[#151515] transition-colors group-hover:bg-[#FFD400]">
                    <t.icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-[#151515]">{t.name}</span>
                      {t.isNew && (
                        <span className="rounded-full bg-[#151515] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#FFD400]">
                          New
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[13px] leading-6 text-[#151515]/65">{t.blurb}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <ToolConversionCta
          heading="These tools check a page once. MyKavo watches it every day."
          body="Approve a baseline of the pages that matter and get a severity-ranked alert, with before-and-after proof, when a title, canonical, noindex, script, link or layout changes."
        />
      </main>
      <LandingFooter />
    </div>
  );
}
