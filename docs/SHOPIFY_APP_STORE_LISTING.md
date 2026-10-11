# MyKavo for Shopify - App Store listing and submission

Everything needed to take the app from "installs on the dev store" to "listed
on the Shopify App Store". Technical details of the app itself live in
[SHOPIFY_APP.md](./SHOPIFY_APP.md).

Billing model (decided 2026-10-11): **Shopify App Pricing**. The App Store
does not list apps that bill off-platform (requirement 1.2.1), so merchants
who install from Shopify pick Free, Pro or Agency on Shopify's own plan page
and pay on their Shopify bill. MyKavo reads the store's active subscription
from the Partner API and the plan applies to the MyKavo workspace the store
is linked to. Everyone who signs up on mykavo.app keeps paying through Dodo.
How it works in code: [SHOPIFY_APP.md](./SHOPIFY_APP.md#billing-shopify-app-pricing).

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

**Pricing**: set up as Shopify App Pricing (section 2a). No pricing text
anywhere else in the listing or in images (requirements 4.2.2 and 4.2.3).

## 2a. Pricing - Shopify App Pricing (Partner Dashboard)

Partner Dashboard > App distribution > All apps > MyKavo > Distribution >
Manage listing > (English) Edit > Pricing content > Manage > Settings:
**Pricing method: Shopify App Pricing**, default billing frequency
**Monthly**. Then add three public plans. The plan **names** below matter:
the app recognises a paid plan by the word "pro" or "agency" in its handle,
and anything else (Free, the private test plan) grants nothing.

| Plan name | Price | Plan details (one per line in the form) |
| --- | --- | --- |
| Free | $0 | 1 website · 5 monitored pages · Weekly scans · Theme changes listed in the app |
| Pro | $20 / month | 8 websites · 15 monitored pages each · Daily scans · Automatic check after every theme publish and edit · Run scans any time |
| Agency | $79 / month | 30 websites · 25 monitored pages each · Daily scans · Automatic theme checks · White-label client reports · Up to 15 team members |

These match the mykavo.app plans (`packages/shared/src/plan-tier.ts`,
`apps/web/src/config/plans.ts`); change both together.

For each paid plan:

- **Welcome link**: `/` (back into the app). Shopify appends `plan_handle`;
  the app then asks Shopify for the new plan at once.
- Tick **free for partners and developers**, so reviewers and your own
  development stores can select Pro and Agency at no charge.

Partner API access (Settings > Partner API clients > Create API client,
permission **Manage apps**), then set these four in Netlify **and** on the
worker server:

| Variable | Where to find it |
| --- | --- |
| `SHOPIFY_PARTNER_ORG_ID` | The number in your Partner Dashboard URL |
| `SHOPIFY_PARTNER_API_TOKEN` | The Partner API client's access token |
| `SHOPIFY_APP_ID` | The number in the app's Partner Dashboard URL |
| `SHOPIFY_APP_HANDLE` | The app's handle (the last part of its admin URL, `admin.shopify.com/store/<store>/apps/<handle>`) |

Until all four are set the app shows no plan buttons at all, so nothing
breaks while this is being set up.

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
5. `Connect the store to a MyKavo account`

The screenshots use a fictional store ("Northwind Coffee") captured from the
real app against a local database, so no customer data appears.

**Demo screencast** (required for review, not shown publicly). Record 2 to 3
minutes on the dev store, with English narration or captions:

1. Install from the install link; the app opens in the admin.
2. Press **Connect to MyKavo**, sign in, choose the website, approve; the app
   now shows the overview.
3. Press **Daily scans with Pro** (or Plan and billing in the menu): Shopify's
   plan page opens; choose Pro and approve. The app returns showing Pro.
4. Online Store > Themes: publish a theme (or edit the live one and save).
5. Back in the app, **Theme checks** shows the new entry with its verdict.
6. Open a change: before and after, then **Approve change**.
7. Settings > Apps: uninstall.

## 4. Reviewer access

Reviewers install the app on their own development store. Two things to know:

- The app needs a MyKavo account. Give reviewers a ready account rather than
  making them sign up. Theme checks need Pro, which reviewers select on
  Shopify's plan page at no charge (section 2a: "free for partners and
  developers").
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
3. Leave the workspace on Free: the reviewer's Pro comes from the plan they
   pick in Shopify, which is what review needs to see working.

**Testing instructions** (paste into the submission form, with the password
filled in there and nowhere else):

```
1. Install the app. It opens in the Shopify admin and asks you to connect a MyKavo account.
2. Press "Connect to MyKavo". A MyKavo tab opens. Sign in with:
   Email: shopify-review@mykavo.app
   Password: (see below)
3. Development stores are password protected, so the test account already monitors a public website with a baseline. Under "Another website" choose it and press Approve. Close the tab; the app refreshes and shows the overview.
4. Automatic theme checks are part of the Pro plan. Press "Daily scans with Pro" on the overview (or "Plan and billing" in the menu). Shopify's plan page opens; choose Pro (free for development stores) and approve. You return to the app, now on Pro.
5. In Online Store > Themes, publish any theme, or open the live theme in the editor, change a setting and save.
6. In the app, open "Theme checks". The change appears within a minute with its scan; when the scan finishes it shows "Verified - nothing changed" or the changes found.
7. Open "Changes" to review any change, with before and after values and screenshots, and approve, mark fixed or ignore it.
8. Uninstalling removes the store's access token and link immediately and ends its plan; shop/redact deletes the remaining store record.

The app requests only read_themes and adds nothing to the storefront. All charges go through Shopify App Pricing.
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
| Billing through Shopify | Shopify App Pricing; plan buttons open only Shopify's plan page (`bootstrap.js` drops any other billing link) |

## 6. After approval

1. Put the listing URL in `SHOPIFY_APP_STORE_URL` in
   `apps/web/src/config/shopify-app.ts`. The /shopify-app page then shows
   "Add to Shopify" instead of the web sign-up.
2. Deploy.
3. Keep the reviewer account; Shopify re-reviews on major changes.
