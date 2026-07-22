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
  title: "SEO Monitoring Tool - Get Alerted When Rankings-Critical Tags Change",
  description:
    "SEO monitoring tools watch the on-page elements rankings depend on: titles, canonicals, robots meta, noindex flips, redirects, structured data. MyKavo alerts you the day they change, with before-and-after values.",
  keywords: [
    "SEO monitoring tools",
    "SEO monitoring",
    "SEO change monitoring",
    "monitor SEO changes",
    "canonical tag monitoring",
    "noindex monitoring",
    "meta tag monitoring",
  ],
  alternates: { canonical: "/seo-monitoring" },
};

const faqs = [
  {
    q: "What is SEO monitoring?",
    a: "SEO monitoring continuously checks the on-page elements search rankings depend on - title tags, meta descriptions, canonical URLs, robots meta, redirects, H1s, structured data, and indexability - and alerts you when any of them change. It answers 'did something change that could affect rankings?' the day it happens, not after traffic drops.",
  },
  {
    q: "How is SEO monitoring different from rank tracking?",
    a: "Rank trackers measure the outcome: where you rank. SEO change monitoring watches the cause: what changed on your pages. By the time a rank tracker shows a drop, the damaging change may be weeks old. Monitoring catches the noindex flip or lost canonical the same day it ships.",
  },
  {
    q: "Which SEO changes are most dangerous?",
    a: "Index-to-noindex flips, 200-to-404 or 500 status changes, canonical tags removed or pointed elsewhere, and redirects changing destination. These can deindex pages or bleed link equity in days. MyKavo flags all four as high or critical severity out of the box.",
  },
  {
    q: "Do I still need Ahrefs, Semrush, or Screaming Frog?",
    a: "They solve different problems. Crawlers and suites are for research and periodic audits: keywords, backlinks, site-wide crawls. MyKavo is the always-on tripwire between audits - it tells you when a specific page's SEO state changed against its approved baseline. Many teams run both.",
  },
  {
    q: "Can it monitor robots.txt and sitemaps?",
    a: "Yes. MyKavo tracks robots.txt content changes, sitemap availability, and per-page indexability signals, alongside redirect chains - the plumbing that quietly decides whether Google can see your pages at all.",
  },
];

const related = [
  { href: "/tools/meta-tag-checker", label: "Free tool: Meta Tag Checker" },
  { href: "/tools/redirect-chain-checker", label: "Free tool: Redirect Chain Checker" },
  { href: "/guides/how-to-monitor-website-changes", label: "How to monitor website changes" },
  { href: "/website-content-monitoring", label: "Website content monitoring" },
];

export default function SeoMonitoringPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faqs)) }}
      />
      <MarketingPageShell
        eyebrowText="seo monitoring"
        title={
          <>
            SEO monitoring that catches
            <br />
            the change before the drop.
          </>
        }
        intro="An SEO monitoring tool watches the on-page elements rankings depend on and alerts you when they change. MyKavo baselines every monitored page and flags title rewrites, canonical losses, noindex flips, redirect changes, and status errors with exact before-and-after values."
      >
        <h2>Traffic drops are lagging indicators</h2>
        <p>
          Most SEO disasters are not penalties. They are ordinary changes nobody noticed: a
          release that shipped <code>noindex</code> to production, a plugin that rewrote title
          tags, a migration that dropped canonicals, a redirect pointed at the wrong page. Search
          Console shows you the damage weeks later. The fix window is the day it happened.
        </p>

        <h2>What an SEO monitoring tool should watch</h2>
        <table>
          <thead>
            <tr>
              <th>Signal</th>
              <th>Why it matters</th>
              <th>Typical severity when it changes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Indexability (robots meta)</td>
              <td>index to noindex removes the page from Google</td>
              <td>Critical</td>
            </tr>
            <tr>
              <td>HTTP status</td>
              <td>200 to 404/500 deindexes and burns crawl budget</td>
              <td>Critical</td>
            </tr>
            <tr>
              <td>Canonical URL</td>
              <td>Removed or redirected canonicals leak ranking signals</td>
              <td>High</td>
            </tr>
            <tr>
              <td>Redirects</td>
              <td>New chains and changed destinations dilute equity</td>
              <td>Medium to High</td>
            </tr>
            <tr>
              <td>Title tag</td>
              <td>Your headline in the SERP - rewrites move CTR and rankings</td>
              <td>Medium</td>
            </tr>
            <tr>
              <td>Meta description</td>
              <td>CTR lever; silent rewrites are common after plugin updates</td>
              <td>Low to Medium</td>
            </tr>
            <tr>
              <td>H1s and structured data</td>
              <td>Relevance signals and rich-result eligibility</td>
              <td>Medium</td>
            </tr>
            <tr>
              <td>robots.txt and sitemap</td>
              <td>Site-wide crawl control - small edits, huge blast radius</td>
              <td>High</td>
            </tr>
          </tbody>
        </table>
        <p>
          MyKavo checks all of these on every scan, against the approved baseline for each page,
          and shows the previous value next to the current one in every alert.
        </p>

        <h2>Where MyKavo fits among SEO tools</h2>
        <ul>
          <li>
            <strong>Research suites</strong> (Ahrefs, Semrush) - keywords, backlinks, competitor
            data. Periodic, outward-looking.
          </li>
          <li>
            <strong>Crawlers</strong> (Screaming Frog) - deep site audits when you run them.
            Snapshot, not sentry.
          </li>
          <li>
            <strong>Search Console</strong> - Google&apos;s view, delayed by days to weeks.
          </li>
          <li>
            <strong>MyKavo</strong> - the always-on change detector for the pages you already
            rank with. It does not replace the others; it makes sure their hard-won results do
            not quietly evaporate between audits.
          </li>
        </ul>

        <h2>Start with your money pages</h2>
        <p>
          You do not need to monitor every URL. Baseline the pages that earn: the homepage, top
          landing pages, category pages, and your best-ranking content. Try the free{" "}
          <Link href="/tools/meta-tag-checker">Meta Tag Checker</Link> on any URL to see the
          signals MyKavo tracks, then put those pages under continuous watch.
        </p>

        <FaqSection faqs={faqs} />
        <RelatedLinks links={related} />
        <SeoPageCta heading="Put a tripwire on every ranking you own." />
      </MarketingPageShell>
    </>
  );
}
