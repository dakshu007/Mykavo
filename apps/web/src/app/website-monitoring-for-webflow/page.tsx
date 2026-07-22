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
  title: "Webflow Website Monitoring - Know What Every Publish Changed",
  description:
    "Webflow website monitoring for designers and agencies: see exactly what each publish changed across pages - layout, SEO settings, interactions, embeds - and catch client-editor mistakes before visitors do.",
  keywords: [
    "Webflow website monitoring",
    "Webflow site monitoring",
    "monitor Webflow changes",
    "Webflow publish broke site",
    "Webflow SEO monitoring",
    "Webflow client editor changes",
  ],
  alternates: { canonical: "/website-monitoring-for-webflow" },
};

const faqs = [
  {
    q: "Why monitor a Webflow site? Webflow hosting is solid.",
    a: "The risk on Webflow is rarely hosting - it is publishing. Every publish pushes the entire site live at once: your changes, a teammate's half-finished section, and whatever a client edited in the Editor. Monitoring shows you what actually changed on the live pages after each publish, so surprises get caught the same day.",
  },
  {
    q: "Does MyKavo integrate with Webflow or need an embed?",
    a: "No integration needed. MyKavo monitors the published site from the outside in a real browser. No custom code embed, nothing added to your project, works on any plan.",
  },
  {
    q: "Can it catch client Editor changes?",
    a: "Yes. Content edits made through the Webflow Editor show up in the next scan as content and visual changes against your approved baseline - with before-and-after evidence, so you can tell 'client updated pricing copy' from 'client accidentally deleted the CTA section'.",
  },
  {
    q: "What Webflow-specific SEO issues does it catch?",
    a: "Duplicate or missing canonicals when a page's SEO settings are edited, noindex toggles left on after staging reviews, title and meta description changes per page, and the webflow.io staging subdomain accidentally becoming indexable relative to your custom domain.",
  },
  {
    q: "Does it handle Webflow interactions and animations?",
    a: "Yes. Screenshot capture waits for the page to stabilize and disables animations for deterministic comparison, and you can mask elements that intentionally move - so IX2-heavy pages compare cleanly instead of generating noise.",
  },
];

const related = [
  { href: "/website-monitoring-for-wordpress", label: "Website monitoring for WordPress" },
  { href: "/website-monitoring-for-shopify", label: "Website monitoring for Shopify" },
  { href: "/guides/website-deployment-checklist", label: "Website deployment checklist" },
  { href: "/seo-monitoring", label: "SEO monitoring: what to track" },
];

export default function WebflowMonitoringPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faqs)) }}
      />
      <MarketingPageShell
        eyebrowText="for webflow"
        title={
          <>
            Webflow website monitoring
            <br />
            for everything a publish touches.
          </>
        }
        intro="Webflow website monitoring baselines your published site and compares every page after each publish or Editor session - layout, copy, SEO settings, embeds, scripts - then alerts you with before-and-after proof when something important changed."
      >
        <h2>The publish button is powerful. That is the problem.</h2>
        <p>
          One click pushes every staged change live across the whole site. That includes things
          nobody meant to ship:
        </p>
        <ul>
          <li>A style tweak on one component that reflows sections on six other pages.</li>
          <li>A client Editor session that rewrote copy and nudged a CTA out of view.</li>
          <li>Page SEO settings edited in the Designer - a canonical dropped, a noindex left on.</li>
          <li>A custom-code embed pasted with a broken script tag that kills tracking.</li>
          <li>A CMS collection change that empties a section on every collection page.</li>
          <li>A renamed slug that quietly 404s links from your nav, blog, and running ads.</li>
        </ul>
        <p>
          Webflow shows you the Designer canvas. MyKavo shows you what visitors and Google
          actually got after the publish.
        </p>

        <h2>What MyKavo watches on a Webflow site</h2>
        <ul>
          <li>
            <strong>Per-page visual state</strong> - full-page screenshots compared against the
            baseline you approved, with masks for sliders and intentionally animated sections.
          </li>
          <li>
            <strong>SEO settings as rendered</strong> - titles, meta descriptions, canonicals,
            robots meta and noindex flips, Open Graph tags, H1s: the values actually served, not
            the ones you think you set.
          </li>
          <li>
            <strong>CMS-driven pages</strong> - monitor template pages (a blog post, a project
            page) so collection changes that break the template are caught once, clearly.
          </li>
          <li>
            <strong>Custom code and scripts</strong> - head/body embeds, analytics, chat widgets:
            script additions, removals, and swapped domains.
          </li>
          <li>
            <strong>Links</strong> - internal links across the site, grouping slug renames and
            deleted pages into one broken-link alert instead of forty.
          </li>
          <li>
            <strong>Uptime and SSL</strong> - health checks on your custom domain plus
            certificate expiry warnings.
          </li>
        </ul>

        <h2>A designer-friendly workflow</h2>
        <ol>
          <li>Add the site; pages are discovered from your sitemap automatically.</li>
          <li>Approve baselines for key static pages plus one page per CMS template.</li>
          <li>Publish like you always do.</li>
          <li>
            The next scan shows exactly what the publish changed, scored by severity. Approve the
            intentional changes; fix the accidental ones with the diff in hand.
          </li>
        </ol>
        <p>
          Agencies run this across every client project from one dashboard - see{" "}
          <Link href="/pricing">pricing</Link>.
        </p>

        <FaqSection faqs={faqs} />
        <RelatedLinks links={related} />
        <SeoPageCta heading="Publish with a safety net under every page." />
      </MarketingPageShell>
    </>
  );
}
