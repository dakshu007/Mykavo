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
  title: "Website Monitoring Checklist - What to Watch & Best Practices",
  description:
    "A practical website monitoring checklist: the signals to watch (uptime, visual, SEO, links, scripts, performance), how often to check each, and the best practices that keep alerts trustworthy.",
  keywords: [
    "website monitoring checklist",
    "website monitoring best practices",
    "what to monitor on a website",
    "website health checklist",
    "site monitoring checklist",
  ],
  alternates: { canonical: "/guides/website-monitoring-checklist" },
};

const faqs = [
  {
    q: "What should I monitor on a website?",
    a: "Eight signal groups cover nearly everything: availability (uptime, SSL), HTTP status per page, visual state, SEO tags (titles, canonicals, robots meta), content, internal links, third-party scripts, and performance (response time, page weight). Add conversion elements - the specific buttons and forms that earn money - as a ninth.",
  },
  {
    q: "How often should each check run?",
    a: "Uptime: every few minutes. Page-level change scans: daily for business sites, weekly for low-change sites. Deep audits (Lighthouse, full crawls): weekly or monthly. The cadence rule: how long can you afford NOT to know this broke?",
  },
  {
    q: "What is the most important website monitoring best practice?",
    a: "Protect alert trust. Every false positive teaches your team to ignore the channel. Normalize dynamic content, mask volatile regions, group related changes into one alert, and route severities differently - critical pages someone now, info waits in a digest.",
  },
  {
    q: "Do I need separate tools for uptime, visual, and SEO monitoring?",
    a: "Not anymore. Point tools exist for each, but stitching four dashboards together is how changes fall through the cracks. MyKavo runs uptime, SSL, visual, SEO, content, link, script, performance, and element checks in one scan with one severity-ranked alert stream.",
  },
];

const related = [
  { href: "/guides/how-to-monitor-website-changes", label: "How to monitor website changes" },
  { href: "/guides/website-maintenance-checklist", label: "Website maintenance checklist" },
  { href: "/guides/website-deployment-checklist", label: "Website deployment checklist" },
  { href: "/seo-monitoring", label: "SEO monitoring: what to track" },
];

export default function MonitoringChecklistPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faqs)) }}
      />
      <MarketingPageShell
        eyebrowText="checklist"
        title={
          <>
            The website monitoring
            <br />
            checklist.
          </>
        }
        intro="A complete website monitoring checklist: which signals to watch, how often to check each one, and the best practices that keep your alerts worth reading. Work through it once and you will know exactly where your current setup is blind."
      >
        <h2>Continuous (every few minutes)</h2>
        <ul>
          <li>Uptime probe on your primary domain and any critical subdomains.</li>
          <li>SSL certificate validity and days-to-expiry warning (14 days out minimum).</li>
          <li>DNS resolving to the right place after any registrar or CDN change.</li>
        </ul>

        <h2>Every scan (daily for business sites)</h2>
        <ul>
          <li>HTTP status per monitored page - 200 stays 200; 404/500 flips are critical.</li>
          <li>Redirects - no new chains, destinations unchanged.</li>
          <li>Visual state vs baseline - screenshot diff with masks for dynamic regions.</li>
          <li>Title tags, meta descriptions, canonicals per page.</li>
          <li>Robots meta - index/noindex exactly as intended (flips are critical).</li>
          <li>H1s and structured data present and unchanged.</li>
          <li>Visible text and DOM structure vs baseline (real content changes only).</li>
          <li>Internal links - no new broken links; important nav links still present.</li>
          <li>
            Third-party scripts - analytics, tag manager, pixels, payment scripts all present;
            no unknown scripts added.
          </li>
          <li>Response time and page weight within thresholds of baseline.</li>
          <li>
            Conversion elements - signup/checkout/contact CTAs exist, are visible, say the right
            thing, and point to the right place.
          </li>
        </ul>

        <h2>Weekly</h2>
        <ul>
          <li>Lighthouse or equivalent performance audit on key pages; watch the trend.</li>
          <li>robots.txt content unchanged; sitemap.xml reachable and current.</li>
          <li>
            Review the week&apos;s change events - approve intentional ones so baselines stay
            true.
          </li>
          <li>Uptime and incident summary per site (client-ready if you run an agency).</li>
        </ul>

        <h2>Monthly</h2>
        <ul>
          <li>Review monitored-page list - add new landing pages, retire dead ones.</li>
          <li>Re-check alert routing: right people, right channels, right severities.</li>
          <li>Audit ignore rules and masks - still valid, not hiding real changes.</li>
          <li>Spot-check mobile rendering on your highest-traffic pages.</li>
        </ul>

        <h2>Best practices that keep alerts trustworthy</h2>
        <ol>
          <li>
            <strong>Baseline, then compare.</strong> Comparing against an approved known-good
            state beats comparing against &ldquo;yesterday&rdquo; - drift never gets normalized
            by accident.
          </li>
          <li>
            <strong>Kill false positives aggressively.</strong> Mask carousels, timestamps, and
            feeds. An alert channel people mute is worse than no channel.
          </li>
          <li>
            <strong>Rank by severity, route by severity.</strong> A noindex flip pages someone
            immediately; a meta description tweak waits for the digest.
          </li>
          <li>
            <strong>Group related changes.</strong> Seventeen broken links is one incident, not
            seventeen emails.
          </li>
          <li>
            <strong>Keep evidence.</strong> Every alert should carry before and after - it turns
            &ldquo;something changed&rdquo; into a fixable ticket.
          </li>
          <li>
            <strong>Monitor from outside.</strong> Check what visitors actually receive, not what
            your CMS thinks it published.
          </li>
        </ol>
        <p>
          MyKavo automates every item in the daily and continuous sections - and most of the
          weekly ones - from a single scan per page. See{" "}
          <Link href="/guides/how-to-monitor-website-changes">
            how to set up change monitoring
          </Link>{" "}
          in about ten minutes.
        </p>

        <FaqSection faqs={faqs} />
        <RelatedLinks links={related} />
        <SeoPageCta heading="Automate this checklist tonight." />
      </MarketingPageShell>
    </>
  );
}
