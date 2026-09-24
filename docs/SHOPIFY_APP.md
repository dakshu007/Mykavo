# MyKavo for Shopify

An embedded Shopify app that shows a store's MyKavo monitoring inside the
Shopify admin and checks the store whenever its live theme is published or
edited - the Shopify version of the WordPress plugin's Safe Updates.

Billing stays on mykavo.app (free app that connects to a MyKavo account).

## How it fits together

| Piece | Where |
| --- | --- |
| Embedded page (App URL) | `apps/web/src/app/shopify/route.ts` - plain HTML: App Bridge first in `<head>`, then `public/shopify-app/bootstrap.js` |
| Screen | `public/shopify-app/app.js` + `app.css`, **generated** from the WordPress plugin's `assets/` by `apps/web/scripts/shopify-app.mjs` (`node apps/web/scripts/shopify-app.mjs`). A test fails if they drift. |
| Install + session | `POST /api/shopify/session` - verifies the App Bridge session token, completes the install by token exchange, returns link state |
| Link a store to a website | `/connect/shopify?t=...` (consent) -> `POST /api/shopify/connect/approve` |
| Site API | the same `/api/wp/v1/*` routes as the WordPress plugin; `site-auth.ts` accepts a Shopify session token and resolves the store's linked website |
| Theme checks tab | `GET/POST /api/shopify/updates` (log in the plugin's update-log shape, and the on/off switch) |
| Webhooks | `POST /api/shopify/webhooks` - themes/publish, themes/update, app/uninstalled, customers/data_request, customers/redact, shop/redact |
| Pure helpers (tested) | `src/lib/integrations/shopify.ts` |
| Admin API calls | `src/lib/integrations/shopify-admin.ts` (token exchange, shop info, webhook registration) |
| Database | `shopify_shop`, `shopify_theme_event` (migration `20260925090000_shopify_app`); the link itself is a `site_connection` row with platform `shopify` |

### Install (Shopify-managed)

Scopes are set on the app version (`read_themes`). When a merchant opens the
app the first time, the page's session token is exchanged for an **offline**
Admin API token (`exchangeSessionToken`), which is stored AES-256-GCM
encrypted with `GSC_TOKEN_KEY`. The store's name and primary domain are read
once, and the theme and uninstall webhooks are registered.

### Security

- Session tokens: HS256 with the client secret, `aud` = client id, `dest` a
  `*.myshopify.com` store matching `iss`, within `exp`/`nbf` (10 s skew).
- The consent link carries an HMAC-signed, one-hour token naming the store,
  so the consent page never trusts a shop name from the URL.
- Webhooks: `X-Shopify-Hmac-Sha256` over the raw body; retried deliveries are
  de-duplicated by `X-Shopify-Webhook-Id`.
- Framing: `/shopify` is excluded from the site-wide `X-Frame-Options:
  SAMEORIGIN` (next.config.ts) and sends `frame-ancestors https://<shop>
  https://admin.shopify.com` itself.
- Nothing is added to the storefront (no script tags, no theme app
  extension). MyKavo scans the public storefront from its own servers.

### Theme checks

Only the live theme (`role: "main"`) counts. A publish always checks; edits
check at most every 15 minutes (the theme editor saves often). Checks are a
`deploy` scan with a note such as `Published theme Dawn`, gated by the plan
(Pro and Agency) exactly like WordPress Safe Updates.

### Uninstall and privacy

`app/uninstalled` deletes the token and revokes the link. `shop/redact`
(48 hours later) deletes the store's rows. MyKavo holds no Shopify customer
data, so the two customer webhooks have nothing to return or erase. The
store's website in MyKavo belongs to the MyKavo workspace and is kept.

## Setup (Shopify Dev Dashboard)

1. Create the app, then a version with:
   - App URL: `https://mykavo.app/shopify`
   - Embed in Shopify admin: on
   - Access scopes: `read_themes`
   - Legacy install flow: off (Shopify-managed install)
2. Netlify (Functions scope, secret): `SHOPIFY_API_KEY` = Client ID,
   `SHOPIFY_API_SECRET` = Client secret. Redeploy.
3. Apply the migration (`20260925090000_shopify_app`).
4. Install on the development store and open the app.
5. Before App Store submission: compliance webhooks (customers/data_request,
   customers/redact, shop/redact) -> `https://mykavo.app/api/shopify/webhooks`.

Development stores are password-protected, so MyKavo scans their password
page; test change detection on a live store.

## Testing

Unit: `src/lib/integrations/shopify.test.ts`, `src/config/shopify-app.test.ts`.
End to end (run in development against a local database, with a stand-in for
App Bridge): install state, consent and approve, the site API with a session
token, theme webhooks (signature, retries, throttling, draft themes),
the theme log, Settings, uninstall and redact; and the embedded screen in
Chromium (welcome, overview, change drawer, review action, theme checks,
store guard, pages, phone width, disconnect).
