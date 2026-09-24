# MyKavo for Shopify - App Store listing and submission

Everything needed to take the app from "installs on the dev store" to "listed
on the Shopify App Store". Technical details of the app itself live in
[SHOPIFY_APP.md](./SHOPIFY_APP.md).

Billing model (decided): the app is **free to install**. It links to a
MyKavo account, and paid plans are billed by MyKavo on mykavo.app, not
through Shopify. The embedded screen therefore shows no upgrade or billing
buttons (the generator strips them, and `bootstrap.js` drops
`links.billing` from API responses).

## 1. Before submitting - Dev Dashboard

In the Dev Dashboard, open the app, then create a new version with:

| Setting | Value |
| --- | --- |
| App URL | `https://mykavo.app/shopify` |
| Embed app in Shopify admin | On |
| Scopes | `read_themes` (nothing else) |
| Use legacy install flow | Off (Shopify-managed install) |
| Redirect URLs | `https://mykavo.app/shopify` |
| Compliance webhooks - customer data request | `https://mykavo.app/api/shopify/webhooks` |
| Compliance webhooks - customer data erasure | `https://mykavo.app/api/shopify/webhooks` |
| Compliance webhooks - shop data erasure | `https://mykavo.app/api/shopify/webhooks` |
| Webhooks API version | `2026-07` |

The app registers `themes/publish`, `themes/update` and `app/uninstalled`
itself on first open. The three compliance topics can only be set in the app
configuration, and the automated checks fail without them.

Release the version, then set **Distribution** to **Public distribution
(Shopify App Store)**. This choice cannot be undone.

## 2. Listing text

Character limits are the form's; every value below fits.

**App name** (max 30): `MyKavo: Theme Change Checks`

**App card subtitle** (max 62):
`Know when a theme change breaks your store`

**App introduction** (max 100):
`Check your store after every theme publish and edit, and see what changed before shoppers do.`

**App details** (max 500):

```
Theme updates and editor tweaks are the most common way a store quietly breaks: a hidden add-to-cart button, a product page gone noindex, a changed title. The store stays up, so nothing else notices. MyKavo scans the pages you choose every time your live theme is published or edited, compares them to an approved baseline, and shows before-and-after screenshots and values in your admin. Approve intended changes in one click. Nothing is added to your storefront.
```

**Features** (max 80 each):

1. `A check after every live theme publish and edit, with a clear verdict`
2. `Before-and-after screenshots, titles, meta tags and button text`
3. `Add-to-cart and checkout buttons watched on every scan`
4. `Changes ranked Critical to Info, with one-click approve or ignore`
5. `Adds nothing to your storefront: one permission, read themes`

**Search terms** (max 5):
`theme monitor`, `visual regression`, `store monitoring`, `seo alerts`, `broken store`

**Category**: Store management > Operations (or Store design > Theme
management if offered).

**Pricing**: Free to install. In "Additional charges" / pricing details:

```
Free to install. The app connects to a MyKavo account. MyKavo has a free plan (1 website, 5 pages, weekly scans). Automatic theme checks are included in MyKavo Pro and Agency, billed by MyKavo at mykavo.app/pricing.
```

**URLs**

| Field | Value |
| --- | --- |
| Privacy policy | `https://mykavo.app/privacy` |
| Website / marketing | `https://mykavo.app/shopify-app` |
| FAQ / documentation | `https://mykavo.app/docs` |
| Support email | `support@mykavo.app` |

## 3. Media

All in `plugins/shopify/listing/`:

| File | Use |
| --- | --- |
| `app-icon-1200.png` | App icon (1200 x 1200, no text, no rounded corners - Shopify rounds it) |
| `screenshot-1-overview.png` | Feature media image and screenshot 1 (1600 x 900) |
| `screenshot-2-theme-checks.png` | Screenshot 2 |
| `screenshot-3-change.png` | Screenshot 3 |
| `screenshot-4-changes.png` | Screenshot 4 |
| `screenshot-5-connect.png` | Screenshot 5 |

Screenshot alt text:

1. `MyKavo overview: store status, uptime, open changes and store pages monitored`
2. `Theme checks: each theme publish and edit with its verdict`
3. `A change after a theme publish, with before and after side by side`
4. `All changes, filtered by severity, labelled with the theme change`
5. `Connect the store to a free MyKavo account`

