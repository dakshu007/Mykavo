/**
 * Category comparison content.
 *
 * DELIBERATE CHOICE: these compare MyKavo against CATEGORIES of tool (uptime
 * monitors, change-detection tools, technical SEO crawlers) rather than named
 * products with quoted prices and feature lists.
 *
 * The reason is integrity, not squeamishness. Competitor pricing and feature
 * sets change constantly, and a comparison page that states a rival's price
 * from memory is both likely to be wrong and actively harmful - to them if it
 * understates, to us if a reader checks and finds it stale. Category
 * differences ("an uptime monitor asks whether the server responded; this asks
 * what changed on the page") are definitional: true today, true next year, and
 * checkable by anyone.
 *
 * Every MyKavo figure here is verifiable from the codebase: 89 checks across
 * 22 categories (packages/seo-audit registry), plan limits (config/plans),
 * severity bands (packages/severity-engine).
 *
 * To add a named-vendor page later, source the competitor's facts from their
 * own live pricing page on the day of writing, cite the date, and re-check it
 * on a schedule. Do not write one from recollection.
 */

export interface ComparisonRow {
  capability: string;
  /** What the other category of tool typically does. */
  them: string;
  /** What MyKavo does. */
  us: string;
}

export interface Comparison {
  slug: string;
  /** Short label for the hub card and breadcrumb. */
  name: string;
  title: string;
  description: string;
  keywords: string[];
  /** The 50-70 word direct answer that opens the page. */
  capsule: string;
  /** Column header for the "them" side of the table. */
  themLabel: string;
  rows: ComparisonRow[];
  /** Where the other category genuinely wins. Stated plainly. */
  whereTheyWin: string[];
  /** Who should pick MyKavo. */
  bestFor: string;
  faqs: { q: string; a: string }[];
}

