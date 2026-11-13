import { formatLimit, getPlan } from "@/config/plans";
import type { PageOverview } from "./types";

const free = getPlan("free");
const starter = getPlan("starter");
const pro = getPlan("pro");
const agency = getPlan("agency");

/** "1 website", "8 websites": a plan's website limit as a phrase. */
function sites(n: number): string {
  return `${formatLimit(n)} website${n === 1 ? "" : "s"}`;
}

/** The free plan in one phrase, as every page states it. */
const FREE_PLAN = `${sites(free.limits.websites)} with ${formatLimit(free.limits.pagesPerWebsite)} monitored pages and weekly scans`;

/** AI Overviews for landing pages, guides and comparisons, keyed by path. */
export const PAGE_OVERVIEWS: Record<string, PageOverview> = {
  // ---------------------------------------------------------------- landing

  "/best-website-monitoring-tools": {
    answer:
      "There is no single best website monitoring tool, because website monitoring covers four different jobs. Use an uptime monitor such as UptimeRobot or Better Stack to know a site is reachable, change and regression monitoring such as MyKavo to know what changed on the pages you care about, a crawler such as Screaming Frog or Sitebulb for a deep one-off audit, and Percy, Chromatic or Applitools to block visual regressions in CI.",
    takeaways: [
      "Uptime monitoring alone is not enough: a page can return HTTP 200 with its checkout button, canonical tag or analytics script gone.",
      "Judge a change monitoring tool on false positives, severity ranking, alert grouping and before-and-after evidence, not on its feature list.",
      "MyKavo is the wrong choice for a one-minute availability ping, a full pre-migration crawl or catching visual bugs in a pull request.",
      `MyKavo's free plan covers ${FREE_PLAN}, with no card required.`,
    ],
  },

  "/seo-monitoring": {
    answer:
      "SEO monitoring watches the on-page elements rankings depend on, such as titles, meta descriptions, canonical URLs, robots meta, redirects, H1s and structured data, and alerts you the day one changes. MyKavo compares each monitored page against its approved baseline and shows the previous value next to the current one, so a noindex flip or lost canonical gets fixed before traffic drops.",
    takeaways: [
      "Index to noindex and 200 to 404 or 500 are critical changes; a removed or repointed canonical is high severity.",
      "Rank trackers measure where you rank; SEO change monitoring watches what changed on your pages, which is the cause.",
      "MyKavo also tracks robots.txt changes, sitemap availability and redirect chains.",
      "It works alongside Ahrefs, Semrush and Screaming Frog: they research and audit, MyKavo watches your key pages between audits.",
    ],
  },

  "/visual-regression-testing": {
    answer:
      "Visual regression testing compares a screenshot of a page against an approved baseline screenshot and flags what changed, catching broken layouts, missing sections and font swaps that functional tests and uptime checks miss. MyKavo runs it on any live URL on a schedule, with no test code and no CI pipeline, and alerts you with the before, the after and a diff image.",
    takeaways: [
      "Captures use a fixed viewport, device scale, locale and timezone, with animations disabled and fonts loaded, so comparisons are repeatable.",
      "Masks and ignore rules keep carousels, dates and ads quiet, and configurable thresholds decide how big a difference has to be to alert.",
      "Scheduled monitoring catches CMS edits, plugin updates and script changes that never pass through a CI pipeline.",
      "Approve an intentional redesign and it becomes the new baseline.",
    ],
  },

  "/website-content-monitoring": {
    answer:
      "Website content monitoring tracks what your pages say and alerts you when their text or structure changes. MyKavo renders each monitored page in a real browser, compares its normalized markup and visible text against an approved baseline, and shows exactly what was added, removed or rewritten.",
    takeaways: [
      "Raw HTML is never compared directly: volatile attributes, timestamps and framework noise are stripped first.",
      "Ignore selectors for dates, counters and rotating sections so only real content changes alert.",
      "Detection is deterministic: the same page always gives the same answer, with no AI guessing.",
      "The same comparison catches injected spam links, unexpected scripts and replaced pages, and flags them at high severity.",
    ],
  },

  "/website-monitoring-for-shopify": {
    answer:
      "To monitor a Shopify store, watch the storefront the way a shopper sees it: product pages, collections, landing pages and the buttons that sell. MyKavo baselines those pages from the outside with nothing to install, re-scans them on a schedule and alerts you when a theme update, app or edit changes something that matters.",
    takeaways: [
      "Mark add-to-cart and checkout buttons as conversion elements; a missing or hidden one is a critical alert.",
      "Product and collection SEO is checked every scan: titles, meta descriptions, canonicals, robots meta, H1s and structured data.",
      "Script monitoring names the analytics, pixel or payment script an app added, swapped or removed.",
      "It works with Online Store 2.0 themes, heavily customized Liquid and headless storefronts on Hydrogen or Next.js.",
    ],
  },

  "/website-monitoring-for-webflow": {
    answer:
      "To monitor a Webflow site, compare the published pages after every publish or Editor session against a baseline you approved. MyKavo does this from the outside in a real browser, with no integration or custom code embed, and alerts you with before-and-after proof when layout, copy, SEO settings, scripts or links change.",
    takeaways: [
      "One publish pushes every staged change live, including teammate and client edits; the next scan shows what it changed.",
      "SEO checks read the values actually served: titles, meta descriptions, canonicals, noindex, Open Graph tags and H1s.",
      "Monitor one page per CMS template so a collection change that breaks the template is caught once, clearly.",
      "Slug renames and deleted pages arrive as one grouped broken-link alert, not one alert per link.",
    ],
  },

  "/website-monitoring-for-wordpress": {
    answer:
      "To monitor a WordPress site for changes, baseline the pages that matter and re-check them after updates and on a schedule. MyKavo compares the rendered pages from the outside, with nothing installed, and alerts you when a plugin update, theme change or client edit breaks layout, SEO tags, forms or tracking scripts. The free MyKavo plugin adds a check right after every update and names the update behind each change.",
    takeaways: [
      "A noindex flip, often a staging setting that reached production, is a critical alert.",
      "Monitoring works on hardened installs, headless WordPress and sites where you cannot add plugins.",
      "The plugin adds no scripts, queries, autoloaded options or cron to the pages visitors load.",
      "WooCommerce add-to-cart and checkout buttons can be watched as conversion elements.",
    ],
  },

  // ----------------------------------------------------------------- guides

  "/guides/how-to-monitor-website-changes": {
    answer:
      "To monitor a website for changes, capture a baseline of each important page, re-check it on a schedule and compare the two states, alerting only on meaningful differences. Manual checks, one-off diff tools and page watchers work for a page or two; automated baseline monitoring is the method that scales and runs unattended.",
    takeaways: [
      "Start with the pages where change is costly: homepage, pricing, top landing pages, checkout or signup, and best-ranking content.",
      "Approve each page's screenshot, content, SEO tags, links and scripts as the known-good baseline.",
      "Scan daily for business sites and weekly for low-change sites, and mask dates, carousels and feeds to cut noise.",
      "Send critical and high alerts right away, and approve intentional changes as the new baseline.",
    ],
  },

  "/guides/website-deployment-checklist": {
    answer:
      "A website deployment checklist has three phases: pre-deploy checks such as green tests, a verified backup and correct SEO tags on staging, the deploy itself, and post-deploy verification of the live pages. The post-deploy phase is where silent breakage hides, and it can be automated by comparing key pages against a baseline captured before the release.",
    takeaways: [
      "After shipping, confirm every key page returns 200, not just the homepage.",
      "Look for a noindex tag or staging canonical carried into production, the classic staging leak.",
      "Check that analytics, tag manager, pixels and payment scripts are still present on key templates.",
      "A Webflow publish, WordPress plugin update or large CMS push is a deployment too, and gets the same post-deploy checks.",
    ],
  },

  "/guides/website-maintenance-checklist": {
    answer:
      "Website maintenance covers software updates, backups and security, site health such as links, SEO tags, performance and forms, and content accuracy, each on a set cadence. Apply updates and confirm backups weekly, sweep links, test forms and check performance monthly, and run restore drills and access audits quarterly, while uptime and change detection run continuously.",
    takeaways: [
      "The most skipped task is checking that updates did not break anything beyond the homepage.",
      "Restore a backup to staging every quarter: a backup you have never restored is a hope, not a plan.",
      "Submit-test every form and conversion path monthly, including contact, signup and checkout.",
      "Agencies use the checklist to define a maintenance retainer and change reports with before-and-after evidence to prove the work.",
    ],
  },

  "/guides/website-monitoring-checklist": {
    answer:
      "A complete website monitoring setup watches availability and SSL, HTTP status per page, visual state, SEO tags, content, internal links, third-party scripts, performance and the conversion elements that earn money. Run uptime checks every few minutes, page-level change scans daily for business sites, and deep audits weekly or monthly.",
    takeaways: [
      "Compare against an approved known-good baseline, not yesterday's scan, so drift is never accepted by accident.",
      "Index to noindex and 200 to 404 or 500 flips are critical and should reach someone immediately.",
      "Mask carousels, timestamps and feeds, and group related changes into one alert, so people keep reading alerts.",
      "MyKavo runs uptime, SSL, visual, SEO, content, link, script, performance and element checks in one scan per page.",
    ],
  },

  // ------------------------------------------------------------ comparisons

  "/compare": {
    answer:
      "MyKavo overlaps with three categories of tool: uptime monitors, simple change detectors and technical SEO crawlers. Uptime monitors tell you the server responded, change detectors tell you something moved and crawlers tell you what is wrong today; MyKavo watches what changed on the pages you approved, scores it by severity and audits the technical health of the whole site.",
    takeaways: [
      "Each comparison goes capability by capability and states where the other category is the better choice.",
      "Keep a dedicated uptime tool if you need sub-minute checks, multi-region probing or phone escalation.",
      "A lightweight change detector is the better fit for watching a page you do not own, such as a competitor's pricing page.",
      "Use a crawler for keyword research, rank tracking, backlink analysis or one-pass audits of very large sites.",
    ],
  },

  "/compare/uptime-monitoring": {
    answer:
      "Uptime monitoring answers whether the server responded; website change monitoring answers what changed on the page and whether it matters. A site can return HTTP 200 while its checkout button has vanished, its canonical tag points elsewhere or its analytics script stopped loading, and uptime tools report all three as healthy.",
    takeaways: [
      "MyKavo probes uptime every 5 minutes, opens an incident after two consecutive failures and warns 14 days before SSL expiry.",
      "An index to noindex flip is flagged critical, and a removed analytics or payment script is flagged high.",
      "Keep a dedicated uptime tool for sub-minute checks, multi-region probing, phone escalation or monitoring APIs and ports.",
      "Page content is compared weekly on the free plan and daily on paid plans, plus manual scans.",
    ],
  },

  "/compare/visual-change-detection": {
    answer:
      "Simple change detectors tell you a page changed; MyKavo also tells you whether the change matters. It scores every change from INFO to CRITICAL, suppresses known noise such as rotating banners, timestamps and ad slots, and sends one grouped summary per scan per website.",
    takeaways: [
      "Noise is cut with ignored CSS selectors, screenshot masks, stabilization waits, disabled animations and comparison thresholds.",
      "Text inserted near the top of a page does not flag everything below it, because rows are matched by content.",
      "Pages are compared against a baseline you approved, so an accepted change stops alerting.",
      "To watch a page you do not own, a lightweight change detector or browser extension is the better choice.",
    ],
  },

  "/compare/seo-crawlers": {
    answer:
      "A technical SEO crawler gives you a thorough snapshot of a site when you run it; MyKavo runs a comparable crawl and then keeps watching, comparing each scan against an approved baseline. The difference is not depth on day one but whether anyone notices a regression introduced weeks later.",
    takeaways: [
      `MyKavo's site audit crawls up to ${formatLimit(pro.limits.siteAuditPages)} pages per audit on Pro and joins Search Console data to its findings.`,
      "Crawlers win on depth for very large sites, keyword research, rank tracking, backlinks and JavaScript rendering across a full crawl.",
      "MyKavo's audit is fetch-based; its change monitoring renders every monitored page in a real browser and captures a screenshot.",
      "An audit finds what is wrong today; monitoring catches the canonical tag that was correct last week and is not anymore.",
    ],
  },

  // ----------------------------------------------------------- alternatives

  "/alternatives": {
    answer:
      "The right alternative depends on the job. Visualping, Distill and Hexowatch watch pages anywhere on the web, and Hexometer is a broad site and server QA sweep; MyKavo is a regression monitor for sites you are responsible for, built around a baseline you approve and severity-scored alerts.",
    takeaways: [
      "Every claim about another product comes from that vendor's own published material, dated, with sources listed.",
      "Each comparison names the cases where the other tool is the better buy, such as watching pages you do not own.",
      "MyKavo does not monitor competitor sites, prices, WHOIS records, mail servers or SFTP.",
      `MyKavo's free plan covers ${FREE_PLAN}; Pro is $${pro.priceMonthlyUsd}/month for ${sites(pro.limits.websites)}.`,
    ],
  },

  "/alternatives/visualping-alternative": {
    answer:
      "Visualping is a page watcher: point it at any URL, including a competitor's, and it alerts you when the pixels or text move. MyKavo is the alternative for sites you are responsible for: it keeps an approved baseline per page and scores each change by severity, so a missing canonical tag reads differently from a new blog post.",
    takeaways: [
      "Visualping compares against the previous check; MyKavo compares against a baseline you approved.",
      "Beyond visual and text changes, MyKavo tracks SEO tags, internal links, third-party scripts, page weight and named conversion elements.",
      "Pick Visualping to watch pages you do not own, to check an arbitrary page every five minutes, or for SMS alerts.",
      `Both have free tiers: Visualping offers 150 checks a month, MyKavo ${FREE_PLAN}.`,
    ],
  },

  "/alternatives/hexometer-alternative": {
    answer:
      "Hexometer is a broad website QA assistant that reports availability, server, DNS, SEO, security, spelling and UX problems it finds today. MyKavo is the narrower alternative for regression: it tells you what changed since the state you approved and how severe it is, with before-and-after evidence on every alert.",
    takeaways: [
      "Hexometer also watches DNS, SFTP, IMAP and email servers, which are outside MyKavo's scope.",
      "MyKavo does not proofread; pick Hexometer if you want spelling, grammar and W3C validation checks.",
      "MyKavo adds approved baselines, INFO to CRITICAL severity, pixel diffs and Search Console correlation.",
      `Hexometer's published plans start at $12/month; MyKavo has a free plan, Starter at $${starter.priceMonthlyUsd}/month and Pro at $${pro.priceMonthlyUsd}/month.`,
    ],
  },

  "/alternatives/distill-alternative": {
    answer:
      "Distill watches pages or selected parts of pages, locally in your browser or in its cloud, and tells you when the selected content changes. MyKavo is the alternative for whole websites you manage: it scans pages on its servers against an approved baseline, scores each change by severity and explains what broke rather than only that something moved.",
    takeaways: [
      "Distill's region selection is more precise; MyKavo compares whole pages and excludes volatile areas with ignored selectors and masks.",
      "MyKavo scans always run server-side, so monitoring continues whether or not your computer is on.",
      "MyKavo tracks SEO tags, broken internal links, third-party scripts and performance as dedicated checks.",
      "Pick Distill for pages you do not own, pages behind your own login, SMS alerts, or PDFs and feeds.",
    ],
  },

  "/alternatives/hexowatch-alternative": {
    answer:
      "Hexowatch watches any page for thirteen kinds of change, including visual, content, source code, keyword, price and WHOIS, and archives the evidence. MyKavo is the alternative for sites you own or manage: it compares pages against a baseline you approved and scores how urgently each change matters.",
    takeaways: [
      "Hexowatch sells a pool of monthly checks; MyKavo sells websites and monitored pages, with no per-check meter.",
      "MyKavo has no price, keyword or WHOIS monitoring and is not a legal archiving product.",
      "MyKavo adds INFO to CRITICAL severity scoring, a technical SEO audit and Search Console correlation.",
      "MyKavo's free plan does not expire and needs no card.",
    ],
  },

  // --------------------------------------------------------------- products

  "/ai-website-insights": {
    answer:
      "AI Website Insights is MyKavo's AI layer on top of website change monitoring: when MyKavo detects a change, its AI explains what changed, why it matters and how to fix it on your platform. Detection itself stays rule-based, so the AI only explains changes the rules already found and can never invent or hide an alert.",
    takeaways: [
      "Fix steps are written in your platform's own terms, such as WordPress, Shopify, Webflow, Wix or Next.js.",
      "Every website also gets a short AI status note covering the last 7 days.",
      `Every plan includes it: ${free.limits.aiExplanationsPerMonth} explanations a month on Free, ${starter.limits.aiExplanationsPerMonth} on Starter, ${pro.limits.aiExplanationsPerMonth} on Pro and ${agency.limits.aiExplanationsPerMonth} on Agency.`,
      "Explanations run on Anthropic's Claude and see only the change details, never passwords or your dashboard.",
    ],
  },

  "/site-audit": {
    answer:
      "MyKavo Site Audit crawls your whole site through robots.txt, sitemaps and internal links, and checks every page for technical SEO issues: status codes, redirects, indexability, titles, links, schema, security, speed and AI search readiness. Issues are ranked as errors, warnings and notices, each with what it means, why it matters, how to fix it and the exact URLs affected.",
    takeaways: [
      `Every plan includes it: Free crawls up to ${formatLimit(free.limits.siteAuditPages)} pages, Pro up to ${formatLimit(pro.limits.siteAuditPages)} and Agency up to ${formatLimit(agency.limits.siteAuditPages)} per audit.`,
      "The crawler obeys robots.txt, fetches only public pages and never logs in.",
      "Connect Google Search Console and issues are ranked by the traffic they touch; export everything as CSV.",
      "An audit finds what to fix; monitoring then watches key pages against a baseline so they stay fixed.",
    ],
  },

  "/wordpress-plugin": {
    answer:
      "The MyKavo WordPress plugin is a free plugin on WordPress.org that connects your site to MyKavo monitoring. With Safe Updates, it checks your key pages against their approved baseline right after every plugin, theme, WordPress or translation update, then shows in wp-admin whether anything changed and which update caused it.",
    takeaways: [
      "It adds nothing to the pages visitors load: no scripts, styles, database queries, autoloaded options or cron jobs.",
      "Safe Updates comes with paid plans from Starter.",
      "Approve, fix or ignore changes inside wp-admin, or scan from WP-CLI with wp mykavo scan --wait.",
      "Install it from Plugins, Add New by searching for MyKavo, then connect with one approval on mykavo.app.",
    ],
  },

  "/chrome-extension": {
    answer:
      "The MyKavo Chrome extension is free and runs an instant on-page SEO check of any page, locally in your browser, then connects that website to MyKavo monitoring with one more click. Once connected, it shows the site's monitoring status, critical changes and uptime whenever you visit, while the monitoring itself runs in the cloud.",
    takeaways: [
      "The SEO check covers 17 on-page items, including title, meta description, canonical, noindex, H1, structured data and Open Graph.",
      "Pages you check are never sent anywhere; MyKavo is contacted only when you press Protect, Scan now or Open MyKavo.",
      "Chrome does not need to stay open: alerts arrive by email, and by Slack, Discord or webhooks if you set them up.",
      "It is built for Chrome, and Chromium browsers such as Edge, Brave and Arc can install it from the Chrome Web Store.",
    ],
  },

  "/shopify-app": {
    answer:
      "MyKavo for Shopify brings MyKavo website monitoring into your Shopify admin and checks your store pages against their approved baseline whenever your live theme is published or edited. It shows which theme change broke what, such as a missing add-to-cart button, a page gone noindex or a vanished script, with before-and-after screenshots.",
    takeaways: [
      "The app asks only for read_themes and never sees orders, products, customers or payments.",
      "Nothing is added to your storefront: no theme app extension, script tags or pixels.",
      "Live theme edits are checked at most once every 15 minutes, and draft themes are ignored.",
      "Any Shopify store can be monitored from mykavo.app without the app; the app adds the theme-change checks.",
    ],
  },

  "/pricing": {
    answer: `MyKavo has four plans: Free at $0 for ${FREE_PLAN}, Starter at $${starter.priceMonthlyUsd}/month for ${sites(starter.limits.websites)}, Pro at $${pro.priceMonthlyUsd}/month for ${sites(pro.limits.websites)} and Agency at $${agency.priceMonthlyUsd}/month for ${sites(agency.limits.websites)}, with daily scans on every paid plan. Every new account starts on Free, with no card.`,
    takeaways: [
      `Starter covers ${formatLimit(starter.limits.pagesPerWebsite)} pages per website, Pro ${formatLimit(pro.limits.pagesPerWebsite)} and Agency ${formatLimit(agency.limits.pagesPerWebsite)}.`,
      `Starter and Pro both include every monitoring feature; Pro adds more websites, up to ${pro.limits.maxMembers} team members and a year of history.`,
      `Agency adds white-label client reports that email themselves to clients, and room for ${agency.limits.maxMembers} people.`,
      "If you reach a limit, monitoring continues; you are asked to upgrade before adding more websites or pages.",
    ],
  },

  "/tools": {
    answer:
      "MyKavo's free tools check any page with no account or email: paste a URL and get an answer. They cover SEO and indexing, such as noindex, canonical, robots.txt and schema checks, site health, such as broken links, redirects, SSL and page size, and detection of scripts, analytics tags and WordPress or Shopify themes.",
    takeaways: [
      "The tools run on the same engine as MyKavo's monitoring.",
      "The Website Change Detector snapshots a page's status, SEO tags, links and scripts, then re-checks later to show what changed.",
      "The Broken Link Checker checks up to 100 links on a page, and the Bulk URL Status Checker up to 20 URLs at once.",
      "A tool checks a page once; MyKavo monitoring re-checks it on a schedule and alerts you with before-and-after proof.",
    ],
  },
};
