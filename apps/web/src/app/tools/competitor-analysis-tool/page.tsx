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
import { breadcrumbList } from "@/lib/seo/structured-data";

/**
 * Competitor monitoring - the same scanner, pointed outward.
 *
 * Monitoring your own site is a grudge purchase: insurance against a thing you
 * hope never happens. Watching a competitor is the opposite - people do it for
 * free, daily, by hand. Identical engineering, a far easier thing to want, so
 * it earns its own page rather than a bullet on an existing one.
 *
 * Lives under /tools/ because that is the slug that targets the query. It is a
 * landing page, not one of the six no-signup tools beside it - the CTA goes to
 * signup rather than an input box, which is the honest framing.
 */

export const metadata: Metadata = {
  title: "Competitor Analysis Tool - Track Every Change on a Rival's Website",
  description:
    "Monitor competitor websites automatically. MyKavo tracks pricing changes, new pages, copy rewrites, and SEO edits on any public site - and emails you the before-and-after the day it changes.",
  keywords: [
    "competitor analysis tool",
    "competitor monitoring",
    "track competitor website changes",
    "competitor price monitoring",
    "monitor competitor pricing page",
    "website change tracker for competitors",
  ],
  alternates: { canonical: "/tools/competitor-analysis-tool" },
};

const faqs = [
  {
    q: "What is a competitor analysis tool?",
    a: "A competitor analysis tool watches a rival's public website and reports what changed. MyKavo captures an approved snapshot of the pages you pick - pricing, homepage, features, careers - re-checks them on a schedule, and emails you the exact before-and-after when anything moves. You find out the day their price changes rather than the month after.",
  },
  {
    q: "Can I monitor a competitor's pricing page for changes?",
    a: "Yes, and it is the single most-watched page type. Add the pricing URL as a monitored page and MyKavo alerts you when the numbers, plan names, feature lists, or the CTA change - with the previous and current values side by side and a screenshot diff showing exactly which part of the page moved.",
  },
  {
    q: "Do I need permission to monitor a competitor's website?",
    a: "MyKavo reads public pages the same way a browser or a search engine does, and it obeys robots.txt. It cannot see anything behind a login, and it never attempts to. If a page is publicly reachable, checking whether it changed is ordinary competitive research.",
  },
  {
    q: "How is this different from Ahrefs or Semrush competitor analysis?",
    a: "Research suites tell you about a competitor's keywords, backlinks and estimated traffic - the outcome of what they do. MyKavo tells you what they actually changed, and when. Different question, different moment: one is for quarterly strategy, the other tells you this morning that their pricing page moved overnight.",
  },
  {
    q: "What kinds of competitor changes can it catch?",
    a: "Pricing and plan changes, new or removed pages, homepage and positioning rewrites, new third-party scripts (a switch in analytics or chat vendor), added or removed CTAs, title and meta description rewrites, and structural site changes. Every alert carries the previous value, the current value, and a screenshot diff.",
  },
  {
    q: "How often does it check?",
    a: "Daily on the Pro plan, weekly on the free plan. You can also run a check manually whenever you want - handy the day a rival announces something and you want to see precisely what moved on the site.",
  },
  {
    q: "Is there a free competitor monitoring plan?",
    a: "Yes. The free plan covers one website with five monitored pages, checked weekly, with email alerts and no card required. That is enough to watch one competitor's pricing, homepage, and three other pages that matter.",
  },
];

const related = [
  { href: "/tools/website-change-detector", label: "Free tool: Website Change Detector" },
  { href: "/tools/meta-tag-checker", label: "Free tool: Meta Tag Checker" },
  { href: "/seo-monitoring", label: "SEO monitoring" },
  { href: "/compare/visual-change-detection", label: "Compared with simple change detectors" },
];

export default function CompetitorAnalysisToolPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            // One crumb, not two: there is no /tools index page, so a "Tools"
            // parent would have to point at this page's own URL - a breadcrumb
            // whose parent is its child, which is worse than no depth at all.
            breadcrumbList([
              { name: "Competitor Analysis Tool", path: "/tools/competitor-analysis-tool" },
            ]),
          ),
        }}
      />
      <MarketingPageShell
        eyebrowText="competitor analysis"
        title={
          <>
            Know what your competitor
            <br />
            changed. The day they change it.
          </>
        }
        intro="A competitor analysis tool that watches the pages that matter - pricing, homepage, features - and emails you the exact before-and-after when anything moves. Public pages only, no login required, set up in two minutes."
      >
        <h2>Most competitor research is a snapshot. This is a tripwire.</h2>
        <p>
          You already check a rival&apos;s pricing page now and then. You open it, squint, try to
          remember what it said last time, and move on. The changes you actually care about -
          a price cut, a new plan, a repositioned homepage - happen on a random Tuesday when
          nobody is looking.
        </p>
        <p>
          MyKavo takes an approved snapshot of the pages you pick, re-checks them on a schedule,
          and tells you the moment one moves. Not &quot;something changed&quot; - the old value,
          the new value, and a screenshot showing which part of the page is different.
        </p>

        <h2>What it catches on a competitor&apos;s site</h2>
        <table>
          <thead>
            <tr>
              <th>Change</th>
              <th>What it usually means</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Pricing or plan names change</td>
              <td>A repositioning, a discount test, or a new tier aimed at your customers</td>
            </tr>
            <tr>
              <td>Homepage headline rewritten</td>
              <td>A shift in positioning - often the first public sign of a strategy change</td>
            </tr>
            <tr>
              <td>New pages appear</td>
              <td>A launch, a new market, or a feature they are about to announce</td>
            </tr>
            <tr>
              <td>Pages disappear</td>
              <td>A product being quietly retired</td>
            </tr>
            <tr>
              <td>Third-party scripts change</td>
              <td>They switched analytics, chat, or payment vendor</td>
            </tr>
            <tr>
              <td>Titles and meta descriptions rewritten</td>
              <td>An SEO push on the keywords you both want</td>
            </tr>
            <tr>
              <td>CTAs added or removed</td>
              <td>A funnel experiment worth knowing about</td>
            </tr>
          </tbody>
        </table>

        <h2>How to set it up</h2>
        <ol>
          <li>
            <strong>Add their domain</strong> as a monitored website. MyKavo discovers the pages
            from their sitemap and internal links.
          </li>
          <li>
            <strong>Pick the pages worth watching.</strong> Pricing first, then the homepage,
            then whichever feature or comparison pages overlap with yours.
          </li>
          <li>
            <strong>Approve the baseline.</strong> This is &quot;what their site looks like
            today&quot;.
          </li>
          <li>
            <strong>Get told when it moves.</strong> One grouped email per check, with the
            before-and-after for each change.
          </li>
        </ol>

        <h2>Public pages only - and that is the whole point</h2>
        <p>
          MyKavo reads exactly what a browser or a search engine reads, and it obeys{" "}
          <code>robots.txt</code>. It cannot see anything behind a login and never tries. Checking
          whether a public page changed is ordinary competitive research - the same thing you do
          by hand, done on a schedule and with a memory.
        </p>

        <h2>The same tool, pointed both ways</h2>
        <p>
          MyKavo was built to watch <em>your</em> sites and tell you when something breaks. Point
          it at a competitor and the identical machinery becomes market intelligence. Most people
          end up running both: their own money pages under watch for regressions, and two or
          three rivals under watch for moves.
        </p>
        <p>
          If you want to see the mechanism before signing up, the free{" "}
          <Link href="/tools/website-change-detector">Website Change Detector</Link> compares any
          two versions of a page in the browser, no account needed.
        </p>

        <FaqSection faqs={faqs} />
        <RelatedLinks links={related} />
        <SeoPageCta heading="Watch their pricing page so you don't have to." />
      </MarketingPageShell>
    </>
  );
}
