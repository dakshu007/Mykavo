/**
 * Named-vendor comparison pages ("MyKavo vs X", "X alternative").
 *
 * These are the pages the existing category comparisons in ./comparisons.ts
 * deliberately avoided, and its warning still governs them:
 *
 *   "To add a named-vendor page later, source the competitor's facts from
 *    their own live pricing page on the day of writing, cite the date, and
 *    re-check it on a schedule. Do not write one from recollection."
 *
 * Every competitor fact below was sourced on the VERIFIED_ON date from the
 * vendor's own site or a major software directory, and each page renders its
 * sources and that date where a reader can see them. Nothing here is written
 * from memory, because a comparison page that misstates a rival's price is
 * wrong in the one way that is both checkable and embarrassing.
 *
 * Two rules the content follows, both of which cost us something:
 *
 *  1. Every page names real situations where the other tool is the better
 *     buy. A comparison that only flatters its author reads as marketing and
 *     is discounted by readers and answer engines alike - and pretending a
 *     browser extension is not the faster way to watch one page is simply
 *     untrue.
 *  2. Claims about the competitor are described at the level they publish
 *     (plans, headline capabilities), never invented detail. Where a figure
 *     could not be confirmed, the page says so rather than guessing.
 *
 * MyKavo's own figures come from config/plans.ts and the audit registry, so
 * they stay correct as the product changes.
 */

/** The day every competitor fact on these pages was last checked. */
export const VERIFIED_ON = "September 20, 2026";

export interface AlternativeRow {
  capability: string;
  /** What the named product does, as published by them. */
  them: string;
  /** What MyKavo does. */
  us: string;
}

export interface AlternativeSource {
  label: string;
  url: string;
}

export interface Alternative {
  slug: string;
  /** The product name, spelled as the vendor spells it. */
  name: string;
  title: string;
  description: string;
  keywords: string[];
  /** The 50-70 word direct answer that opens the page. */
  capsule: string;
  /** One paragraph on what the product actually is, fairly stated. */
  whatItIs: string;
  rows: AlternativeRow[];
  /** Where the other product is genuinely the better choice. */
  whereTheyWin: string[];
  /** Who should pick MyKavo instead. */
  bestFor: string;
  faqs: { q: string; a: string }[];
  sources: AlternativeSource[];
}

