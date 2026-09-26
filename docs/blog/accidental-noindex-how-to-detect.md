---
slug: accidental-noindex-how-to-detect
title: "Accidental noindex: How to Catch It Before Google Drops Your Pages"
excerpt: "Accidental noindex happens when a live page picks up a noindex robots tag - often from a staging setting, an SEO plugin change or a theme update - and Google then drops it from search. Check the page source or Search Console's URL Inspection, and use a monitor that alerts you the moment a page changes from index to noindex."
seoTitle: "Accidental noindex: How to Detect It Before Google Drops Pages"
seoDescription: "How accidental noindex happens (WordPress settings, staging configs, SEO plugin updates, X-Robots-Tag), how to check any page, and how to get alerted when a page flips to noindex."
primaryKeyword: "accidental noindex"
secondaryKeyword: "noindex tag check"
tags: SEO, Monitoring
---
**Short answer:** an accidental `noindex` tells Google to drop a page from search, and it is usually added by a setting or deploy rather than on purpose. Check your important pages' robots meta tag and `X-Robots-Tag` header after every deploy or CMS update, and use monitoring that flags an *index to noindex* change as critical, so you catch it before rankings disappear.

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
