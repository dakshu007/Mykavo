# MyKavo service API for WordPress plugin 1.3.1

What the plugin (`plugins/wordpress/mykavo`, version 1.3.1) expects from
`https://mykavo.app/api/wp/v1`. Every request carries the site token
(`Authorization: Bearer <token>`), JSON in and out, as in 1.3.

The plugin is built so that **every endpoint below is optional**: if MyKavo
answers 404, or `/status` does not report the feature, the plugin shows the
free version and keeps working. Ship them in any order.

## Conventions (unchanged from 1.3)

- A plan that does not include a feature answers **403** with
  `{ "error": "<message for the person>", "reason": "PLAN" }`. Add `"code"`
  when a limit (rather than the feature) was hit, e.g. `"element_limit"`.
  The plugin shows `error` as is.
- Errors: `{ "error": "..." }` with a 4xx/5xx status. 401 means the token is
  no longer valid; the plugin then forgets the connection.
- Timeouts on the plugin side: 5 to 20 seconds per call. Keep answers fast;
  never do long work inside the request.

## 1. Plan features: `GET /status`

Add these booleans to `features` (1.3 already sends `autoRollback`,
`aiInsights`, `pluginHealth`, `checkoutGuard`, `updateWindows`). The plugin
caches them for five minutes and in a non-autoloaded option for WP-Cron.

| Key | Plans | Used for |
| --- | --- | --- |
| `instantAlerts` | Starter, Pro, Agency | Email/Slack for silent-disaster alerts (§3) |
| `baselineBeforeUpdate` | Starter, Pro, Agency | "Take a fresh baseline first" in Safe Update All (§5) |
| `llmsSummaries` | Starter, Pro, Agency | One-line page summaries in llms.txt (§6) |
| `redirectSuggestions` | Starter, Pro, Agency | Suggested targets for 404s served to AI (§7) |
| `watchElements` | Pro, Agency (Free: limit enforced by §8) | Element picker and editor panel |
| `riskHold` | Pro, Agency | Hold risky automatic updates for 48 h (§9) |
| `vulnDetails` | Starter, Pro, Agency | Vulnerability details and fixed version (§10) |
| `vulnAutoUpdate` | Pro, Agency | Auto-update vulnerable plugins (§10) |
| `formChecks` | Starter, Pro, Agency | Contact form render checks (§11) |
| `formSubmissions` | Pro, Agency | Test submissions through forms (§11) |
| `clientReports` | Agency | Reports tab (§12) |
| `aiAssistants` | Pro, Agency | MCP card (mirrors `plan.limits.aiAssistants`) |

## 2. `GET /site` (already shipped with this change)

New fields, all used by the Overview and Plan tab:

```json
{
  "workspace": {
    "name": "Northwind Studio",
    "plan": {
      "id": "pro",
      "name": "Pro",
      "limits": { "pagesPerWebsite": 15 },
      "includes": { "aiAssistants": true }
    }
  },
  "siteAudit": { "id": "...", "status": "COMPLETED", "healthScore": 87, "errors": 3, "warnings": 14, "completedAt": "ISO" } | null,
  "links": {
    "siteAudit": "https://mykavo.app/dashboard/site-audit/<id>",
    "aiAssistants": "https://mykavo.app/dashboard/ai-assistants",
    "mcpEndpoint": "https://mykavo.app/api/mcp"
  }
}
```

`pagesPerWebsite` is `null` for unlimited.

## 3. Silent-disaster alerts: `POST /alerts`

Sent from WP-Cron a few seconds after the setting changed. Free plans: store
and show in the dashboard. Plans with `instantAlerts`: send an email (and
Slack, when connected) right away.

Request:

```json
{
  "alerts": [
    {
      "id": "sjj7br1dqvpp",
      "type": "noindex | siteurl | home | permalinks | admin_email | new_admin",
      "severity": "critical | high",
      "from": "string | null",
      "to": "string | null",
      "by": "display name | null",
      "at": "2026-11-05T17:22:22+00:00",
      "message": "Human sentence, in the site's language"
    }
  ]
}
```