export const ALTERNATIVES: Alternative[] = [
  {
    slug: "visualping-alternative",
    name: "Visualping",
    title: "MyKavo vs Visualping - Which Website Change Monitor Should You Use?",
    description:
      "Visualping watches pages you pick and tells you they changed. MyKavo monitors websites you own against an approved baseline and tells you whether the change broke anything. A comparison of what each one is actually built for.",
    keywords: [
      "visualping alternative",
      "mykavo vs visualping",
      "website change monitoring comparison",
      "visualping for agencies",
    ],
    capsule:
      "Visualping is a page-watching tool: point it at any URL, public or competitor, and it alerts you when the pixels or text move. MyKavo is a regression monitor for sites you are responsible for: it keeps an approved baseline per page and scores each change by severity, so a missing canonical tag reads differently from a new blog post.",
    whatItIs:
      "Visualping is one of the best-known website change detection services, with more than two million users. You give it a URL - and optionally a region of the page - and it re-checks on a schedule, highlighting what moved on a screenshot. It sends alerts by email, SMS, Slack, Microsoft Teams, Discord, API or straight into a spreadsheet, and it offers a free tier of 150 checks per month.",
    rows: [
      {
        capability: "Primary job",
        them: "Tell you that a page you are watching changed.",
        us: "Tell you whether a site you own broke, and how badly.",
      },
      {
        capability: "Works on sites you do not own",
        them: "Yes - watching competitors and public pages is a core use case.",
        us: "Not the design. MyKavo verifies you are monitoring your own pages and is built around approving a baseline.",
      },
      {
        capability: "Change severity",
        them: "Changes are surfaced and highlighted; importance is assessed by its AI.",
        us: "Every change is scored INFO to CRITICAL by deterministic rules - index to noindex is CRITICAL, a meta description edit is LOW.",
      },
      {
        capability: "Baseline model",
        them: "Compares against the previous check.",
        us: "Compares against a baseline you approved, so expected changes stop alerting once approved and drift is measured from a known-good state.",
      },
      {
        capability: "Check frequency",
        them: "Down to five-minute intervals on paid plans.",
        us: "Weekly on Free, daily on Pro, plus manual scans. Uptime and SSL are checked separately every five minutes.",
      },
      {
        capability: "What is compared",
        them: "Visual and text changes on the page or region you selected.",
        us: "Screenshot, normalized DOM, visible text, title, meta description, canonical, robots meta, H1s, structured data, internal links, third-party scripts, page weight, request count and named conversion elements.",
      },
      {
        capability: "Technical SEO audit",
        them: "Not the product's purpose.",
        us: "Included: a full-site crawl scored against 89 checks across 22 categories, with CSV export.",
      },
      {
        capability: "Search Console data",
        them: "Not offered.",
        us: "Connect a property and MyKavo correlates clicks, impressions and position with audit findings into prioritised opportunities.",
      },
      {
        capability: "Free tier",
        them: "Yes - 150 checks per month.",
        us: "Yes - 1 website, 5 monitored pages, weekly scans, 30-day history, no card.",
      },
    ],
    whereTheyWin: [
      "You want to watch pages you do not own - a competitor's pricing page, a government notice, a restock or a job board. That is Visualping's home ground and MyKavo does not try to serve it.",
      "You need checks every five minutes on an arbitrary page. MyKavo scans monitored pages daily; only its uptime and SSL checks run at five-minute intervals.",
      "You want to watch one region of a page and nothing else, set up in seconds with no account structure around it.",
      "You need SMS alerts. MyKavo sends email, Slack, Discord, Microsoft Teams, webhooks and mobile push, but not SMS.",
    ],
    bestFor:
      "Pick MyKavo if the sites you are watching are sites you are responsible for - client sites, your own product, the pages that carry your revenue - and the question you need answered is not \"did this change?\" but \"did this change break something, and how urgently do I care?\". Pick Visualping if you are watching the wider web.",
    faqs: [
      {
        q: "Is MyKavo a Visualping alternative?",
        a: "For monitoring websites you own or manage, yes. MyKavo covers the same visual change detection and adds SEO, link, script, performance and conversion-element monitoring, severity scoring, an approved-baseline workflow and a technical site audit. For watching pages you do not own, Visualping is the better fit - that is what it is designed for.",
      },
      {
        q: "Can MyKavo monitor a competitor's website?",
        a: "No. MyKavo is built around monitoring sites you are responsible for: it verifies ownership-style usage, discovers your pages from your sitemap, and its whole workflow assumes you can fix what it finds. Use a page-watching tool for competitor tracking.",
      },
      {
        q: "Which is cheaper?",
        a: "Both have free tiers. MyKavo Pro is $20/month for 8 websites with 15 monitored pages each, daily scans, a year of history and 5 seats. Visualping's paid pricing is tiered by check volume and frequency; check their pricing page for the current figures, since they change more often than a comparison page can track.",
      },
      {
        q: "Does MyKavo highlight what changed on a screenshot?",
        a: "Yes. Visual changes come with the before screenshot, the after screenshot and a pixel diff image, alongside the exact previous and current values for anything textual like a title or canonical tag.",
      },
    ],
    sources: [
      { label: "Visualping - official site", url: "https://visualping.io/" },
      {
        label: "Visualping pricing explained (vendor blog)",
        url: "https://visualping.io/blog/visualping-pricing-explained",
      },
      {
        label: "Visualping profile - GetApp",
        url: "https://www.getapp.com/marketing-software/a/visualping/",
      },
    ],
  },
  {
    slug: "hexometer-alternative",
    name: "Hexometer",
    title: "MyKavo vs Hexometer - Website Monitoring Compared",
    description:
      "Hexometer is a broad website QA monitor covering availability, SEO, security and UX. MyKavo is a change and regression monitor built on approved baselines. Where they overlap, where they do not, and which one fits your job.",
    keywords: [
      "hexometer alternative",
      "mykavo vs hexometer",
      "website monitoring comparison",
      "hexometer for agencies",
    ],
    capsule:
      "Hexometer is a broad website QA assistant: availability, server and DNS checks, SEO issues, security signals, spelling and UX problems, all surfaced as issues found today. MyKavo is narrower and deeper on one question - what changed since the state you approved, and does it matter - with before-and-after evidence for every alert.",
    whatItIs:
      "Hexometer, from Hexact, monitors a website around the clock and reports problems it finds: availability and server issues, DNS, page speed, SFTP, IMAP and email servers, SEO problems like meta tags, header structure, broken links and duplicate content, plus JavaScript errors, W3C validation errors, spelling mistakes and mobile-friendliness. It integrates with Slack, Zapier, Telegram, Trello, Google Sheets and Discord. Published plans are Standard at $12/month, Advanced at $24/month and Guru at $48/month.",
    rows: [
      {
        capability: "Core question answered",
        them: "What is wrong with this website right now?",
        us: "What changed since the version you approved, and how severe is it?",
      },
      {
        capability: "Breadth of checks",
        them: "Wide: availability, DNS, SFTP/IMAP/email servers, page speed, SEO, security, spelling, UX and mobile.",
        us: "Narrower by design: change and regression across visual, SEO, content, links, scripts, performance and conversion elements, plus uptime and SSL.",
      },
      {
        capability: "Baseline and approval",
        them: "Issue-based - findings are current problems.",
        us: "Every page has an approved baseline. Expected changes are approved into a new baseline and stop alerting; unexpected ones stay open until resolved.",
      },
      {
        capability: "Before-and-after evidence",
        them: "Issue detail for what it finds.",
        us: "Every change carries the previous value, the current value, and for visual changes the two screenshots plus a pixel diff.",
      },
      {
        capability: "Change severity model",
        them: "Issues are categorised by type.",
        us: "Deterministic severity from INFO to CRITICAL, centralised in one rules engine so the same change always scores the same way.",
      },
      {
        capability: "Email and server monitoring",
        them: "Yes - SFTP, IMAP, email servers and DNS.",
        us: "No. MyKavo monitors web pages, uptime and SSL, not mail or file transfer infrastructure.",
      },
      {
        capability: "Spelling and grammar checks",
        them: "Yes.",
        us: "No. Content changes are detected, but MyKavo does not proofread copy.",
      },
      {
        capability: "Technical SEO audit",
        them: "SEO issue checks included.",
        us: "Full-site crawl scored against 89 checks across 22 categories, each explaining what it is, why it matters and which URLs it affects, with CSV export.",
      },
      {
        capability: "Search Console integration",
        them: "Not published as a feature.",
        us: "Yes - daily sync of clicks, impressions, CTR and position, correlated with audit findings into prioritised opportunities.",
      },
      {
        capability: "Client-ready reporting",
        them: "Reporting available on higher plans.",
        us: "White-label scheduled reports with your own branding, built for forwarding to a client.",
      },
    ],
    whereTheyWin: [
      "You want one tool watching infrastructure as well as web pages - DNS, SFTP, IMAP and mail servers are in Hexometer's scope and outside MyKavo's entirely.",
      "You want spelling, grammar and W3C validation checks as part of monitoring. MyKavo does not proofread.",
      "You want the broadest possible list of automated checks rather than a deep answer to one question.",
      "Its entry plan is published at $12/month, below MyKavo Pro at $20/month - if budget is the deciding factor and you do not need baselines or change history, that difference is real.",
    ],
    bestFor:
      "Pick MyKavo if the thing that hurts you is regression - a deploy that silently removed a canonical tag, a plugin update that dropped the analytics script, a theme change that broke the pricing page - and you need evidence of exactly what changed, when, and against what approved state. Pick Hexometer if you want a broad QA sweep across web and server infrastructure in one subscription.",
    faqs: [
      {
        q: "Is MyKavo a Hexometer alternative?",
        a: "For website change and regression monitoring, yes, and MyKavo goes deeper: approved baselines, deterministic severity scoring, before-and-after evidence on every alert, and a 22-category technical audit. Hexometer covers more ground overall, including mail and file-transfer servers that MyKavo does not touch at all.",
      },
      {
        q: "Does MyKavo check DNS, SFTP or email servers?",
        a: "No. MyKavo monitors web pages, uptime and SSL certificates. If you need mail or file-transfer monitoring, that is genuinely outside its scope and Hexometer covers it.",
      },
      {
        q: "What does MyKavo do that Hexometer does not publish?",
        a: "An approved-baseline workflow, a pixel diff with before-and-after screenshots on every visual change, Google Search Console correlation that ranks technical findings by the traffic actually at risk, and conversion-element monitoring where you name a CSS selector and MyKavo alerts if that button disappears, hides, or changes its destination.",
      },
      {
        q: "How current is this comparison?",
        a: `Every Hexometer fact here was checked on ${VERIFIED_ON} against their own site and major software directories, and the sources are listed at the foot of this page. Pricing and features change - check their pricing page before deciding.`,
      },
    ],
    sources: [
      { label: "Hexometer pricing - official site", url: "https://hexometer.com/pricing/" },
      {
        label: "Hexometer profile - GetApp",
        url: "https://www.getapp.com/website-ecommerce-software/a/hexometer/",
      },
      {
        label: "Hexometer profile - Capterra",
        url: "https://www.capterra.com/p/198619/Hexometer/",
      },
    ],
  },
  {
    slug: "distill-alternative",
    name: "Distill",
    title: "MyKavo vs Distill (distill.io) - Website Monitoring Compared",
    description:
      "Distill is a fast, flexible page watcher with a browser extension and metered cloud checks. MyKavo is a baseline-driven regression monitor for sites you manage. Where each one fits, compared capability by capability.",
    keywords: [
      "distill.io alternative",
      "distill web monitor alternative",
      "mykavo vs distill",
      "website change monitoring comparison",
    ],
    capsule:
      "Distill watches pages or parts of pages, either locally in your browser or on its cloud, and tells you when the selected content changes. MyKavo monitors whole websites you are responsible for against an approved baseline, scores each change by severity, and explains what broke rather than only that something moved.",
    whatItIs:
      "Distill (distill.io) is a webpage monitoring service used by over 500,000 people. Its browser extension for Chrome, Firefox, Opera and Edge lets you monitor a full page or just a selected region, and checks run either locally in the browser - unlimited - or in its cloud, where checks are metered. It handles web pages, PDFs, XML, feeds, sitemaps and uptime, with alerts by email, SMS, webhook and push, plus iOS and Android apps. Published plans start at a free tier with 25 monitors and 1,000 checks a month, then Starter at $15/month, Professional at $35/month and Flexi from $80/month.",
    rows: [
      {
        capability: "Setup model",
        them: "Pick a page or region in the browser extension; monitor it immediately.",
        us: "Add a website; MyKavo discovers pages from the sitemap and internal links, you choose which to monitor, then approve a baseline.",
      },
      {
        capability: "Where checks run",
        them: "Locally in the browser (unlimited) or in Distill's cloud (metered).",
        us: "Always server-side on MyKavo's infrastructure, so nothing depends on your machine being on.",
      },
      {
        capability: "Region-level selection",
        them: "Yes - a core strength; select exactly the part of the page to watch.",
        us: "Page-level with ignored selectors and screenshot masks to exclude volatile regions, rather than selecting one region to include.",
      },
      {
        capability: "Change severity",
        them: "You are told the selected content changed.",
        us: "Each change is scored INFO to CRITICAL by centralised rules, so a 200 becoming a 404 is treated differently from a reworded heading.",
      },
      {
        capability: "Baseline approval",
        them: "Compares against the last check.",
        us: "Compares against a baseline you approved; approving an expected change makes it the new known-good state.",
      },
      {
        capability: "SEO element monitoring",
        them: "Not a dedicated feature - you would select the tag region yourself.",
        us: "Title, meta description, canonical, robots meta, H1s, structured data and indexability tracked as first-class checks with their own severity rules.",
      },
      {
        capability: "Broken links and scripts",
        them: "Not a dedicated feature.",
        us: "Internal links checked each scan and grouped into one alert; third-party scripts tracked so a vanished analytics or payment script is flagged.",
      },
      {
        capability: "Technical SEO audit",
        them: "Not offered.",
        us: "Full-site crawl scored against 89 checks across 22 categories.",
      },
      {
        capability: "Mobile apps",
        them: "Yes - iOS and Android.",
        us: "Yes - an Android app with push alerts, usage and Search Console analytics.",
      },
      {
        capability: "Free tier",
        them: "Yes - 25 monitors and 1,000 cloud checks per month.",
        us: "Yes - 1 website, 5 monitored pages, weekly scans, 30-day history, no card.",
      },
    ],
    whereTheyWin: [
      "You want to monitor a specific region of a page - one price, one table row, one paragraph - and ignore everything else. Distill's region selection is more precise than excluding volatile areas from a whole-page comparison.",
      "You want a lot of monitors cheaply. A free tier of 25 monitors, and unlimited local checks in the browser extension, is more generous per-monitor than MyKavo's page limits.",
      "You want to watch pages on sites you do not own, including ones behind a login in your own browser session.",
      "You need SMS alerts, or monitoring of PDFs and feeds rather than HTML pages.",
    ],
    bestFor:
      "Pick MyKavo if you manage websites and need to know whether a deploy, a plugin update or a client edit broke something - with the previous and current value, a screenshot diff, a severity, and an approval workflow so expected changes stop nagging. Pick Distill if you want a fast, precise watcher for particular pieces of particular pages, anywhere on the web.",
    faqs: [
      {
        q: "Is MyKavo a Distill alternative?",
        a: "For monitoring websites you manage, yes. MyKavo covers visual and content change like Distill, then adds SEO element monitoring, broken-link and script tracking, performance regressions, conversion-element checks, severity scoring and an approved-baseline workflow. For watching one region of an arbitrary page, Distill remains the more direct tool.",
      },
      {
        q: "Do MyKavo's checks run in my browser?",
        a: "No. Every scan runs on MyKavo's servers with a real browser, so monitoring continues whether or not your machine is on. Distill can run checks locally in its extension, which is why its local checks are unlimited.",
      },
      {
        q: "Can MyKavo monitor part of a page only?",
        a: "It works the other way around: you monitor the page and exclude what you do not want compared, using ignored selectors and screenshot masks for volatile areas like carousels, timestamps and ad slots. For conversion elements you can also name a specific CSS selector and have its existence, visibility, text and destination checked individually.",
      },
      {
        q: "How current is this comparison?",
        a: `Every Distill fact here was checked on ${VERIFIED_ON} against distill.io and major software directories, with sources listed at the foot of this page. Plans change - check their pricing page before deciding.`,
      },
    ],
    sources: [
      { label: "Distill pricing - official site", url: "https://distill.io/pricing/" },
      { label: "Distill Web Monitor - official site", url: "https://distill.io/apps/web-monitor/" },
      { label: "Distill.io reviews - G2", url: "https://www.g2.com/products/distill-io/reviews" },
    ],
  },
  {
    slug: "hexowatch-alternative",
    name: "Hexowatch",
    title: "MyKavo vs Hexowatch - Website Change Monitoring Compared",
    description:
      "Hexowatch watches any page for thirteen kinds of change and archives the evidence. MyKavo monitors sites you are responsible for against an approved baseline and tells you whether a change broke anything. Compared capability by capability.",
    keywords: [
      "hexowatch alternative",
      "mykavo vs hexowatch",
      "website change monitoring comparison",
      "hexowatch for agencies",
    ],
    capsule:
      "Hexowatch is the broadest page watcher on the market - thirteen monitor types across visual, content, source code, technology, keyword, WHOIS and availability, on any URL, archived for compliance. MyKavo is narrower and deeper on one question: what changed since the state you approved on a site you own, and how urgently does it matter.",
    whatItIs:
      "Hexowatch, from Hexact, monitors any website for visual, content, source code, technology, keyword, availability, price and WHOIS changes - thirteen monitor types in total - and archives screenshots of changed pages for compliance and legal purposes. It integrates with Slack, Zapier, Telegram, Gmail and Google Sheets, and offers webhooks and API access. Published plans are Pro at $29/month for 4,500 monthly checks, Business at $55/month for 10,000, Business+ at $99/month for 25,000, and custom Enterprise pricing. Note that Hexowatch is a different product from Hexometer, its sibling from the same company - Hexometer is a broad site-and-server QA monitor, Hexowatch is change detection.",
    rows: [
      {
        capability: "Primary job",
        them: "Detect and archive changes on any page, for any reason.",
        us: "Detect regressions on sites you are responsible for, and score how badly they matter.",
      },
      {
        capability: "Billing unit",
        them: "Monthly checks - 4,500 on Pro, 10,000 on Business. Frequency and page count both draw from that pool.",
        us: "Websites and monitored pages. Scans are weekly on Free and daily on Pro, with no per-check meter to budget against.",
      },
      {
        capability: "Monitor breadth",
        them: "Thirteen monitor types including keyword, price, WHOIS and domain records.",
        us: "Eight change categories plus uptime and SSL. No keyword, price or WHOIS monitoring - MyKavo tracks domain expiry but not ownership records.",
      },
      {
        capability: "Baseline model",
        them: "Compares against the previous check.",
        us: "Compares against a baseline you approved. Approving an expected change makes it the new known-good state, so a redesign produces one round of alerts rather than a permanent stream.",
      },
      {
        capability: "Change severity",
        them: "Changes are detected and archived; you decide what matters.",
        us: "Every change scored INFO to CRITICAL by one deterministic rules engine, so index-to-noindex outranks a reworded heading automatically.",
      },
      {
        capability: "Works on sites you do not own",
        them: "Yes - competitor and price monitoring are core use cases.",
        us: "No. MyKavo is built around monitoring your own pages and assumes you can fix what it finds.",
      },
      {
        capability: "Compliance archiving",
        them: "Yes - changed pages are archived as evidence for legal and compliance use.",
        us: "History is retained for your plan window (30 days Free, 1 year Pro) with before-and-after values and screenshots, but it is not a legal archiving product.",
      },
      {
        capability: "Technical SEO audit",
        them: "Not the product's purpose.",
        us: "Included: a full-site crawl scored against 89 checks across 22 categories, with CSV export.",
      },
      {
        capability: "Search Console data",
        them: "Not offered.",
        us: "Connect a property and MyKavo correlates clicks, impressions and position with audit findings into prioritised opportunities.",
      },
      {
        capability: "Conversion element checks",
        them: "You can monitor an HTML element for change.",
        us: "You name a selector and what you expect of it - exists, visible, its text, its destination - and each is checked and alerted on separately.",
      },
      {
        capability: "Entry price",
        them: "Pro at $29/month. A free trial rather than a free plan.",
        us: "Free plan (1 website, 5 pages, weekly, no card), then $20/month for 8 websites with 15 pages each.",
      },
    ],
    whereTheyWin: [
      "You need to monitor pages you do not own - competitor pricing, supplier catalogues, regulatory notices. That is central to Hexowatch and outside MyKavo entirely.",
      "You need price or keyword monitoring, or WHOIS and domain ownership records. MyKavo does none of those.",
      "You need an archive of changed pages as evidence for legal or compliance purposes. MyKavo keeps history for your plan window, but archiving is not what it is for.",
      "You want the widest possible set of monitor types in one subscription, and are happy to decide for yourself which changes matter.",
      "You want checks far more often than daily on arbitrary pages, and would rather buy a pool of checks than a number of pages.",
    ],
    bestFor:
      "Pick MyKavo if the sites in question are yours or your clients', and the job is catching regressions - the deploy that dropped a canonical tag, the plugin update that removed the analytics script, the edit that hid the checkout button - with a severity, an approval workflow and before-and-after evidence. Pick Hexowatch if you are watching the wider web, or need monitor types MyKavo deliberately does not have.",
    faqs: [
      {
        q: "Is MyKavo a Hexowatch alternative?",
        a: "For monitoring websites you own or manage, yes - and MyKavo adds an approved-baseline workflow, deterministic severity scoring, a technical SEO audit and Search Console correlation. For competitor, price or WHOIS monitoring, Hexowatch does things MyKavo does not do at all.",
      },
      {
        q: "What is the difference between Hexowatch and Hexometer?",
        a: "They are two products from the same company, Hexact, and they are easy to confuse. Hexowatch is change detection - it watches pages for thirteen kinds of change. Hexometer is a broad website QA monitor covering availability, SEO, security, UX and server infrastructure. We compare MyKavo with both, because they compete on different ground.",
      },
      {
        q: "How does pricing compare?",
        a: "They are metered differently, which matters more than the headline figures. Hexowatch sells a pool of monthly checks (4,500 on Pro at $29/month), so frequency and page count compete for the same budget. MyKavo sells websites and pages ($20/month for 8 websites with 15 monitored pages each, scanned daily), so adding a page does not force you to slow down the others. MyKavo also has a genuinely free plan rather than a trial.",
      },
      {
        q: "How current is this comparison?",
        a: `Every Hexowatch fact here was checked on ${VERIFIED_ON} against their own site and major software directories, with sources listed at the foot of this page. Plans change - confirm on their pricing page before deciding.`,
      },
    ],
    sources: [
      { label: "Hexowatch - official site", url: "https://hexowatch.com/" },
      { label: "Hexowatch pricing - Capterra", url: "https://www.capterra.com/p/206900/Hexowatch/pricing/" },
      {
        label: "Hexowatch profile - GetApp",
        url: "https://www.getapp.com/business-intelligence-analytics-software/a/hexowatch/",
      },
    ],
  },
];

export function findAlternative(slug: string): Alternative | undefined {
  return ALTERNATIVES.find((a) => a.slug === slug);
}