export const COMPARISONS: Comparison[] = [
  {
    slug: "uptime-monitoring",
    name: "Uptime monitoring",
    title: "Website Change Monitoring vs Uptime Monitoring",
    description:
      "Uptime monitoring tells you the server responded. Change monitoring tells you what changed on the page. A site can return HTTP 200 with a broken checkout, a noindex tag, or a missing analytics script - and every uptime tool will call it healthy.",
    keywords: [
      "uptime monitoring alternative",
      "website monitoring vs uptime monitoring",
      "beyond uptime monitoring",
      "website change monitoring",
    ],
    capsule:
      "Uptime monitoring answers one question: did the server respond? Change monitoring answers a different one: what changed on the page, and does it matter? A site can return HTTP 200 while its checkout button has vanished, its canonical tag points elsewhere, or its analytics script stopped loading. Uptime tools call all three healthy, because by their definition they are.",
    themLabel: "Uptime monitors",
    rows: [
      {
        capability: "Detects the server being down",
        them: "Yes - this is the core job, usually within a minute",
        us: "Yes - a probe every 5 minutes, with incidents opened after two consecutive failures",
      },
      {
        capability: "Detects a page returning 200 but broken",
        them: "No - a 200 response is treated as healthy",
        us: "Yes - the page is compared against an approved baseline",
      },
      {
        capability: "Detects a missing checkout or signup button",
        them: "No",
        us: "Yes - conversion elements are checked by CSS selector for existence, visibility, text and destination",
      },
      {
        capability: "Detects an index-to-noindex flip",
        them: "No",
        us: "Yes - flagged CRITICAL, the highest severity",
      },
      {
        capability: "Detects analytics or payment scripts disappearing",
        them: "No",
        us: "Yes - recognised services are named, and their removal is flagged HIGH",
      },
      {
        capability: "Shows before-and-after evidence",
        them: "No - the alert is that a check failed",
        us: "Yes - previous and current values, plus screenshot diffs for visual change",
      },
      {
        capability: "SSL certificate expiry warnings",
        them: "Commonly yes",
        us: "Yes - an incident opens 14 days before expiry",
      },
    ],
    whereTheyWin: [
      "Sub-minute detection intervals, where MyKavo probes every five minutes",
      "Multi-region probing to distinguish a real outage from a regional network fault",
      "Phone, SMS and pager escalation policies for on-call rotations",
      "Monitoring APIs, TCP ports and infrastructure rather than rendered web pages",
    ],
    bestFor:
      "Teams who already know when the site is down, and keep getting caught by the failures that happen while it is up.",
    faqs: [
      {
        q: "What is the difference between uptime monitoring and website change monitoring?",
        a: "Uptime monitoring checks whether a server responds and how fast. Change monitoring captures what a page contained and compares it against a later capture, reporting what differs. The first catches outages; the second catches regressions that leave the site technically online - a broken form, a deleted section, a canonical tag pointing at the wrong URL.",
      },
      {
        q: "Do I still need an uptime monitor if I use MyKavo?",
        a: "MyKavo runs its own uptime probe every five minutes with SSL expiry tracking and incident history, which is enough for most small teams and agencies. If you run on-call rotations and need sub-minute detection, multi-region probing or phone escalation, keep a dedicated uptime tool and use MyKavo for what changed rather than what is down.",
      },
      {
        q: "Can an uptime monitor detect a broken checkout button?",
        a: "No. An uptime monitor requests the URL and checks the status code and response time. If the page returns HTTP 200 the check passes, regardless of what the page now contains. Detecting a missing button requires comparing the rendered page against a known-good version, which is a different kind of check entirely.",
      },
      {
        q: "How quickly does MyKavo detect a change?",
        a: "Availability and SSL are checked every five minutes. Page content is compared on your scan schedule - weekly on the free plan, daily on Pro, plus on-demand manual scans. Change monitoring is deliberately less frequent than an uptime ping because each scan renders the page in a real browser and captures a full screenshot.",
      },
    ],
  },
  {
    slug: "visual-change-detection",
    name: "Change detection tools",
    title: "MyKavo vs Simple Website Change Detection Tools",
    description:
      "Most change detectors tell you a page changed. The hard part is telling you whether it matters. MyKavo scores every change by severity, groups them per scan, and suppresses the dynamic content that makes simpler tools cry wolf.",
    keywords: [
      "website change detection tools",
      "page change monitor alternative",
      "visual change detection",
      "website change detector",
    ],
    capsule:
      "Simple change detectors answer whether a page changed. That is the easy half. The hard half is deciding whether the change matters, because most pages change constantly - rotating banners, timestamps, view counts, ad slots. A tool that flags all of it trains you to ignore it. MyKavo scores each change by severity and suppresses known noise.",
    themLabel: "Simple change detectors",
    rows: [
      {
        capability: "Tells you a page changed",
        them: "Yes - this is the core job",
        us: "Yes",
      },
      {
        capability: "Tells you whether the change matters",
        them: "Rarely - most report any difference equally",
        us: "Yes - every change is scored INFO through CRITICAL by a rules engine",
      },
      {
        capability: "Suppresses dynamic content noise",
        them: "Often a single ignore-region box, if anything",
        us: "Ignored CSS selectors, screenshot masks, stabilisation waits, animation disabling and comparison thresholds",
      },
      {
        capability: "Handles content shifting down the page",
        them: "Usually not - a pixel diff reports most of the page as changed",
        us: "Yes - rows are matched by content, so inserted text does not flag everything below it",
      },
      {
        capability: "Understands SEO elements specifically",
        them: "No - text is text",
        us: "Yes - title, description, canonical, robots meta, H1 and indexability are compared as distinct fields with their own severity rules",
      },
      {
        capability: "Approved-baseline workflow",
        them: "Usually compares against the previous check",
        us: "Compares against a baseline you approved, so expected changes stop re-alerting once accepted",
      },
      {
        capability: "Groups alerts",
        them: "Often one alert per change",
        us: "One grouped summary per scan per website",
      },
    ],
    whereTheyWin: [
      "Watching a page you do not own, such as a competitor's pricing page or a job board",
      "Setup measured in seconds when you only need one URL watched",
      "Browser-extension workflows that need no account at all",
      "Free tiers that watch more URLs than MyKavo's free plan does",
    ],
    bestFor:
      "Anyone who tried a change detector, drowned in false positives, and turned the alerts off.",
    faqs: [
      {
        q: "Why do website change detectors produce so many false positives?",
        a: "Because most pages genuinely change on every load. Rotating banners, relative timestamps, view counters, ad slots and animation frames all differ between two captures without anything meaningful having changed. A tool that reports every difference is technically correct and practically useless, which is why suppression and severity scoring matter more than detection itself.",
      },
      {
        q: "How does MyKavo reduce false positives?",
        a: "Six mechanisms: ignored CSS selectors removed before comparison, screenshot masks painted over volatile regions, stabilisation waits for fonts and network quiet, animations disabled at capture, comparison thresholds below which nothing is reported, and an approved-baseline model so an accepted change stops re-alerting. Content that shifts down the page is also matched by row rather than position.",
      },
      {
        q: "What is an approved baseline?",
        a: "A baseline is the version of a page you have confirmed is correct. Every later scan is compared against it rather than against the previous scan. This matters because it means an intentional redesign is approved once and then stops alerting, instead of a chain of comparisons where each scan only sees the last one.",
      },
      {
        q: "Can MyKavo monitor a website I do not own?",
        a: "MyKavo is built for sites you own or are authorised to monitor, and it respects robots.txt. If you want to watch a competitor's page, a lightweight change-detection tool or browser extension is the more appropriate choice. MyKavo's free Website Change Detector tool can compare two public URLs on demand without an account.",
      },
    ],
  },
  {
    slug: "seo-crawlers",
    name: "Technical SEO crawlers",
    title: "MyKavo vs Technical SEO Crawlers",
    description:
      "Technical SEO crawlers audit a site on demand. MyKavo audits it and then keeps watching, so a regression introduced next Tuesday is caught next Tuesday rather than at your next quarterly crawl.",
    keywords: [
      "technical SEO crawler alternative",
      "site audit tool",
      "SEO site audit alternative",
      "continuous SEO monitoring",
    ],
    capsule:
      "A technical SEO crawler gives you a thorough snapshot when you run it. MyKavo runs a comparable crawl - 89 checks across 22 categories - and then keeps watching, comparing each scan against an approved baseline. The difference is not depth on day one; it is whether anyone notices the regression introduced six weeks later.",
    themLabel: "SEO crawlers",
    rows: [
      {
        capability: "Full technical crawl",
        them: "Yes - typically deeper, with more checks",
        us: "Yes - 89 checks across 22 categories, up to 1,500 pages per audit",
      },
      {
        capability: "Runs continuously without you starting it",
        them: "Usually scheduled at best, often manual",
        us: "Yes - scans run on a schedule and alert only on change",
      },
      {
        capability: "Alerts when something regresses",
        them: "Rarely - the output is a report you read",
        us: "Yes - severity-ranked alerts grouped per scan",
      },
      {
        capability: "Visual regression detection",
        them: "No",
        us: "Yes - full-page screenshot comparison with pixel diffs",
      },
      {
        capability: "Correlates issues with real search data",
        them: "Sometimes, in the larger suites",
        us: "Yes - Search Console data joined to audit findings as Priority Opportunities",
      },
      {
        capability: "Keyword rank tracking and backlink analysis",
        them: "Yes in the large suites - a core reason to buy them",
        us: "No - deliberately out of scope",
      },
      {
        capability: "JavaScript rendering during audit",
        them: "Commonly yes",
        us: "Not in the site audit - it is fetch-based to stay fast and free. Change monitoring does render pages in a real browser",
      },
    ],
    whereTheyWin: [
      "Depth of technical checks, especially on very large sites",
      "Keyword research, rank tracking and backlink analysis, which MyKavo does not do at all",
      "Competitor research and market share analysis",
      "JavaScript rendering across an entire crawl, which MyKavo's audit does not do",
      "Crawling sites far larger than 1,500 pages in one pass",
    ],
    bestFor:
      "Teams who run an audit, fix the list, and then have no idea when something breaks it again.",
    faqs: [
      {
        q: "Is MyKavo a replacement for a technical SEO crawler?",
        a: "For continuous monitoring of a site you already maintain, yes. For deep one-off audits of very large sites, keyword research, rank tracking or backlink analysis, no - MyKavo deliberately does none of those. Many teams run a dedicated crawler occasionally and MyKavo continuously, because the jobs are different.",
      },
      {
        q: "How many checks does the MyKavo site audit run?",
        a: "89 checks across 22 categories: crawlability, indexability, HTTP status, titles, meta descriptions, headings, internal and external links, images, URLs, structured data, social tags, security, performance, sitemaps, international, accessibility, mobile, content, HTML hygiene and trust signals. Every issue explains what it means, why it matters and which URLs it was found on.",
      },
      {
        q: "What is the difference between a site audit and change monitoring?",
        a: "An audit asks what is wrong with the site right now. Change monitoring asks what is different from the version you approved. An audit finds a missing meta description that has always been missing; monitoring catches the canonical tag that was correct last week and is not any more. MyKavo does both, and correlates them.",
      },
      {
        q: "Does the site audit render JavaScript?",
        a: "No. The audit is fetch-based, which is what allows it to crawl up to 1,500 pages quickly and stay included in a $20 plan. Per-page browser rendering at that scale would not be economical. Change monitoring is different: it renders every monitored page in a real browser and captures a screenshot, because visual comparison requires it.",
      },
    ],
  },
];

export function findComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
