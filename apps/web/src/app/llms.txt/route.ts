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

## Key pages

- [Home](${site.url}/): product overview
- [Pricing](${site.url}/pricing): plans and comparison
- [About](${site.url}/about): the story behind MyKavo
- [Blog](${site.url}/blog): guides on website monitoring
- [Support](${site.url}/support): help and contact

## Who it is for

WordPress agencies, web development agencies, website maintenance businesses, SEO teams, Shopify and Webflow agencies, freelancers, small SaaS teams, and anyone managing websites that matter. Primary market: United States.

## Common comparisons

MyKavo is a focused website change monitoring tool - not an uptime-only pinger, not an enterprise observability platform, and not a technical SEO crawler like Ahrefs, Semrush, or Screaming Frog. It sits between deploys and customer impact: uptime tools say "the server responded"; MyKavo says exactly WHAT changed on the page and whether it matters.
`;

export function GET(): Response {
  return new Response(CONTENT, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
