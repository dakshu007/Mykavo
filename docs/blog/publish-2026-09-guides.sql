-- Publish the September 2026 guides. Paste into the Supabase SQL Editor and run.
-- Safe to run more than once: a slug that already exists is left untouched.

INSERT INTO blog_post (id, slug, title, excerpt, content, status, "publishedAt", "authorName", "seoTitle", "seoDescription", "primaryKeyword", "secondaryKeyword", tags, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, $post$wordpress-auto-updates-broke-my-site$post$, $post$WordPress Auto-Updates Broke My Site: How to Keep Them On, Safely$post$, $post$Yes - an automatic plugin, theme or core update can quietly change or break a live WordPress page overnight, with no error you would notice. Keep auto-updates on for security, and pair them with a check that compares your key pages with a known-good baseline after each update, so you learn within minutes which update broke what.$post$, $post$**Short answer:** keep automatic updates on - they close security holes faster than you can - but pair them with a check that runs right after every update. When a page changes or breaks, you want to know within minutes, and you want to know *which* update did it. That turns "the site broke overnight" from a mystery into a one-line fix: roll back or patch the plugin that was named.

{{toc}}

## Why do WordPress updates break sites?

A WordPress site is WordPress core, a theme and, usually, 20 to 40 plugins written by different people. Each update is tested on its own, never on your exact combination. The common failures:

- **A plugin changes its markup.** A WooCommerce, page-builder or theme update renames a CSS class or template, and your "Add to cart" button, form or menu stops showing.
- **Two plugins stop agreeing.** A caching, SEO or security plugin update conflicts with another plugin and breaks a page, or sends a stale page to visitors.
- **An SEO setting flips.** An SEO plugin update or migration changes a title, a canonical, or sets pages to `noindex`.
- **A script disappears.** Analytics, tag manager or payment scripts get dropped from the template.

None of these crash the site. The server still answers "200 OK", so uptime monitors stay green. The page is just wrong.

## Should I turn off automatic updates?

No. Most WordPress compromises go through plugins with known, already-patched vulnerabilities. Turning off automatic updates swaps a small, visible risk (an update breaks a page) for a large, invisible one (an unpatched hole). The better fix is to keep updates on and **shorten the time between "an update broke something" and "you know about it."**

## A safe WordPress update routine

1. **Keep auto-updates on** for security releases, and for plugins with a good track record.
2. **Know your important pages.** Home, the top landing pages, product pages, cart, checkout, contact and signup forms. Five to twenty pages covers most sites.
3. **Save an approved baseline** of those pages: how each one looks, its SEO tags, its links and scripts, and whether key buttons exist.
4. **Check the pages right after every update** - automatic ones included - and compare them with the baseline.
5. **Tie every change to the update that came before it**, so you know what to roll back.
6. **Get alerted only when something important changed**, ranked by severity, not on every small edit.
7. **Before the next update of a plugin that broke things last time, look twice.**

Doing steps 4 and 5 by hand is what nobody has time for at 2 a.m. That is the part to automate.

## How do I find which update broke my site?

Look at what updated just before the problem appeared:

- **Dashboard > Updates** shows what is waiting, not what already ran.
- **Server or activity logs** (if your host or a logging plugin keeps them) list plugin updates with times.
- **Compare timestamps**: when did the page last look right, and what updated since?

This works, but it is slow, and it depends on someone noticing the problem first - often a customer.

## Automating it with the MyKavo WordPress plugin

The free [MyKavo plugin](https://wordpress.org/plugins/mykavo/) adds **Safe Updates** to wp-admin. Every time WordPress updates a plugin, theme, core or translations - automatic updates included - and whenever a plugin is switched on or off or the theme changes, MyKavo checks your monitored pages against their approved baseline and gives the update a verdict:

- **"Verified - nothing changed"**, or
- **"2 changes found after this update"**, with the evidence one click away.

Every change it finds is labelled with the update it appeared after. On the Plugins screen, a plugin whose last update changed your site carries a line like *"MyKavo: last time this plugin updated (9.8.1 to 9.9.0), 2 things changed on your site."* The plugin adds nothing to the pages your visitors load; the scanning runs on MyKavo's servers.

{{cta-wordpress}}

## What should the check look at?

- **Availability:** status code and redirects of each page.
- **Visual:** a full-page screenshot compared with the baseline.
- **SEO:** title, meta description, canonical, robots meta, H1s.
- **Conversion elements:** your Add to cart, checkout and signup buttons exist, are visible, and point where they should.
- **Scripts:** analytics, tag manager and payment scripts are still present.
- **Links:** internal links still resolve.

{{faq}}
Q: Is it safe to enable WordPress auto-updates for plugins?
A: Yes, for most sites. Auto-updates close security holes quickly. The risk is a silent layout or SEO break, which you handle by checking your important pages after every update rather than by switching updates off.
Q: Why does my site look broken after a plugin update even though it loads?
A: Most update breakages change the page, not the server. A renamed CSS class, a template change or a plugin conflict can hide a button or form while the page still returns 200 OK, so uptime monitors do not notice.
Q: How do I find out which plugin update broke my site?
A: Compare when the page last looked right with the update history since then. A tool like MyKavo's Safe Updates does this automatically, checking pages after each update and naming the update on every change it finds.
Q: Does the MyKavo plugin slow down my site?
A: No. It adds no scripts, styles or database queries to the pages visitors load. The checks run on MyKavo's servers.
{{/faq}}
$post$, 'PUBLISHED', now() - interval '0 minutes', 'MyKavo Team', $post$WordPress Auto-Update Broke My Site? Keep Updates On, Safely$post$, $post$Why WordPress auto-updates break sites, why turning them off is the wrong fix, and a safe update routine that tells you which update broke which page.$post$, $post$wordpress auto update broke site$post$, $post$safe wordpress updates$post$, ARRAY[$post$WordPress$post$, $post$Updates$post$, $post$Monitoring$post$]::text[], now(), now())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_post (id, slug, title, excerpt, content, status, "publishedAt", "authorName", "seoTitle", "seoDescription", "primaryKeyword", "secondaryKeyword", tags, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, $post$what-is-website-change-monitoring$post$, $post$What Is Website Change Monitoring? A Plain-English Guide$post$, $post$Website change monitoring saves an approved baseline of your important pages, re-checks them on a schedule, and alerts you when something that matters changes - a page that errors, a noindex tag, a changed title or canonical, a missing script or button. Uptime monitoring asks whether a page loads; change monitoring asks whether it is still right.$post$, $post$**Website change monitoring** is the practice of saving a known-good version of your important web pages - a *baseline* - and automatically re-checking those pages on a schedule to detect meaningful changes: a page going down, a missing button, a changed title tag, a `noindex`, a broken link, a vanished analytics script or a visual layout shift. When something important changes, you get an alert with before-and-after evidence.

It answers one question: **did something important change or break on a website I manage?**

{{toc}}

## How does website change monitoring work?

1. **Pick the pages that matter.** Home, key landing pages, product and pricing pages, checkout and signup.
2. **Save a baseline.** The tool records each page as it should be: status code, SEO tags, visible text, links, scripts, key buttons, and a full screenshot. You approve it.
3. **Re-scan on a schedule** - daily or weekly - and after deploys or CMS updates.
4. **Compare every scan with the baseline**, signal by signal.
5. **Rank what changed by severity.** A page returning 500 or turning `noindex` is critical; a small copy edit is informational.
6. **Alert once, grouped.** One message per scan, not one per change.
7. **Approve or fix.** Expected changes become the new baseline. Unexpected ones get fixed.

## What changes can it detect?

- **Availability:** a 200 that becomes 404 or 500, new redirects.
- **Visual:** screenshot differences above a threshold, with dynamic areas masked.
- **SEO:** title, meta description, canonical, robots meta, headings, structured data.
- **Content:** meaningful text changes, ignoring timestamps and rotating widgets.
- **Links:** internal links that start returning errors.
- **Scripts:** analytics, tag managers or payment scripts added or removed.
- **Performance:** page weight, request count and response time regressions.
- **Conversion elements:** a signup or checkout button that goes missing, hidden or re-pointed.

## Website change monitoring vs uptime monitoring

Uptime monitoring asks "does the server respond?" every minute. Change monitoring asks "is the page still *right*?" A checkout with a missing button still responds 200 OK, so uptime tools stay green. The two are complementary; change monitoring catches the breakages uptime cannot see.

## Website change monitoring vs SEO crawlers

SEO crawlers like Screaming Frog or site-audit tools crawl a whole site to find technical issues at a point in time. Change monitoring watches a chosen set of pages continuously and tells you what *changed* since the version you approved. Audits find existing problems; monitoring catches new ones.

## Why false positives matter

Modern pages are full of dynamic content: dates, carousels, cookie banners, A/B tests. A monitor that alerts on all of it gets ignored. Good change monitoring normalizes the page before comparing (removing volatile attributes, masking dynamic regions, applying thresholds) so an alert means something.

## How to choose a website change monitoring tool

- **Deterministic detection** you can explain: previous value vs current value.
- **An approved-baseline model**, so you decide what "correct" is.
- **Severity ranking and grouped alerts**, not an email per change.
- **Before-and-after evidence** on every alert, including screenshots.
- **Conversion-element checks** for the buttons and forms your business runs on.
- **Integrations** where you work: email, Slack, WordPress, deploy hooks.
- **A real free tier** to try it on one site.

MyKavo is built around exactly this loop - baseline, scan, compare, alert, approve - with deterministic checks across all eight categories above.

{{cta}}

{{faq}}
Q: What is website change monitoring?
A: It is saving an approved baseline of important pages and automatically re-checking them on a schedule, alerting you when something meaningful changes - such as a page going down, a missing button, a changed title tag or a noindex - with before-and-after evidence.
Q: How is website change monitoring different from uptime monitoring?
A: Uptime monitoring checks that the server responds. Change monitoring checks that the page is still correct. A broken layout or missing checkout button still returns 200 OK, so only change monitoring catches it.
Q: How often should I scan my website for changes?
A: Daily for business-critical sites, plus a check right after every deploy or CMS update. Weekly is enough for small sites that rarely change.
Q: Does website change monitoring need AI?
A: No. Reliable change detection is deterministic: it compares the previous value with the current value for each signal, which makes results reproducible and explainable.
{{/faq}}
$post$, 'PUBLISHED', now() - interval '7 minutes', 'MyKavo Team', $post$What Is Website Change Monitoring? How It Works (2026 Guide)$post$, $post$Website change monitoring explained: baselines, scheduled scans, what changes it detects, how it differs from uptime monitoring and SEO crawlers, and how to choose a tool.$post$, $post$website change monitoring$post$, $post$website change detection$post$, ARRAY[$post$Monitoring$post$, $post$Guides$post$]::text[], now(), now())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_post (id, slug, title, excerpt, content, status, "publishedAt", "authorName", "seoTitle", "seoDescription", "primaryKeyword", "secondaryKeyword", tags, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, $post$check-website-after-every-deploy$post$, $post$How to Check Your Website Automatically After Every Deploy$post$, $post$To check a website after every deploy, start a scan from your pipeline - a GitHub Actions step, a Netlify deploy notification or a Vercel webhook - that compares the live pages with an approved baseline. Tests prove the code works; a post-deploy check proves the pages people see still have their titles, scripts, links and buttons.$post$, $post$**Short answer:** after your production deploy finishes, have your pipeline call a *post-deploy check* that loads your important live pages and compares them with an approved baseline - status, SEO tags, key buttons, scripts and screenshots. If the release changed something that matters, you hear about it minutes after shipping instead of days later from a customer.

{{toc}}

## Why do broken deploys pass CI?

Unit and integration tests check your code. They rarely check the rendered, public page:

- a CSS change hides the signup button on one breakpoint,
- a template refactor drops the canonical tag or sets `noindex`,
- an environment variable is missing in production only, so analytics never loads,
- a CMS entry published with the release changes a headline or a price.

The build is green, the server answers 200 OK, and the page is wrong.

## What should a post-deploy check look at?

- **Status and redirects** of your key pages.
- **SEO tags**: title, meta description, canonical, robots meta, H1.
- **Conversion elements**: signup, checkout and contact buttons exist, are visible and point to the right place.
- **Scripts**: analytics, tag manager and payment scripts are still present.
- **Visual diff**: a full-page screenshot against the baseline.
- **Internal links** that start failing.

A smoke test that fetches the homepage and checks for 200 catches outages; it does not catch any of the above.

## GitHub Actions: a post-deploy step

Store your check URL as a repository secret and call it after the production deploy step. With MyKavo, that URL is the website's **deploy hook**; the optional note labels the check with your commit.

```yaml
- name: Check the site with MyKavo
  if: success()
  env:
    MYKAVO_DEPLOY_HOOK: ${{ secrets.MYKAVO_DEPLOY_HOOK }}
  run: |
    curl -fsS -X POST "$MYKAVO_DEPLOY_HOOK" \
      -H "Content-Type: application/json" \
      -d "{\"note\":\"${GITHUB_SHA::7}\"}"
```

The same one-line `curl` works in GitLab CI, CircleCI, Bitbucket Pipelines or Jenkins.

## Netlify: deploy notifications

In your Netlify site's deploy notification settings, add an **outgoing webhook** for the *Deploy succeeded* event pointing at the check URL. Netlify posts its deploy details as JSON; a check that ignores the body works as is. Note that deploy previews and branch deploys fire the event too, so on busy sites prefer a step that runs only for production.

## Vercel: CLI step or webhook

If you deploy from CI with the Vercel CLI, add the `curl` step right after the production deploy command. On plans with webhooks, you can instead point a *deployment succeeded* webhook at the check URL - but it also fires for preview deployments, so the CI step is usually the better fit.

## What happens when the check finds something

A good post-deploy check gives a verdict, not a log dump:

- **Nothing important changed** - a "deploy verified" notification, and the check in your history with the release note.
- **Something changed** - the changes ranked by severity, each with previous and current values and before-and-after screenshots.
- **Expected changes** from the release can be approved in one go, which updates the baseline for the next deploy.

MyKavo's deploy checks work exactly this way. The full setup, with security notes, is in the [deploy checks docs](https://mykavo.app/docs/platform/deploy-checks).

{{cta}}

{{faq}}
Q: What is a post-deploy check?
A: A check that runs right after a production deploy and verifies the live site - status, SEO tags, key buttons, scripts and visual layout - against an approved baseline, so regressions that tests miss are caught within minutes.
Q: How do I run a website check after a GitHub Actions deploy?
A: Add a step after your production deploy that sends a POST request to your monitoring tool's deploy hook, for example with curl, using a URL stored as a repository secret.
Q: Do Netlify and Vercel webhooks fire for preview deployments?
A: Generally yes. Netlify's deploy-succeeded notification and Vercel's deployment webhooks also fire for previews, so if you deploy previews often, trigger the check from a CI step that runs only for production.
Q: Is a smoke test enough after a deploy?
A: A smoke test catches outages. It does not catch a missing button, a changed canonical, a dropped analytics script or a layout shift - which is what most broken deploys look like.
{{/faq}}
$post$, 'PUBLISHED', now() - interval '14 minutes', 'MyKavo Team', $post$Check Your Website After Every Deploy (GitHub Actions, Netlify, Vercel)$post$, $post$Add a post-deploy check to GitHub Actions, Netlify or Vercel that compares live pages with an approved baseline and alerts you when a release changed something important.$post$, $post$check website after deploy$post$, $post$post deploy monitoring$post$, ARRAY[$post$Deploys$post$, $post$Developers$post$, $post$Monitoring$post$]::text[], now(), now())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_post (id, slug, title, excerpt, content, status, "publishedAt", "authorName", "seoTitle", "seoDescription", "primaryKeyword", "secondaryKeyword", tags, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, $post$accidental-noindex-how-to-detect$post$, $post$Accidental noindex: How to Catch It Before Google Drops Your Pages$post$, $post$Accidental noindex happens when a live page picks up a noindex robots tag - often from a staging setting, an SEO plugin change or a theme update - and Google then drops it from search. Check the page source or Search Console's URL Inspection, and use a monitor that alerts you the moment a page changes from index to noindex.$post$, $post$**Short answer:** an accidental `noindex` tells Google to drop a page from search, and it is usually added by a setting or deploy rather than on purpose. Check your important pages' robots meta tag and `X-Robots-Tag` header after every deploy or CMS update, and use monitoring that flags an *index to noindex* change as critical, so you catch it before rankings disappear.

{{toc}}

## What does noindex do?

`noindex` is an instruction to search engines not to include a page in their index. It can be set two ways:

- **In the HTML:** `<meta name="robots" content="noindex">`
- **In an HTTP header:** `X-Robots-Tag: noindex`

When Google recrawls a page and sees `noindex`, it removes the page from search results - usually within days. Traffic from that page stops, and nothing on the page itself looks wrong to a visitor.

## How does noindex get added by accident?

- **WordPress "Discourage search engines from indexing this site"** left ticked after launch (Settings > Reading), or copied over from staging.
- **Staging configuration shipped to production**, such as an environment flag that adds `noindex` everywhere except where it is turned off.
- **SEO plugin updates or migrations** that reset per-page or per-post-type index settings.
- **Template changes** that add the robots tag to the wrong layout.
- **Server or CDN rules** that add an `X-Robots-Tag` header to more paths than intended.

## How do I check whether a page is noindex?

1. **View the page source** and search for `robots`. Look for `noindex` in the content attribute.
2. **Check the headers**: `curl -I https://example.com/page` and look for `X-Robots-Tag`.
3. **Google Search Console > URL Inspection** shows whether Google sees the page as indexable, and why not.
4. **Search Console's Pages report** lists URLs "Excluded by 'noindex' tag" - useful, but it reports after Google has already recrawled.

## How to get alerted the moment it happens

The manual checks work once. The risk is the *next* deploy, plugin update or setting change. Monitoring your important pages against an approved baseline turns this into an alert:

- MyKavo checks each monitored page's **robots meta tag** on every scan and flags a change from index to noindex as **critical**, with the before and after values.
- It also watches **robots.txt**, and flags a robots.txt that newly blocks all crawlers as critical.
- MyKavo does not currently read the `X-Robots-Tag` header, so if your stack sets robots rules at the server or CDN, include a `curl -I` check in your deploy pipeline as well.

{{cta}}

## What to do if you find an accidental noindex

1. Remove the `noindex` (or the setting that adds it) and deploy.
2. In Search Console, use **URL Inspection > Request indexing** for your most important pages.
3. Check the Pages report over the next days to confirm they return.
4. Add monitoring so the next one is caught in minutes, not weeks.

{{faq}}
Q: How long does it take Google to drop a noindex page?
A: Google removes a page after it recrawls it and sees noindex, which for frequently crawled pages can be a matter of days.
Q: How do I check if my WordPress site is set to noindex?
A: In wp-admin go to Settings > Reading and make sure "Discourage search engines from indexing this site" is unticked, then check the page source of a few key pages for a robots meta tag containing noindex.
Q: Can noindex be set without a meta tag?
A: Yes. The X-Robots-Tag HTTP header can set noindex at the server or CDN level. Check it with curl -I or your browser's network tools.
Q: How do I get the page back into Google after removing noindex?
A: Remove the noindex, then request indexing for the page with URL Inspection in Google Search Console. Pages usually return after the next crawl.
{{/faq}}
$post$, 'PUBLISHED', now() - interval '21 minutes', 'MyKavo Team', $post$Accidental noindex: How to Detect It Before Google Drops Pages$post$, $post$How accidental noindex happens (WordPress settings, staging configs, SEO plugin updates, X-Robots-Tag), how to check any page, and how to get alerted when a page flips to noindex.$post$, $post$accidental noindex$post$, $post$noindex tag check$post$, ARRAY[$post$SEO$post$, $post$Monitoring$post$]::text[], now(), now())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_post (id, slug, title, excerpt, content, status, "publishedAt", "authorName", "seoTitle", "seoDescription", "primaryKeyword", "secondaryKeyword", tags, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, $post$monthly-website-report-for-clients$post$, $post$What to Put in a Monthly Website Report for Clients (With Template)$post$, $post$A good monthly website report shows a client what was checked, what changed or broke and how it was fixed, plus uptime and performance, on one page they can read in a minute. Lead with outcomes rather than raw data, and send it as a live link so it is always current.$post$, $post$**Short answer:** a monthly website report for a client should fit on one page and answer three questions: *is the site healthy, what did you catch, and what did you do about it?* Include uptime and incidents, average response time, changes caught and resolved, pages monitored and scans run, SSL certificate status and Lighthouse scores - with your agency's branding, delivered on the same day every month.

{{toc}}

## Why monthly website reports matter for agencies

Good maintenance is invisible: when nothing breaks, the client sees nothing. The report makes the work visible - the updates applied, the regressions caught before a customer did, the certificate renewed in time. It is the single best retention tool a maintenance retainer has.

## What to include in a monthly website report

1. **Headline status** - one sentence: "Healthy all month" or "One incident, resolved in 12 minutes."
2. **Uptime and incidents** - the percentage for the period and each incident with its duration.
3. **Average response time** - and whether it moved.
4. **Changes caught** - how many changes monitoring detected, how many were important, and that they were resolved.
5. **Scans run and pages monitored** - proof the checking actually happened.
6. **SSL certificate** - valid until when, and days left.
7. **Performance scores** - Lighthouse performance, accessibility, best practices and SEO.
8. **Work done** (optional) - plugin and core updates applied, content changes shipped.
9. **Next steps** (optional) - recommendations, such as a slow page to optimize.

## What to leave out

- Raw logs and every minor change. Summarize; link to details.
- Jargon without meaning. "Canonical tag restored on /pricing" means more with "so Google keeps ranking the right page".
- Vanity metrics you did not influence.

## A monthly website report template

> **Website report - [site] - [month year]**
> Prepared by [agency]
>
> **Status:** Healthy all month.
>
> | | |
> |---|---|
> | Uptime | 99.98% (1 incident, 4 minutes) |
> | Average response time | 412 ms |
> | Changes caught | 7 (2 important, all resolved) |
> | Monitoring scans run | 30, across 12 pages |
> | SSL certificate | Valid, 71 days left |
> | Lighthouse | Performance 91 · Accessibility 98 · Best practices 100 · SEO 96 |
>
> **Notable this month:** A plugin update removed the "Book a call" button on /contact. It was caught by the next check and restored the same morning.

## How to automate client reports

Building this by hand every month does not scale past a handful of clients. MyKavo generates it from the monitoring it already does:

- a **live report link** per website with uptime, response time, changes caught, SSL and Lighthouse scores for the last 30 days, which can be saved as a PDF;
- **white-label branding** - your agency name, logo and accent color;
- **scheduled email delivery** to up to five client addresses, every week or month, with the headline numbers and a link to the full report.

Report links come with every plan; white-label branding and automatic client emails are part of the Agency plan.

{{cta}}

{{faq}}
Q: What should be in a website maintenance report?
A: Uptime and incidents, average response time, changes caught and resolved, pages monitored and scans run, SSL certificate status and performance scores, plus a one-line headline status and optionally the work done that month.
Q: How often should I send clients a website report?
A: Monthly suits most retainers. Weekly works for high-traffic or e-commerce sites where the client wants closer oversight.
Q: Should client reports be white-labeled?
A: For agencies, yes. The report represents your service, so it should carry your agency's name, logo and colors rather than the monitoring tool's.
Q: Can I automate monthly client reports?
A: Yes. Tools that already monitor the site, such as MyKavo, can generate the report from their data and email it to clients on a schedule.
{{/faq}}
$post$, 'PUBLISHED', now() - interval '28 minutes', 'MyKavo Team', $post$Monthly Website Report for Clients: What to Include + Template$post$, $post$What agencies should put in a monthly website maintenance report for clients - uptime, speed, changes caught, SSL, Lighthouse scores - plus a copy-ready template and how to automate it.$post$, $post$monthly website report for clients$post$, $post$website maintenance report template$post$, ARRAY[$post$Agencies$post$, $post$Reports$post$]::text[], now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Check: the five guides should be listed, newest first.
SELECT slug, status, "publishedAt" FROM blog_post WHERE slug IN ('wordpress-auto-updates-broke-my-site', 'what-is-website-change-monitoring', 'check-website-after-every-deploy', 'accidental-noindex-how-to-detect', 'monthly-website-report-for-clients') ORDER BY "publishedAt" DESC;