# MyKavo - SEO & Website Monitor: Chrome Web Store publishing kit

Everything needed to publish from https://chrome.google.com/webstore/devconsole
(one-time $5 developer registration on first publish).

## 1. Build the upload

```
cd apps/extension
./pack.sh
```

Upload `dist/mykavo-chrome-<version>.zip`. Bump `version` in `manifest.json`
for every new upload (the store rejects a version it has already seen).

Store assets (screenshots, promo tiles) are generated separately and kept out
of the zip; see section 5.

## 2. Listing copy

- **Name**: MyKavo - SEO & Website Monitor
- **Summary** (132 characters max):
  Check any page instantly and protect your website with MyKavo monitoring.
- **Category**: Developer Tools
- **Language**: English
- **Description**:

  Instant SEO checks for any page, and one-click website monitoring with MyKavo.

  Open MyKavo on any page and it checks it on the spot - no account needed:
  title and meta description, canonical, indexability, HTTPS and mixed content,
  mobile viewport, H1 structure, structured data, Open Graph and Twitter tags,
  image alt text, internal links, language and favicon. Every result says what
  it means and how to fix it, with an SEO health score out of 100, issues first.

  The check runs locally in your browser. The page you check is never sent
  anywhere.

  PROTECT YOUR WEBSITE IN ONE CLICK
  Press Protect and MyKavo opens with your website already filled in. Sign in
  or create a free account, approve, and MyKavo monitors it around the clock in
  the cloud - Chrome doesn't need to stay open:

  - SEO changes: titles, descriptions, canonicals, noindex, redirects
  - Content and visual changes with before-and-after screenshots
  - Broken links and missing scripts (analytics, tag manager, payments)
  - Performance regressions: page weight, requests, response time
  - Uptime and SSL
  - Conversion elements: signup buttons, checkout, forms

  You get an email when something important changes, and the extension shows
  the website's status - protected, needs attention, or critical - whenever you
  visit it.

  FOR AGENCIES AND DEVELOPERS
  Right-click any page and choose "Monitor this page with MyKavo". Run a scan
  from the extension after a deploy, then open MyKavo to review what changed.

  MyKavo has a free plan. The extension is a quick on-page check, not a full
  site crawler; site-wide monitoring happens in MyKavo.

## 3. Privacy tab

- **Single purpose**: Check the SEO of the page you're on, and connect that
  website to MyKavo website monitoring.
- **activeTab**: read the current page only after you click the extension
  icon, to run the on-page SEO check.
- **scripting**: run the read-only check function in the active tab when you
  click the icon. No persistent content scripts on websites.
- **storage**: remember which websites you connected (and their scoped access
  token), the last status shown, and your usage-count preference.
- **contextMenus**: the single right-click action "Monitor this page with
  MyKavo".
- **Host permission (https://mykavo.app/\*)**: talk to MyKavo's API to show a
  connected website's status, start a scan you ask for, finish connecting, and
  send anonymous usage counts (which can be switched off).
- **Content script on https://mykavo.app/connect/chrome/done**: hands the
  one-time connection code shown on that MyKavo page to the extension. It runs
  on that one MyKavo page only.
- **Remote code**: No. All code ships in the package.
- **Data usage** (tick these):
  - **Web history**: the address of the page you were on, sent to MyKavo only
    when you press Protect or use the right-click action, so MyKavo can add
    that website to your account.
  - **Website content**: none sent. Leave unticked.
  - **User activity**: anonymous counts (installed, opened, checked a page,
    pressed Protect / Scan now / Open MyKavo) with a random install id. Can be
    switched off in the extension menu.
  - Everything else (personally identifiable information, health, financial,
    authentication information, personal communications, location): unticked.
    The extension never sees or stores your MyKavo password.
- Certify: not sold to third parties; not used for unrelated purposes; not
  used for creditworthiness or lending.
- **Privacy policy URL**: https://mykavo.app/privacy#chrome-extension

## 4. How it connects (for reviewers and support)

1. Protect opens `https://mykavo.app/connect/chrome` with the website, a random
   state and a PKCE challenge. The verifier never leaves the extension.
2. The person signs in or signs up there and approves. MyKavo adds the
   website if it's new (same rules and plan limits as the dashboard).
3. `https://mykavo.app/connect/chrome/done` shows a one-time code; the content
   script passes it to the background worker, which exchanges code + verifier
   for a token scoped to that one website.
4. The token can read that website's status and start scans. It is revocable
   from the extension menu (Disconnect) and expires with the website.

## 5. Store assets

All in `store/` (not part of the zip), made from the real extension UI:

- Screenshots, 1280x800 (upload in this order):
  `screenshot-1-instant-check.png`, `screenshot-2-protect.png`,
  `screenshot-3-protected.png`, `screenshot-4-critical.png`,
  `screenshot-5-fixes.png`
- Small promo tile, 440x280: `promo-small-440x280.png`
- Marquee promo tile, 1400x560: `promo-marquee-1400x560.png`
- Store icon, 128x128: `icons/icon128.png`
