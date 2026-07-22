# MyKavo

> Know what changed. Fix what matters.

MyKavo is a **website change detection & regression monitoring SaaS** for agencies, developers, SEO teams, and website owners. It baselines your pages, re-scans on a schedule, detects meaningful visual / SEO / content / link / script / performance / availability changes, scores them by severity, and alerts you before customers notice.

**LIVE IN PRODUCTION: https://mykavo.app** - with live billing and real customers.

---

## 🧭 New session? Fresh AI assistant? Start here

This README is the **complete, self-contained handoff** for the project. It assumes NOTHING carried over - no prior chat history, no Claude memory files, possibly a different Claude/AI account. Everything needed to understand, run, and continue the project is in this repo. **Last synced: 2026-07-19** (blog CMS keywords/tags/editable publish date + public blog search/load-more live; mobile v1.0.1; landing mobile-overflow fix).

1. **Read this README top to bottom** - current state, architecture, runbooks, gotchas.
2. **Read `CLAUDE.md`** - the original product spec (vision, principles, phases). All phases 0-11 are COMPLETE; the spec still governs product philosophy (deterministic detection, low false positives, cost control, no fake social proof).
3. **Skim `docs/`** - ARCHITECTURE, DATABASE_SCHEMA, SECURITY_MODEL, DESIGN_SYSTEM.
4. Git: **`main` is the branch of record and always equals what is deployed.** Remote: `git@github.com:dakshu007/Mykavo.git` - a **PRIVATE** repo. The only public repo is **`dakshu007/Mykavo-app-download`** (Android APK releases + download page; the site's download button points at its `releases/latest`). Work on a branch, verify, fast-forward main, deploy, push.
5. Secrets are NEVER in this repo. They live in **Netlify env** (web) and **`~/.fluxen/app/apps/worker/.env.production`** on the owner's Mac (worker). Ask the owner (Dakshesh B, GitHub `dakshu007`) for anything missing.

Hard conventions the owner enforces:
- **No em-dashes anywhere** in user-facing text or meta - plain hyphens `-` only.
- **Plan limits live ONLY in `apps/web/src/config/plans.ts`**; severity rules ONLY in `packages/severity-engine`.
- **No fake testimonials, logos, or statistics.** Ever.
- Two separate design systems (see Design language below) - never mix them.
- After every change: lint + typecheck + tests + production build + real-browser verification, THEN deploy, THEN verify on production.

Product naming: the product was renamed **Fluxen → MyKavo** (2026-07-16). The repo folder on the owner's Mac (`~/Desktop/Fluxen`), local DB `fluxen_dev`, launchd agent `com.fluxen.worker-prod`, `~/.fluxen/*`, and the legacy Netlify Blobs store keep the old name **intentionally** - do not rename them.

---

## Status - all spec phases (0-11) complete + live business

| Area | What exists |
|---|---|
| **Brand** | MyKavo + the **page-spark logomark** (gold page panel + five-ray spark, `apps/web/src/components/brand/logo.tsx`, single-currentColor SVG; app icons in `app/icon.svg` → icon.png 512 / apple-icon.png 180). Name story: "My" = Tamil "En" (mine), "Kavo" from Tamil "Kāval" (காவல்) = protection/guarding - "your digital guardian" (told on /about) |
| **Core monitoring** | Add website → SSRF-guarded validation → robots/sitemap/link discovery → page selection → Playwright baseline scan → scheduled re-scans → deterministic comparison (HTTP/SEO/DOM/text/links/scripts/perf/visual/elements) → severity-scored ChangeEvents |
| **Site health** | Uptime probe every 5 min + SSL expiry tracking, DOWN/SSL incidents, uptime/response-time analytics (7/30/90d), incident history |
| **Lighthouse** | On-demand per any page + weekly scheduled audits (Tue 06:00 UTC) + trend sparkline + performance-drop alerts |
| **SEO report** | `/dashboard/websites/[id]/seo` - scored checks incl. broken internal links |
| **Broken links** | Per-scan internal-link probing (SSRF-guarded, only definite failures flag), grouped into ONE site-wide event |
| **Changes UX** | Filters, bulk actions, notes, CSV export, before/after slider + pixel-diff, approve/ignore/resolve, baseline updates |
| **Scan UX** | Live "scan in progress" state with auto-refresh on the website page (no phantom 409 errors); Free users see an upgrade hint instead of a post-click error |
| **Alerts** | Email + Slack/Discord/webhook channels (signed `X-MyKavo-Signature`), grouped per scan, severity prefs, weekly client-ready reports (Mon 08:00 UTC), mute windows |
| **Public** | Status pages `/status/[token]`, SVG uptime badge `/api/badge/[token]` |
| **Teams** | Email invites (Pro = 5 seats), roles OWNER/ADMIN/MEMBER/VIEWER enforced on every mutating route |
| **Auth & security** | Better Auth email+password (+optional Google), **TOTP 2FA** (Google Authenticator: QR enroll at signup + Settings Security card, code challenge at login, trust-device 30d, backup codes), **signup email vetting** (format + disposable blocklist + DNS MX check), strict rate limits, SSRF protection everywhere, **Supabase RLS enabled on all tables** |
| **Billing (LIVE)** | Dodo Payments **live mode**: Free (1 site, 5 pages, weekly) / **Pro $20/mo (8 sites, 15 pages each, daily, 5 seats)**. No add-ons (removed). Auto-activation via verified webhook, renewal date on Billing page, daily renewal-reminder emails, in-app cancel + Dodo portal (`DODO_API_KEY`), **refund.succeeded auto-revokes Pro**. Region display: US sees $, India-timezone sees ₹ (anchor $20 = ₹1,700) with a "billed as $20 USD" note |
| **Growth** | New-signup emails append to a private Google Sheet (Apps Script webhook, `SIGNUP_SHEET_WEBHOOK_URL`) for future email marketing; value quote ("$0.67/day" / "~₹57/day") on landing, /pricing, and Billing |
| **Marketing site (v4)** | Bright-gold design (see Design language): homepage (incl. **alert-channels hub** + **Android app** sections with CSS animations), /pricing, /about (name story + founder bio), /support, /privacy, /terms, /cookies, blog + RSS, 5 free SEO tools under /tools/*, staged-reveal **404 page** ("My-Kaa-vo. Means guardian. This page? Clearly escaped."). Mobile-safe at 375/360px (see gotcha on highlight spans) |
| **SEO / AI search** | Keyword-loaded metadata (website monitoring tools, best website monitoring software, website change detection, ...), OG image (`app/opengraph-image.png`), JSON-LD graph (Organization/WebSite/SoftwareApplication/FAQPage), **/llms.txt** product summary incl. solutions + guides, robots.txt explicitly welcomes AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, ...), sitemap.xml, GA4 `G-DQMWRHWFK8`, GSC verification file. Primary market: US |
| **Keyword landing pages** | 10 unique-content pages (2026-07-19), each with FAQPage JSON-LD + answer-capsule intro for AI Overviews, cross-linked + in footer/homepage/sitemap/llms.txt. Solutions: `/visual-regression-testing`, `/seo-monitoring`, `/website-content-monitoring`, `/website-monitoring-for-{wordpress,shopify,webflow}`. Guides: `/guides/{how-to-monitor-website-changes` (+ HowTo schema)`,website-monitoring-checklist,website-maintenance-checklist,website-deployment-checklist}`. Shared blocks in `components/landing/seo-page.tsx`. Homepage targets the head terms + 9-item FAQ |
| **Blog CMS** | `/dashboard/blog` (Tiptap visual editor, `BLOG_ADMIN_EMAILS` allowlist), public `/blog` + `/blog/feed.xml`. Editor has an **editable Published date** (empty = stamped on first publish; editing it backdates the post and reorders the index; an untouched date preserves the stored time of day), **primary + secondary SEO keyword** fields (emitted as `<meta name="keywords">` + Article JSON-LD `keywords`), and a **Tags card** (chip input, Enter/comma adds, 12 max, case-insensitive dedupe; chips shown on the post + index cards). Public `/blog` has a **search box** (title/excerpt/author/tag) and renders **6 posts at a time** behind a "Read more posts (N more)" button (`components/blog/blog-index-list.tsx`); index tags are click-to-search. Fields live on `blog_post` (`primaryKeyword`, `secondaryKeyword`, `tags`; migration `20260719000000_blog_keywords_tags`) |
| **Android app** | `apps/mobile` - Expo SDK 57 / React Native / expo-router, OUTSIDE the pnpm workspace (own npm lockfile; Metro wants hoisted deps). Same accounts/sessions as the web (Better Auth `expo()` plugin + `mykavo://`/`exp://` trustedOrigins in `apps/web/src/lib/auth.ts`), TOTP 2FA + trust-device in the login screen. Reads via `/api/mobile/*` JSON endpoints (me/overview/changes/scans/websites - contract mirrored in `apps/mobile/src/lib/types.ts`), mutates via the SAME routes as the web dashboard. Live sync = focus refetch + 3-20s polling (`src/lib/live.ts`), matching the web's auto-refresh cadence. Design: `--fx-*` tokens ported 1:1 (light+dark) in `src/lib/theme.ts`, gold v4 login screen, brand icons from the page-spark mark, floating island tab bar (auto-hide on scroll) + swipe between tabs + double-back exit toast. **v1.0.1 reliability hardening**: safe SecureStore adapter, root ErrorBoundary + crash-guard safe mode (records errors, shows them next launch), 401 session recovery, workspace cookie replay, no session-cache boot hydration (fixed relaunch-after-login crash), clean activity finish instead of exitApp, allowBackup off, stable CI signing key, 32-test vitest suite. APK: `.github/workflows/android-apk.yml` builds on every push to main touching apps/mobile and publishes the rolling `mobile-latest` release to the PUBLIC download repo **`dakshu007/Mykavo-app-download`** (this repo is private; cross-repo publish uses the `RELEASE_TOKEN` Actions secret). Public download URL used on the site: `https://github.com/dakshu007/Mykavo-app-download/releases/latest/download/mykavo.apk` (debug-keystore signed - fine for sideload, replace keystore before Play Store) |

