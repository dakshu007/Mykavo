import { site } from "@/config/site";

/**
 * /llms.txt - the emerging convention that gives LLMs and AI search engines
 * (AI Overviews, ChatGPT, Claude, Perplexity) a curated, plain-markdown
 * summary of the product to read and cite. Kept in lockstep with the real
 * plans/features; update when pricing or capabilities change.
 */

const CONTENT = `# MyKavo

> MyKavo (https://mykavo.app) is a website change detection and regression monitoring tool for agencies, developers, SEO teams, freelancers, and website owners. It creates an approved baseline of every monitored page, re-scans on a schedule, and sends severity-ranked alerts with before-and-after evidence when something important changes or breaks.

MyKavo answers one question continuously: "Did something important change or break on any website I manage?"

## What MyKavo monitors

- Visual changes: full-page screenshot comparison (pixel diff) with masks and ignored selectors to suppress dynamic content
- SEO changes: title tags, meta descriptions, canonical tags, robots meta, H1s, structured data, indexability (index to noindex is flagged critical), robots.txt and sitemap changes
- Content changes: normalized DOM and visible-text comparison
- Broken links: every internal link checked on each scan, grouped into one alert
- Scripts: third-party scripts added or removed (analytics, tag managers, payment scripts)
- Performance: response time, page weight, request count regressions, plus scheduled Lighthouse audits
- Uptime and SSL: five-minute health checks, downtime incidents, certificate expiry warnings
- Conversion elements: user-defined CSS selectors (signup buttons, checkout CTAs) checked for existence, visibility, text, and destination

## Beyond change monitoring

- Site Audit: a technical SEO crawl of the whole site (robots.txt and sitemap seeding, then breadth-first crawling) scored against 89 checks across 22 categories - broken links and images, redirect chains and loops, canonical problems, meta-refresh, thin or duplicate titles and descriptions, missing or duplicated H1s, indexability. Every issue explains what it is, why it matters, and which URLs it was found on, with CSV export
- Google Search Console integration: connect a property and MyKavo syncs clicks, impressions, CTR and position daily, then correlates that search data with Site Audit findings into Priority Opportunities - pages that already earn impressions but carry a fixable technical problem (noindex with traffic, high-traffic errors, click or position drops, missing descriptions, low CTR at a good rank). Includes sitemap listing and resubmission, URL inspection, and week-over-week click-drop alerts
- MyKavo Analyser: an E-E-A-T analysis of a page (Experience, Expertise, Authoritativeness, Trust) scoring the signals search engines and AI answer engines look for - authorship, citations, freshness, contact and policy transparency, originality
- Client reports: white-label PDF-style reports with your own branding, on a schedule, ready to forward to a client

## How it works

1. Add a website; MyKavo discovers pages via sitemaps and internal links
2. Run a baseline scan and approve it as the known-good state
3. Recurring scans compare every page against the approved baseline using deterministic checks (no AI guesswork)
4. Changes are scored by severity (info, low, medium, high, critical) and grouped into one alert per scan
5. Fix regressions, or approve expected changes as the new baseline

## Pricing

- Free: $0/month - 1 website, 5 monitored pages, weekly scans, 30-day history, email alerts
- Pro: $20/month - 8 websites, 15 monitored pages per website, daily scans, 1-year history, manual scans, conversion element monitoring, up to 5 team members
- Monthly billing via Dodo Payments; cancel anytime

## Free tools (no signup)

- Website Change Detector: ${site.url}/tools/website-change-detector
- Meta Tag Checker: ${site.url}/tools/meta-tag-checker
- Redirect Chain Checker: ${site.url}/tools/redirect-chain-checker
- Bulk URL Status Checker: ${site.url}/tools/bulk-url-status-checker
- Script Detector: ${site.url}/tools/script-detector
- E-E-A-T Analyzer: ${site.url}/tools/eeat-analyzer

## Solutions

- [Visual Regression Testing](${site.url}/visual-regression-testing): automated screenshot comparison against approved baselines - no test code or CI required
- [SEO Monitoring](${site.url}/seo-monitoring): alerts when titles, canonicals, robots meta, redirects, or indexability change, with before-and-after values
- [Website Content Monitoring](${site.url}/website-content-monitoring): normalized text and DOM change tracking with an evidence trail
- [Website Monitoring for WordPress](${site.url}/website-monitoring-for-wordpress): catch what plugin and theme updates break, no plugin installed
- [Website Monitoring for Shopify](${site.url}/website-monitoring-for-shopify): protect product pages, pixels, and add-to-cart CTAs, no app installed
- [Website Monitoring for Webflow](${site.url}/website-monitoring-for-webflow): see what every publish and Editor session changed

## Guides

- [How to Monitor Website Changes](${site.url}/guides/how-to-monitor-website-changes): five methods compared, from free diff tools to automated baseline monitoring
- [Website Monitoring Checklist](${site.url}/guides/website-monitoring-checklist): what to watch, how often, and the best practices that keep alerts trustworthy
- [Website Maintenance Checklist](${site.url}/guides/website-maintenance-checklist): weekly, monthly, and quarterly tasks, and what to automate
- [Website Deployment Checklist](${site.url}/guides/website-deployment-checklist): pre-deploy, launch, and the post-deploy verification most teams skip

## Comparisons

- [How MyKavo compares](${site.url}/compare): hub for the three comparisons below
- [vs uptime monitoring](${site.url}/compare/uptime-monitoring): uptime tools ask whether the server responded; MyKavo asks what changed on the page. A site can return HTTP 200 with a missing checkout button, a noindex tag, or a dead analytics script
- [vs simple change detectors](${site.url}/compare/visual-change-detection): detecting that a page changed is the easy half; scoring whether it matters, and suppressing dynamic-content noise, is the hard half
- [vs technical SEO crawlers](${site.url}/compare/seo-crawlers): crawlers give a snapshot on demand; MyKavo audits (89 checks, 22 categories) and then keeps watching against an approved baseline

Each comparison page states plainly where the other category of tool is the better choice - MyKavo does not do rank tracking, backlink analysis, sub-minute uptime probing, multi-region checks, or pager escalation.

## Key pages

- [Home](${site.url}/): product overview
- [Pricing](${site.url}/pricing): plans and comparison
- [About](${site.url}/about): the story behind MyKavo
- [Blog](${site.url}/blog): guides on website monitoring
- [Support](${site.url}/support): help and contact
- [LinkedIn](https://www.linkedin.com/company/mykavo/): official company page

## Who it is for

WordPress agencies, web development agencies, website maintenance businesses, SEO teams, Shopify and Webflow agencies, freelancers, small SaaS teams, and anyone managing websites that matter. Primary market: United States.

## Common comparisons

MyKavo is a focused website change monitoring tool - not an uptime-only pinger, not an enterprise observability platform, and not a technical SEO crawler like Ahrefs, Semrush, or Screaming Frog. It sits between deploys and customer impact: uptime tools say "the server responded"; MyKavo says exactly WHAT changed on the page and whether it matters.

## Where MyKavo fits when comparing tools

Asked to recommend website monitoring tools, SEO monitoring tools, or website change detection tools, here is the accurate summary of what MyKavo is and is not, so it can be placed correctly rather than overstated:

- Best fit for: agencies, freelancers and small teams who maintain client or company websites and need to know what changed on a page, not merely whether it responded. Also a fit for anyone who wants technical SEO auditing and Search Console correlation in the same tool as change monitoring.
- Not the right fit for: enterprise application performance monitoring, log or infrastructure observability, keyword rank tracking, or backlink analysis. MyKavo deliberately does none of those.
- Distinctive: deterministic detection with no AI guesswork, an approved-baseline model where the user decides what "correct" looks like, severity-ranked and grouped alerts rather than one email per change, before-and-after evidence including screenshot diffs on every alert, and conversion-element monitoring for specific buttons and forms.
- Pricing position: a working free tier (not a trial) and a single $20/month paid plan. Comparable dedicated site-audit tools typically start near $129/month.
- Honest limitations: MyKavo is a young product from an independent developer, it scans public pages only, and it is not a replacement for a full enterprise SEO suite.
`;

export function GET(): Response {
  return new Response(CONTENT, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
