import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/landing/page-shell";
import {
  FaqSection,
  RelatedLinks,
  SeoPageCta,
  faqJsonLd,
  jsonLdScript,
} from "@/components/landing/seo-page";

export const metadata: Metadata = {
  title: "Shopify Website Monitoring - Protect Your Storefront & Checkout",
  description:
    "Shopify website monitoring for stores and agencies: catch theme updates, app script changes, broken add-to-cart buttons, and SEO regressions on product pages before they cost you sales.",
  keywords: [
    "Shopify website monitoring",
    "Shopify store monitoring",
    "monitor Shopify theme changes",
    "Shopify app broke my store",
    "Shopify SEO monitoring",
    "Shopify uptime monitoring",
  ],
  alternates: { canonical: "/website-monitoring-for-shopify" },
};

const faqs = [
  {
    q: "Why monitor a Shopify store? Shopify itself rarely goes down.",
    a: "Correct - the platform is reliable, but your storefront is not the platform. Theme updates, app installs, metafield edits, and bulk product imports change what shoppers actually see. Monitoring is not about Shopify being up; it is about YOUR add-to-cart button, product SEO, and tracking pixels staying intact.",
  },
  {
    q: "Do I need to install a Shopify app?",
    a: "No. MyKavo reads your public storefront pages from the outside, exactly like a shopper. Nothing is added to your theme, no app permissions, no impact on store speed or Shopify plan limits.",
  },
  {
    q: "Can it watch my add-to-cart and checkout buttons?",
    a: "Yes. Define them as conversion elements (a CSS selector plus expectations) and MyKavo verifies on every scan that they exist, are visible, say the right thing, and point to the right place. A hidden add-to-cart button on a bestseller is a critical alert, not a Monday surprise.",
  },
  {
    q: "What about apps injecting scripts into my storefront?",
    a: "Script monitoring tracks every third-party script on your pages. When an app adds, swaps, or removes scripts - including analytics and payment scripts - you get an alert naming exactly which domain appeared or vanished.",
  },
  {
    q: "Does it work with Online Store 2.0 themes and headless Shopify?",
    a: "Yes. MyKavo renders pages in a real browser, so it monitors any storefront a browser can load: OS 2.0 themes, heavily customized Liquid, or a headless front end on Hydrogen or Next.js.",
  },
];

const related = [
  { href: "/website-monitoring-for-wordpress", label: "Website monitoring for WordPress" },
  { href: "/website-monitoring-for-webflow", label: "Website monitoring for Webflow" },
  { href: "/visual-regression-testing", label: "Visual regression testing explained" },
  { href: "/guides/website-monitoring-checklist", label: "Website monitoring checklist" },
];

export default function ShopifyMonitoringPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faqs)) }}
      />
      <MarketingPageShell
        eyebrowText="for shopify"
        title={
          <>
            Shopify website monitoring
            <br />
            for the parts that make money.
          </>
        }
        intro="Shopify website monitoring watches your storefront the way a shopper sees it: product pages, collections, landing pages, and the buttons that sell. MyKavo baselines them, re-scans on schedule, and alerts you when a theme update, app, or edit changes something that matters."
      >
        <h2>Shopify is reliable. Storefronts are fragile.</h2>
        <p>
          The platform holding 99.9%+ uptime does not protect you from your own stack. Stores
          break in quieter ways:
        </p>
        <ul>
          <li>A theme update moves the add-to-cart button below the fold on mobile.</li>
          <li>An app update injects a banner that covers your announcement bar and hero CTA.</li>
          <li>A bulk import wipes SEO titles and descriptions on 40 product pages.</li>
          <li>An uninstalled app leaves broken script tags that slow every page.</li>
          <li>A navigation edit 404s a collection that ads are still pointing at.</li>
          <li>The Meta pixel or GA4 tag disappears during a theme swap - attribution dies.</li>
        </ul>
        <p>
          Every one of those is invisible to uptime checks, because the store is technically
          &ldquo;up&rdquo; the whole time.
        </p>

        <h2>What MyKavo watches on a Shopify store</h2>
        <ul>
          <li>
            <strong>Conversion elements</strong> - add-to-cart, buy-now, checkout links, discount
            signup forms: existence, visibility, label text, and destination, checked every scan.
          </li>
          <li>
            <strong>Product and collection SEO</strong> - titles, meta descriptions, canonicals
            (Shopify generates canonical URLs; theme edits can break them), robots meta, H1s, and
            structured data your rich results depend on.
          </li>
          <li>
            <strong>Visual state</strong> - screenshot comparison per page with masks for rotating
            hero banners and recently-viewed sections.
          </li>
          <li>
            <strong>Scripts and pixels</strong> - GA4, Meta pixel, TikTok, affiliate and payment
            scripts: additions, removals, and domain changes.
          </li>
          <li>
            <strong>Links</strong> - internal links across the storefront, so renamed handles and
            deleted pages surface as one grouped broken-link alert.
          </li>
          <li>
            <strong>Performance and uptime</strong> - page weight and response-time regressions
            after app installs, plus five-minute health checks and SSL expiry on custom domains.
          </li>
        </ul>

        <h2>Set it up in one coffee</h2>
        <ol>
          <li>Add your storefront URL; MyKavo discovers pages from your sitemap.</li>
          <li>
            Pick the money pages: home, top collections, ten bestselling products, key landing
            pages.
          </li>
          <li>Mark your add-to-cart and checkout CTAs as conversion elements.</li>
          <li>Approve the baseline. Done - scans run on schedule from then on.</li>
        </ol>
        <p>
          Works alongside your theme workflow: publish a new theme, review what actually changed
          page by page, approve the new baseline in one click. See{" "}
          <Link href="/pricing">plans</Link> - most stores fit Pro.
        </p>

        <FaqSection faqs={faqs} />
        <RelatedLinks links={related} />
        <SeoPageCta heading="Watch your storefront like it pays your rent." />
      </MarketingPageShell>
    </>
  );
}