**Tests: 607 web · 99 shared · 51 comparison · 32 severity · 19 email · 4 scanner · 43 DB integration · 32 mobile.** Run per package: `pnpm --filter web test`, etc. (mobile: `cd apps/mobile && npm test`).

---

## 🚀 Production architecture (zero-budget)

- **Domain**: `mykavo.app` - DNS on **Cloudflare** (daksheshbabu@gmail.com). Apex + `www` are **DNS-only (grey-cloud) CNAMEs → `mykavo.netlify.app`** - never enable the orange proxy (it breaks Netlify TLS renewal). `support@mykavo.app` forwards via Cloudflare Email Routing.
- **Web**: Netlify site **`mykavo`** (id `3c4a3c88-f933-4430-9455-e2d693941f67`), Next.js 16 serverless, US-East. CLI authed as daksheshbabu@gmail.com.
- **Database**: **Supabase** project `mdjpcdwqwyufjbzguzfr` (us-east-1 - MUST be in the functions' region, not near the user). Direct host is IPv6-only → always the pooler `aws-0-us-east-1.pooler.supabase.com`, user `postgres.mdjpcdwqwyufjbzguzfr`. Web = **transaction pooler :6543** (`?pgbouncer=true&connection_limit=1`); worker + migrations = **session pooler :5432** (~15 session slots - one-off scripts should append `?connection_limit=1`). **RLS is ENABLED on all public tables** (safe: Prisma connects as the table owner; it closes the PostgREST anon-API surface). Re-run `apps/worker/src/scripts/enable-rls.ts` after any migration that creates tables.
- **Worker**: launchd agent **`com.fluxen.worker-prod`** on the owner's Mac, code copy at **`~/.fluxen/app`** (launchd cannot execute from ~/Desktop - macOS TCC). Env: `~/.fluxen/app/apps/worker/.env.production`. Logs: `~/.fluxen/logs/worker-prod.log`. Restart: `launchctl kickstart -k gui/501/com.fluxen.worker-prod`. Crons (UTC): scheduler + health */5, retention 03:00 daily, reports Mon 08:00, audits Tue 06:00, **billing renewal reminders 09:00 daily**. Worker only runs while the Mac is awake; queued jobs survive 14 days.
- **Artifacts**: **Cloudflare R2**, bucket **`mykavo`** (us-east/ENAM hint), S3 API via aws4fetch (`packages/scanner/src/storage.ts`, `ARTIFACT_STORE=r2`). Screenshots (worker-compressed to ≤200KB), visual diffs, blog images, and **avatars** all live there - Postgres stores only keys/paths. The bucket stays PRIVATE; all reads go through authorized app routes. Legacy Netlify Blobs store `fluxen-artifacts` still holds a pre-migration copy (safe to ignore/delete later).
- **Payments**: **Dodo Payments LIVE** - Pro product `pdt_0NjKwQ1pTRkSQhk6cmVzo` ($20/mo), `DODO_MODE=live`, live webhook registered at `https://mykavo.app/api/webhooks/dodo`, `DODO_API_KEY` set (in-app cancel + billing portal). Dodo product rule: **subscription pricing ONLY - no License Key entitlements, no credits** (a license-key entitlement once caused instant post-purchase downgrades; the webhook now ignores those event families, but keep products clean).
- **Email**: Resend (key in worker env). ⚠️ Domain still UNVERIFIED in Resend → outbound mail only reaches the account owner. Fix: verify mykavo.app in Resend (add its DNS records in Cloudflare), set `EMAIL_FROM=alerts@mykavo.app`.
- **Analytics**: GA4 `G-DQMWRHWFK8` (production only, root layout), Search Console verified (`/googled23738155d4d0020.html`).

## Deploy runbooks

**Web** (from a clean copy OUTSIDE any parent git repo - Next file-tracing bundles a stale parent Prisma client otherwise):
```bash
export PATH="$HOME/.hermes/node/bin:$PATH"   # pnpm/node/netlify live here on the owner's Mac
rm -rf /tmp/mykavo-deploy
rsync -a --exclude node_modules --exclude .next --exclude .git --exclude '.env*' \
  --exclude .data --exclude .netlify --exclude .claude ./ /tmp/mykavo-deploy/
mkdir -p /tmp/mykavo-deploy/.netlify
echo '{ "siteId": "3c4a3c88-f933-4430-9455-e2d693941f67" }' > /tmp/mykavo-deploy/.netlify/state.json
cd /tmp/mykavo-deploy && pnpm install && netlify deploy --build --prod --filter web
```
`--filter web` is REQUIRED; `netlify.toml` must NOT set base/publish. Confirm `netlify status` says project `mykavo` first.

**Migrations** (BEFORE the web deploy when schema changed): `cd packages/database && DATABASE_URL=<session-pooler-url> pnpm exec prisma migrate deploy` - then re-run `enable-rls.ts` if tables were created.

**Worker** (whenever worker or packages code changed): rsync the same excludes to `~/.fluxen/app`, `pnpm install`, `pnpm exec prisma generate` in packages/database, then `launchctl kickstart -k gui/501/com.fluxen.worker-prod` and tail the log.

**Netlify env changes**: the CLI's `env:set/get/list` can PROMPT INTERACTIVELY and silently no-op in scripts - use the REST API (`api.netlify.com/api/v1/accounts/dakshu007/env?site_id=...`; secret vars need per-context values - "all" is rejected; non-secret vars need all four scopes on the free plan). **Env changes only reach functions after a redeploy.**

## Environment variables (names only - values live in Netlify env / the worker env file)

**Web (Netlify)**: `DATABASE_URL` (transaction pooler), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` + `APP_URL` (both `https://mykavo.app`), `ARTIFACT_STORE=r2`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=mykavo`, `DODO_PRODUCT_ID`, `DODO_MODE=live`, `DODO_WEBHOOK_SECRET` (live-mode whsec), `DODO_API_KEY`, `SIGNUP_SHEET_WEBHOOK_URL` (Apps Script /exec), `BLOG_ADMIN_EMAILS`, legacy `NETLIFY_BLOBS_SITE_ID`/`NETLIFY_BLOBS_TOKEN`, optional `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (OAuth - not configured yet).

**Worker (`~/.fluxen/app/apps/worker/.env.production`)**: `DATABASE_URL` (session pooler), `APP_URL`, `ARTIFACT_STORE=r2` + the four `R2_*` vars, `RESEND_API_KEY`, `EMAIL_FROM`, optional cron overrides (`SCHEDULER_CRON`, `HEALTH_CRON`, `RETENTION_CRON`, `REPORT_CRON`, `AUDIT_CRON`, `BILLING_CRON`, `RENEWAL_REMINDER_DAYS`).

See `apps/web/.env.example` and `apps/worker/.env.example` for the annotated list.

## Billing internals (do not regress)

- Checkout: `/api/billing/checkout` creates a server-issued `CheckoutIntent` token → Dodo hosted checkout with `metadata_checkoutToken`. **Attribution NEVER trusts client-editable metadata**: stored subscription-id binding first, else consume the token.
- Webhook `/api/webhooks/dodo`: Standard-Webhooks signature verification → `classifyDodoEvent` (`apps/web/src/lib/billing/webhook.ts`, unit-tested): only `subscription.*`/`payment.*` families may touch entitlements; `payment.succeeded` grants regardless of its payment-status field; `refund.succeeded` revokes; ignored/noop events return BEFORE attribution so they can never burn the checkout token. Dedupe + entitlement mutation run in one transaction; `lastEventAt` guards stale/out-of-order events.
- Renewals: `Subscription.currentPeriodEnd` shows on the Billing page; the worker `billing-sweep` emails one reminder per period (dedupe via `renewalReminderSentAt`).
- Region display: `components/region.tsx` - `<Price usd={20}/>` renders $ by default, ₹ for India browser timezones (fixed anchor 85:1 so $20 = ₹1,700), plus `BilledInUsdNote` at purchase points. The actual charge is always USD.

## Running it locally

```bash
export PATH="$HOME/.hermes/node/bin:$PATH"   # owner's Mac; otherwise any Node 20+ with pnpm 10
pnpm install
pnpm dev        # web → http://localhost:3000 (Claude sessions: launch.json "web" → 3010, autoPort
                #   assigns another port if 3010 is busy - then update BETTER_AUTH_URL/APP_URL in
                #   the worktree's apps/web/.env.local to that port or login fails "Invalid origin")
pnpm worker     # scan worker, 2nd terminal (apps/worker/.env → local postgres fluxen_dev)
pnpm test       # per package: pnpm --filter web test, etc.
pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web build
```
Local migrations: `cd packages/database && pnpm exec prisma migrate deploy` (24 migrations). Note: `migrate dev` may demand a destructive reset due to drift - the repo's established pattern is to hand-write migration SQL and apply with `migrate deploy`. Local test login: `alex@example.com` / `correct-horse-battery` (Pro, has data; add `BLOG_ADMIN_EMAILS="alex@example.com"` to `apps/web/.env.local` to use the blog editor locally).

## Repository layout (pnpm workspace + turborepo)

```
apps/web        Next.js 16 App Router - marketing site, dashboard, blog, tools, all API routes
                (incl. /api/mobile/* read endpoints for the Android app)
apps/mobile     Expo (React Native) Android/iOS app - NOT in the pnpm workspace, npm-managed;
                see apps/mobile/README.md for run + APK build instructions
apps/worker     pg-boss consumer: scans, comparison, link checks, health, reports, audits,
                retention, notifications, billing reminders (+ scripts/: enable-rls,
                migrate-artifacts-r2, migrate-avatars-r2, rerun-compare)
packages/       (@mykavo/* scope)
  database          Prisma schema/client + DB helpers (+ live-DB integration tests)
  scanner           Playwright pool, page scan, stabilization, lighthouse, artifact storage
                    (LocalDisk / R2 / legacy NetlifyBlobs; screenshots compressed to <=200KB)
  comparison-engine deterministic diff + pixelmatch visual diff + site-meta + broken links
  severity-engine   the ONLY place severity rules live
  email             console/Resend sender + all templates (incl. renewal reminder)
  shared            url/ssrf/link-check/queues/schedule/retention/channels/stabilization/
                    health/report/performance/script-services
docs/           ARCHITECTURE, IMPLEMENTATION_PLAN, DATABASE_SCHEMA, SECURITY_MODEL, DESIGN_SYSTEM
CLAUDE.md       the original product spec - still the product constitution
```

## Design language (two systems - keep them separate)

- **Fonts site-wide**: body `"Google Sans"` → DM Sans fallback (`--font-sans`); every h1/h2 renders Poppins (globals.css base rule); Geist Mono for mono.
- **Dashboard (app)**: all colors flow through `--fx-*` CSS variables in `apps/web/src/app/globals.css` (light + dark palettes; `lib/theme-contrast.test.ts` enforces WCAG AA on every pairing). Never hardcode Tailwind palette classes like `text-red-600`. Charts are hand-rolled SVG (`components/charts/`) - no chart libraries.
- **Marketing site (v4 "bright gold")**: FIXED palette in `components/landing/style.ts` (deliberately NOT `--fx-*` tokens): warm paper `#FBFAF3` canvas, alt band `#F3F1E6`, ink `#151515`, **gold `#FFD400` (always ink text on gold)**, dim `#6B6B60`. Signature moves: crisp ink offset shadows (`shadow-[4px_4px_0_#151515]`, gold+ink doubles), mono `// eyebrow //` labels, gold highlighter sweeps behind headline words, floating island pill nav, browser-frame dashboard mock, tilted gold marquee, giant clipped gold footer wordmark. Standalone pages (legal/support/about) use `components/landing/page-shell.tsx`. Blog article bodies stay on `--fx-*` token cards so markdown reads in both app themes.
- **No em-dashes anywhere. Hyphens only.**

## ⚠️ Gotchas (each one cost real debugging time)

- **pnpm/node are NOT on PATH** on the owner's Mac: `export PATH="$HOME/.hermes/node/bin:$PATH"` first. Local dev DB: `postgresql://dakshu@localhost:5432/fluxen_dev`.
- **Legacy "fluxen" identifiers are INTENTIONAL - do not rename**: blob store `fluxen-artifacts`, local DB `fluxen_dev`, launchd `com.fluxen.worker-prod` + `~/.fluxen/*`, repo folder `~/Desktop/Fluxen`. Everything user-facing is MyKavo (`@mykavo/*` packages, `mykavo.alert` webhook event, `X-MyKavo-Signature`, `mykavo-*` storage keys/cookies).
- **After Prisma schema changes**: restart the dev server AND `rm -rf apps/web/.next` (stale client throws; stale CSS empties theme tokens). Also clear `.next` after deleting routes (stale `.next/types` break typecheck).
- **Only ONE worker per database** (pg-boss). Kill prod via launchctl; `pkill` does not match it.
- **Client components must NOT import the `@mykavo/shared` barrel** - it re-exports `ssrf.ts` (`node:dns`) and breaks client chunks. Use subpaths: `@mykavo/shared/stabilization`, `/channels`, `/url`, `/script-services`.
- **Netlify CLI targets whatever `.netlify/state.json` says** - ALWAYS confirm `netlify status` shows `mykavo` first; a stale link once pointed at an unrelated site. `env:get/list` need `--context production`.
- **Netlify env via CLI is unreliable non-interactively** (prompts + silently no-ops) - use the REST API; and env changes only reach functions after a redeploy.
- Netlify deploys can transiently fail at "Uploading blobs ... 403 internal error" - retry unchanged before debugging.
- **Supabase session pooler has ~15 slots** - one-off scripts alongside the worker can hit EMAXCONNSESSION; append `?connection_limit=1` to script DATABASE_URLs.
- **Dodo**: keep products entitlement-free (no license keys/credits); test products only resolve on `test.checkout.dodopayments.com` (checkout host derives from `DODO_MODE`); each mode needs its own webhook + `DODO_WEBHOOK_SECRET`.
- Google Apps Script webhooks 401 unless deployed "Execute as: Me" + access "**Anyone**" (not "Anyone with Google account"); curl `-X POST -L` fakes a 405 on the 302 echo redirect - node fetch works correctly.
- Interrupting `prisma migrate deploy` mid-run leaves a "failed" record - if the DDL applied, fix with `prisma migrate resolve --applied <name>`.
- **Agent-tool worktrees branch from `main`** - fast-forward main before launching implementation agents.
- pg-boss v12: named import `{ PgBoss }`; never memoize a REJECTED boss-connection promise (`apps/web/src/lib/queue.ts` clears it on failure); scanner `page.evaluate` needs the `__name` shim (see scan-page.ts).
- **Landing gold-highlight spans must NOT use `whitespace-nowrap`**: they are `inline-block`, which already refuses to wrap mid-phrase whenever the text fits - nowrap only ever forced horizontal overflow on mobile (28px at 375px via the pricing value quote; fixed by removing it in value-quote/alert-channels/app-download). When a highlighted phrase wraps on a narrow screen, the gold block behind two lines is the intended graceful fallback.
- **Browser-pane verification quirks**: programmatic `scrollIntoView` can yield blank/stale screenshots; on DASHBOARD pages the JS-exec context can detach into a phantom unhydrated DOM (viewport 0x0, synthetic events never reach React, clicks silently no-op). Verify dashboard flows with trusted `computer` clicks/typing on screenshot coordinates, or curl the API with a session cookie (`/api/auth/sign-in/email` → cookie jar) - and confirm effects in the DB/server logs, not just the UI.
- Prod owner login: `daksheshbabu@gmail.com` (Pro, the `BLOG_ADMIN_EMAILS` entry). 2FA can be enrolled from Settings → Security.

## Pending / next up

1. **Resend domain verification** (top priority) - until mykavo.app is verified in Resend, alerts/reports/invites only reach the account owner. Add Resend's DNS records in Cloudflare, set `EMAIL_FROM=alerts@mykavo.app`.
2. **More keyword landing pages** - first 10 shipped 2026-07-19 (see Keyword landing pages row). Remaining candidates: monitoring for agencies/freelancers/developers/ecommerce, meta-tag/canonical/robots.txt/sitemap monitoring, website screenshot comparison, deployment monitoring. Each needs genuinely unique content (spec forbids thin programmatic pages). Rankings also need off-page work: backlinks + the owner's blog/link-exchange push; new-domain rankings take months.
3. **Worker off the Mac** (~$5/mo Railway/Render/Fly with the same env) when budget allows.
4. Google OAuth credentials (code ready, env unset).
5. Owner-vetted feature shortlist: post-deploy check hook, domain-expiry (RDAP) alerts, competitor page watching, new-page auto-detection, shareable change links.
6. Minor: landing page still overflows ~15px at 320px viewports only (agency dashboard mock card cannot shrink below its content width; 360px+ is clean). Fix with `min-w-0` + truncation inside the mock rows.
7. Security tidy-up: the `RELEASE_TOKEN` Actions secret (cross-repo APK publish) currently holds the owner's gh CLI OAuth token (repo-wide scope). Replace with a fine-grained PAT scoped to contents:write on `Mykavo-app-download` only. Also note: once the repo is private, Actions minutes are metered (free plan 2000 min/month; the Android build takes ~10-15 min per run, only on pushes touching apps/mobile).

## Working conventions for future sessions

- Verify → deploy → verify on production. Never claim done on a red build.
- Hand-write migration SQL; apply with `migrate deploy` locally + on Supabase; re-run `enable-rls.ts` after new tables.
- Fast-forward `main` after verifying, deploy from it, and **push to GitHub** (`git push origin main`) so the repo always mirrors production.
- **Update this README whenever architecture, pricing, or runbooks change - it is the project's portable memory across machines and AI accounts.**

---

Built by **Dakshesh B** ([github.com/dakshu007](https://github.com/dakshu007)) with Claude Code.
