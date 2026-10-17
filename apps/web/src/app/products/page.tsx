import type { Metadata } from "next";
import Link from "next/link";
import { withSocial } from "@/lib/social-metadata";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { OurProductCard } from "@/components/landing/our-product-card";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import {
  OUR_PRODUCTS,
  OUR_PRODUCTS_PAGE_PATH,
  OUR_PRODUCT_KINDS,
  ourProductsByKind,
  productHref,
  type OurProductKind,
} from "@/config/our-products";
import { site } from "@/config/site";
import { TOOLS_HUB_PATH } from "@/config/tools";
import { breadcrumbList, jsonLdScript } from "@/lib/seo/structured-data";

export const metadata: Metadata = withSocial({
  title: "More from the MyKavo team",
  description:
    "Other products built by the team behind MyKavo: BillZap, ShrinkTo, and the Image Size Inspector, Spacing Inspector and EEAT Analyser Chrome extensions.",
  alternates: { canonical: OUR_PRODUCTS_PAGE_PATH },
});

const KIND_ORDER: OurProductKind[] = ["app", "extension"];

const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "More from the MyKavo team",
  url: `${site.url}${OUR_PRODUCTS_PAGE_PATH}`,
  publisher: { "@type": "Organization", name: site.name, url: site.url },
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: OUR_PRODUCTS.length,
    itemListElement: OUR_PRODUCTS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.name,
      url: productHref(p),
    })),
  },
};

export default function OurProductsPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(collectionJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "Our products", path: OUR_PRODUCTS_PAGE_PATH }])),
        }}
      />
      <LandingNav />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// our products //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-5xl`}>
            More from the{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">MyKavo team</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            We also build these. Same team, same care. They are our own products, not partners or
            integrations, and each one runs on its own site.
          </p>
        </div>

        {KIND_ORDER.map((kind) => {
          const products = ourProductsByKind(kind);
          const headingId = `products-${kind}`;
          return (
            <section key={kind} aria-labelledby={headingId} className="mt-16">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-2 border-b border-[#151515]/10 pb-3">
                <h2 id={headingId} className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
                  {OUR_PRODUCT_KINDS[kind].title}
                </h2>
                <p className="text-[14px] text-[#6B6B60]">{OUR_PRODUCT_KINDS[kind].description}</p>
              </div>
              <ul className={`grid gap-4 sm:grid-cols-2 ${products.length > 2 ? "lg:grid-cols-3" : ""}`}>
                {products.map((p) => (
                  <li key={p.slug}>
                    <OurProductCard product={p} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <section className="mt-24">
          <div className="mx-auto max-w-4xl rounded-[28px] border border-[#151515] bg-[#151515] px-6 py-14 text-center shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]">
            <h2 className={`${fontDisplay} mx-auto max-w-xl text-3xl leading-tight text-[#E9EBDF] sm:text-4xl`}>
              Looking after websites? <span className="text-[#FFD400]">That is MyKavo.</span>
            </h2>
            <p className="mx-auto mb-8 mt-3 max-w-md text-[15px] leading-7 text-[#9C9E93]">
              MyKavo watches the pages you care about and tells you when something important
              changes or breaks.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex rounded-full bg-[#FFD400] px-7 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
              >
                Start Monitoring Free
              </Link>
              <Link
                href={TOOLS_HUB_PATH}
                className="inline-flex rounded-full border border-[#E9EBDF]/30 px-7 py-3.5 text-sm font-semibold text-[#E9EBDF] transition-colors hover:border-[#E9EBDF]"
              >
                Browse free tools
              </Link>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