Response `200`: `{ "received": 2, "notified": true }`. Make it idempotent on
`id` (the plugin re-sends anything it did not get a 2xx for, for up to a day).
A 404 makes the plugin stop retrying.

## 4. "Did it crash?" result: `POST /crash-check`

Sent from WP-Cron about 10 seconds after an update, with the local check of
the home page and up to three monitored pages.

Request:

```json
{
  "scanId": "the scan id POST /updates returned, or null",
  "state": "ok | broken | unknown",
  "items": [{ "type": "plugin", "name": "WooCommerce", "from": "9.3.1", "to": "9.4.0" }],
  "pages": [{ "url": "https://example.com/", "status": 500, "problem": "server-error | fatal-error | empty | unreachable | null" }]
}
```

Response `200`: `{ "action": "rollback" | "none", "reason": "optional" }`.
Answer `rollback` only when `state` is `broken` and the plan has
`autoRollback`; the plugin also requires its own automatic-rollback switch to
be on. Record it against the scan so the dashboard can show "the site
crashed after this update".

## 5. Fresh baseline before Safe Update All: `POST /scans`

Existing endpoint, new optional body field:

```json
{ "purpose": "before-update" }
```

With `baselineBeforeUpdate`: start a scan whose results become the new
approved baseline for every monitored page (no change events), and answer as
today: `{ "scan": { "id": "..." } }`. The plugin waits for `scanInProgress`
in `GET /site` to clear (polling every 8 s, up to 10 minutes) before
updating. Without the feature: 403 PLAN.

## 6. llms.txt summaries: `POST /llms-summaries`

Daily from WP-Cron while llms.txt is switched on, and when it is switched on.

Request: `{ "urls": ["https://example.com/", "https://example.com/pricing/"] }`
(at most 30, all on the site).

Response `200`:

```json
{ "summaries": [{ "url": "https://example.com/pricing/", "summary": "One plain sentence, max 300 characters." }] }
```

Build summaries from the latest snapshot text of each page (monitored pages
first; others may be fetched once and cached). 403 PLAN without
`llmsSummaries`.

## 7. Redirect suggestions: `POST /redirect-suggestions`

When the owner presses "Suggest targets" on the AI crawlers screen.

Request: `{ "paths": ["/old-pricing/", "/blog/2019/launch/"] }` (max 20).

Response `200`:

```json
{ "suggestions": [{ "path": "/old-pricing/", "url": "https://example.com/pricing/", "title": "Pricing" }] }
```

`url` must be on the same host as the site. Match by slug similarity, page
titles and the site's discovered pages. 403 PLAN without `redirectSuggestions`.

## 8. Watched elements: `POST /elements` and `GET /pages`

From the element picker on the Pages tab.

Request:

```json
{
  "url": "https://example.com/shop/product/",
  "selector": "#add-to-cart",
  "name": "Add to cart",
  "expectedText": "Add to cart",
  "expectedHref": ""
}
```

Create a `MonitoredElement` (importance IMPORTANT, expected existence and
visibility true) on the monitored page with that URL, adding the page if the
plan has room. Response `201`: `{ "element": { "id": "...", "name": "...", "selector": "..." } }`.

Limits: Free 1, Starter 2, Pro/Agency per `conversionElementMonitoring`
limits. Over the limit: `403 { "error": "...", "reason": "PLAN", "code": "element_limit" }`.

`GET /pages`: add each page's elements so the editor panel can warn before an
edit removes one:

```json
{ "pages": [{ "...": "as today", "elements": [{ "name": "Add to cart", "selector": "#add-to-cart", "expectedText": "Add to cart", "expectedHref": null }] }] }
```

## 9. Update risk: `POST /update-risk`

Only when the Plugins screen opens and a plugin has an update waiting; the
answer is cached 12 hours.

Request:

```json
{ "plugins": [{ "slug": "woocommerce", "from": "9.3.1", "to": "9.4.0" }] }
```

Response `200`:

```json
{ "plugins": [{ "slug": "woocommerce", "to": "9.4.0", "sites": 214, "changedPercent": 3, "risky": false }] }
```