The screenshots use a fictional store ("Northwind Coffee") captured from the
real app against a local database, so no customer data appears.

**Demo screencast** (required for review, not shown publicly). Record 2 to 3
minutes on the dev store, with English narration or captions:

1. Install from the install link; the app opens in the admin.
2. Press **Connect to MyKavo**, sign in, choose the website, approve; the app
   now shows the overview.
3. Online Store > Themes: publish a theme (or edit the live one and save).
4. Back in the app, **Theme checks** shows the new entry with its verdict.
5. Open a change: before and after, then **Approve change**.
6. Settings > Apps: uninstall.

## 4. Reviewer access

Reviewers install the app on their own development store. Two things to know:

- The app needs a MyKavo account, and theme checks need Pro. Give reviewers a
  ready account rather than making them sign up.
- Development-store storefronts are password protected, so a brand-new website
  for the reviewer's store would only ever show the password page. The
  reviewer account therefore comes with a public website that already has a
  baseline; the reviewer links their store to it with **Another website**.

Set up once, before submitting:

1. Sign up at https://mykavo.app/signup with an address you control, for
   example `shopify-review@mykavo.app` (a real, receiving mailbox), and a
   strong password that exists nowhere else.
2. Add a public website (for example `https://mykavo.app`), choose three or
   four pages and let the baseline finish.
3. In the Supabase SQL editor, give that workspace Pro. Replace the email
   in the last line only:

```sql
INSERT INTO "subscription" ("id","workspaceId","planId","status","provider","createdAt","updatedAt")
SELECT 'comp_shopify_review', m."workspaceId", 'pro', 'active', 'manual', now(), now()
FROM "workspace_member" m JOIN "user" u ON u.id = m."userId"
WHERE u.email = 'shopify-review@mykavo.app'
ON CONFLICT ("workspaceId") DO UPDATE SET "planId"='pro', "status"='active';
```

The billing sweep ignores rows without `currentPeriodEnd`, so this stays Pro
until deleted.

**Testing instructions** (paste into the submission form, with the password
filled in there and nowhere else):

```
1. Install the app. It opens in the Shopify admin and asks you to connect a MyKavo account.
2. Press "Connect to MyKavo". A MyKavo tab opens. Sign in with:
   Email: shopify-review@mykavo.app
   Password: (see below)
3. Development stores are password protected, so the test account already monitors a public website with a baseline. Under "Another website" choose it and press Approve. Close the tab; the app refreshes and shows the overview.
4. In Online Store > Themes, publish any theme, or open the live theme in the editor, change a setting and save.
5. In the app, open "Theme checks". The change appears within a minute with its scan; when the scan finishes it shows "Verified - nothing changed" or the changes found.
6. Open "Changes" to review any change, with before and after values and screenshots, and approve, mark fixed or ignore it.
7. Uninstalling removes the store's access token and link immediately; shop/redact deletes the remaining store record.

The app requests only read_themes and adds nothing to the storefront. Paid MyKavo plans are billed by MyKavo outside Shopify; the test account is already on Pro.
```

**Emergency developer contact**: the founder's email and phone (asked for in
the Partner account, not public).

## 5. Checks Shopify runs automatically

| Requirement | How the app meets it |
| --- | --- |
| Immediately authenticates after install | Shopify-managed install plus token exchange on first open (`ensureInstalled`) |
| Redirects to app UI after install | Managed install opens `/shopify` in the admin |
| Embedded, uses App Bridge from the CDN | `/shopify` loads `app-bridge.js` first in `<head>` |
| Session tokens, not cookies | Every API call carries the App Bridge ID token (`site-auth.ts`) |
| Compliance webhooks, HMAC verified | `/api/shopify/webhooks` returns 401 on a bad HMAC, 200 otherwise |
| TLS | mykavo.app is HTTPS only (HSTS) |
| Clickjacking | `frame-ancestors` limited to the store and admin.shopify.com |
| Top-level visit | Redirects into the admin instead of rendering outside it |
| Minimal scopes | `read_themes` only |
| No storefront impact | No theme app extensions, script tags or pixels |

## 6. After approval

1. Put the listing URL in `SHOPIFY_APP_STORE_URL` in
   `apps/web/src/config/shopify-app.ts`. The /shopify-app page then shows
   "Add to Shopify" instead of the web sign-up.
2. Deploy.
3. Keep the reviewer account; Shopify re-reviews on major changes.
