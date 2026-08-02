# MyKavo SEO Checker - Chrome Web Store publishing notes

Everything you need to publish from https://chrome.google.com/webstore/devconsole
(one-time $5 developer fee on first publish).

## Upload

Upload `dist/mykavo-seo-checker.zip` (regenerate any time with:
`cd apps/extension && mkdir -p dist && zip -r dist/mykavo-seo-checker.zip . -x "dist/*" -x "STORE_LISTING.md"`).

## Listing copy

- **Name**: MyKavo SEO Checker
- **Summary** (132 chars max): Instant on-page SEO check - titles, canonicals, schema, social tags and 20 checks with plain-English fixes. One click.
- **Category**: Developer Tools
- **Description**:

  Check any page's SEO in one click - no signup, no data collection.

  MyKavo SEO Checker runs 20 on-page checks the moment you open the popup:
  title and meta description length, canonical health, noindex, mobile
  viewport, HTTPS and mixed content, Open Graph and Twitter Card tags,
  structured data validity, image alt coverage, H1 structure, internal
  nofollow links, content depth, and more. Every result explains what it
  means and exactly how to fix it, with an overall score out of 100.

  Everything runs locally in your browser. The extension reads the page you
  clicked on - nothing else - and sends nothing anywhere.

  Want the full picture? MyKavo (mykavo.app) crawls up to 1,500 pages per
  audit with 75+ checks, monitors your sites for changes, and emails you
  when something important breaks.

## Privacy tab answers

- **Single purpose**: analyze the SEO of the page the user clicks the icon on.
- **Permission justification - activeTab**: read the current page's DOM only
  after an explicit user click on the extension icon.
- **Permission justification - scripting**: inject the read-only analysis
  function into the active tab (no persistent content scripts).
- **Data usage**: no user data is collected, stored, or transmitted. All
  analysis happens locally; the extension makes zero network requests.
- **Remote code**: none.

## Assets needed at upload time

- Screenshots: 1280×800 - open the popup on any site and screenshot it
  (the score ring + checks list is the money shot).
- Small promo tile (440×280): gold background #FFD400, the page-spark mark,
  "MyKavo SEO Checker" in ink #151515.
