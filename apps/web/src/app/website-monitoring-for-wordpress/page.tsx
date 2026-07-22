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
  title: "WordPress Website Monitoring - Catch Plugin & Theme Breakage",
  description:
    "WordPress website monitoring for agencies and site owners: detect what plugin updates, theme changes, and client edits actually changed on your pages - visual, SEO, links, scripts - with before-and-after proof.",
  keywords: [
    "WordPress website monitoring",
    "WordPress monitoring tool",
    "monitor WordPress site changes",
    "WordPress plugin update broke site",
    "WordPress maintenance monitoring",
    "WordPress uptime monitoring",
  ],
  alternates: { canonical: "/website-monitoring-for-wordpress" },
};

const faqs = [
  {
    q: "Why do WordPress sites need change monitoring?",
    a: "WordPress sites change without anyone deploying: plugins auto-update, themes update, editors change content, and page builders re-render markup. Each of those can silently break layout, SEO tags, tracking scripts, or forms. Change monitoring compares every page against an approved baseline so you find out from an alert, not from a client.",
  },
  {
    q: "Does MyKavo need a WordPress plugin?",
    a: "No. MyKavo monitors the rendered public pages from the outside, like a visitor does. Nothing is installed on the site, so it works on hardened installs, headless WordPress, and sites where you cannot add plugins - and it cannot slow the site down or conflict with anything.",
  },
  {
    q: "Can it tell me if a plugin update broke my site?",
    a: "Yes, that is the core use case. After an update, the next scan compares each monitored page against its baseline and flags what changed: a shifted layout, a missing form, a removed analytics script, new PHP warnings rendered into the page, or a page that now returns a 500.",
  },
  {
    q: "Does it monitor WooCommerce checkouts?",
    a: "You can monitor any WooCommerce page and define conversion elements - the add-to-cart button, the checkout button, the payment scripts - so MyKavo alerts you if they disappear, get hidden, or stop pointing where they should.",
  },
  {
    q: "How is this different from a WordPress maintenance plugin?",
    a: "Backup and maintenance plugins run inside the site and manage updates. MyKavo verifies the result from the outside: after every update or edit, did the pages your visitors see actually stay correct? Agencies typically run both.",
  },
];

const related = [
  { href: "/guides/website-maintenance-checklist", label: "Website maintenance checklist" },
  { href: "/visual-regression-testing", label: "Visual regression testing without test code" },
  { href: "/guides/website-monitoring-checklist", label: "Website monitoring checklist" },
  { href: "/website-monitoring-for-shopify", label: "Website monitoring for Shopify" },
];

export default function WordPressMonitoringPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faqs)) }}
      />
      <MarketingPageShell
        eyebrowText="for wordpress"
        title={
          <>
            WordPress website monitoring
            <br />
            that catches what updates break.
          </>
        }
        intro="WordPress website monitoring watches your rendered pages for the damage plugin updates, theme changes, and client edits leave behind - broken layouts, lost SEO tags, missing forms, vanished tracking scripts - and alerts you with before-and-after proof. No plugin to install."
      >
        <h2>The WordPress problem: your site changes without you</h2>
        <p>
          A WordPress site is never static. Plugins auto-update overnight. The theme vendor ships
          a new version. A client &ldquo;just fixed a typo&rdquo; in Elementor and dragged a
          section out of place. WP-Cron fires. Any of these can change what visitors and Google
          see - and none of them tell you what actually changed on the page.
        </p>
        <p>What that looks like in practice:</p>
        <ul>
          <li>An SEO plugin update rewrites title tags or drops canonical URLs site-wide.</li>
          <li>A page builder update re-renders markup and breaks the mobile layout.</li>
          <li>A caching plugin serves a stale, half-styled version of the homepage.</li>
          <li>A form plugin update silently removes the contact form from /contact.</li>
          <li>A tag manager snippet disappears from the theme header - analytics flatline.</li>
          <li>An update fatal-errors a template and a key page starts returning 500.</li>
        </ul>

        <h2>What MyKavo watches on a WordPress site</h2>
        <ul>
          <li>
            <strong>Visual state</strong> - full-page screenshot comparison against your approved
            baseline, with page-builder-friendly ignore rules for sliders and dynamic sections.
          </li>
          <li>
            <strong>SEO tags</strong> - titles, meta descriptions, canonicals, robots meta,
            noindex flips (a critical alert - staging settings reaching production is a classic
            WordPress accident), H1s, and structured data.
          </li>
          <li>
            <strong>Content and markup</strong> - normalized DOM and visible-text comparison, so
            real edits surface and framework noise does not.
          </li>
          <li>
            <strong>Links</strong> - every internal link checked; a plugin that rewrites
            permalinks and 404s half your blog shows up as one grouped alert.
          </li>
          <li>
            <strong>Scripts</strong> - analytics, Tag Manager, pixels, and payment scripts;
            additions are as interesting as removals (compromised plugins inject scripts).
          </li>
          <li>
            <strong>Uptime, SSL, and performance</strong> - five-minute health checks plus page
            weight and response-time regressions after heavy updates.
          </li>
        </ul>

        <h2>The agency workflow</h2>
        <ol>
          <li>Add each client site and let MyKavo discover pages via the sitemap.</li>
          <li>Approve baselines for the pages that matter: home, services, contact, checkout.</li>
          <li>Run your plugin/theme updates as usual (or let them auto-update).</li>
          <li>MyKavo re-scans on schedule and compares against the approved baselines.</li>
          <li>
            Get one severity-ranked alert per site with before-and-after evidence - fix what
            broke, approve what was intentional, and attach the weekly report to your maintenance
            retainer.
          </li>
        </ol>
        <p>
          One dashboard covers every client install - see{" "}
          <Link href="/pricing">pricing for agencies and freelancers</Link>.
        </p>

        <FaqSection faqs={faqs} />
        <RelatedLinks links={related} />
        <SeoPageCta heading="Monitor your WordPress sites from the outside in." />
      </MarketingPageShell>
    </>
  );
}