Built from `SiteUpdateEvent` + scan results across all workspaces: `sites`
is how many MyKavo sites ran that exact update with a finished check,
`changedPercent` how many of those saw HIGH or CRITICAL changes. The plugin
hides the line under 5 sites. Set `risky` when `sites >= 20` and
`changedPercent >= 15` (tune freely). Free for all plans: it is anonymous,
aggregate data. On plans with `riskHold` the plugin holds risky automatic
updates for 48 hours.

## 10. Vulnerabilities: `POST /plugins` (existing)

Add `vulnerabilities` to the answer:

```json
{
  "allowed": true,
  "flagged": [],
  "vulnerabilities": {
    "count": 1,
    "items": [
      { "slug": "akismet", "name": "Akismet", "title": "Stored XSS in the comment form", "severity": "critical | high | medium | low", "fixedIn": "5.3.1", "cve": "CVE-2026-1234", "url": "https://..." }
    ]
  }
}
```

Every plan gets `count`. Send `items` only with `vulnDetails` (omit the key
otherwise). Match installed slug + version against a vulnerability feed
(WPScan, Patchstack or Wordfence Intelligence; check their licence terms for
commercial use). With `vulnAutoUpdate` and the owner's switch on, the plugin
lets WordPress auto-update a listed plugin once the offered version is at
least `fixedIn`.

## 11. Contact forms: `POST /forms`

Daily from WP-Cron on plans with `formChecks`, and on demand.

Request:

```json
{ "pages": [{ "url": "https://example.com/contact/", "title": "Contact", "plugin": "contact-form-7 | gravityforms | wpforms" }] }
```

Response `200`:

```json
{
  "submissions": true,
  "forms": [
    { "url": "https://example.com/contact/", "status": "ok | broken | pending", "checkedAt": "ISO", "submission": { "status": "ok | failed", "at": "ISO" } | null, "message": "" }
  ]
}
```

Render check (`formChecks`): the page's next scan confirms a `<form>` from
that plugin is present and visible (store as a monitored element). Test
submission (`formSubmissions`): a weekly submission with a clearly labelled
test message from MyKavo; report `ok` when the form shows its success state.
Respect honeypots/CAPTCHAs: report `failed` with a `message` rather than
bypassing them. 403 PLAN without `formChecks`.

## 12. Client reports (Agency): `GET /reports`, `PUT /report-branding` (built)

Shipped with this release (`apps/web/src/app/api/wp/v1/reports`,
`report-branding`). Plans with `whiteLabelReports` only; otherwise 403 PLAN.

`GET /reports` answers with this website's live white-label report (the
`/r/[token]` page, last 30 days) once it is switched on for the website in
the dashboard:

```json
{
  "enabled": true,
  "settingsUrl": "https://mykavo.app/dashboard/websites/<id>",
  "brandingUrl": "https://mykavo.app/dashboard/settings",
  "branding": { "name": "Northwind Studio", "logoUrl": "https://mykavo.app/api/brand-logos/...", "color": "#FFD400" },
  "reports": [
    {
      "month": "Oct 6 - Nov 5, 2026",
      "url": "https://mykavo.app/r/<token>",
      "pdfUrl": null,
      "summary": { "updates": 14, "rollbacks": 1, "uptimePermille": 999, "sslDaysLeft": 71, "changesCaught": 6, "aiVisits": 1840 }
    }
  ]
}
```

`enabled: false` (and no reports) when the report is off for the website.
The report page has its own Print button for a PDF, so `pdfUrl` is null.
`PUT /report-branding` takes `{ "brandName": string | null, "color": "#RRGGBB" | null }`
and answers `{ "branding": { "name", "color" } }`. The logo is uploaded in
the dashboard (Settings > Agency branding), never fetched from an address
the site sends.

## Not service-side (free, inside WordPress)

For completeness, these 1.3.1 features need nothing from MyKavo: snapshots
and snapshot rollback, the local crash check, silent-disaster notices, the
critical-change notice and menu badge, "Back up first" with UpdraftPlus, the
MyKavo viewer role, suggested pages, llms.txt (without summaries), per-crawler
robots.txt rules, 404 redirects, fake crawler detection (OpenAI and
Perplexity IP lists, Amazon reverse DNS), the daily email test, the editor
panel and the multisite network screen.
