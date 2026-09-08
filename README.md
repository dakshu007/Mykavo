# MyKavo

> Know what changed. Fix what matters.

MyKavo is a **website change detection & regression monitoring SaaS** for agencies, developers, SEO teams, and website owners. It baselines your pages, re-scans on a schedule, detects meaningful visual / SEO / content / link / script / performance / availability changes, scores them by severity, and alerts you before customers notice.

**LIVE IN PRODUCTION: https://mykavo.app** - with live billing and real customers.

---

## 🧭 New session? Fresh AI assistant? Start here

This README is the **complete, self-contained handoff** for the project. It assumes NOTHING carried over - no prior chat history, no Claude memory files, possibly a different Claude/AI account. Everything needed to understand, run, and continue the project is in this repo. **Last synced: 2026-09-08.**

The 2026-08-01→03 work - worker self-healing (watchdog + stuck-scan/audit recovery), white-label client reports + scheduled delivery, post-deploy checks, **Site Audit** (own crawler + ~81 checks), **Google Search Console integration with Priority Opportunities**, the **MyKavo Analyser** (E-E-A-T), a Chrome extension, three landing sections, and the new app icon - is now **on `main` and deployed**.

✅ **`main` == production, and CI keeps it that way.** Pushing to `main` deploys (`.github/workflows/deploy-web.yml`). No more manual `netlify deploy` from a laptop.

<details>
<summary>How that guarantee was won (2026-09-08) - read this before you ever deploy by hand</summary>

Netlify was never connected to this repo, so every deploy was a manual CLI upload with `commit_ref: null`. Production silently drifted **five weeks ahead of `main`**: those 22 commits were live on mykavo.app while their only copy sat on an unpushed local branch (`claude/dashboard-baseline-scan-stuck-2971c0`). Nothing in git described what was running. On 2026-08-15 a deploy made with another AI tool shipped the wrong build and had to be rolled back by hand to the 2026-08-03 deploy - with no commit to trace either one to.

Recovery: the branch was found, verified green (lint, typecheck, 852 tests, production build), and `main` was fast-forwarded to it. CI now owns deploys.

The lesson, which is why the manual runbook is buried in a collapsed block below: **a deploy that carries no commit ref is a deploy nobody can reason about later.** If it is not on `main`, it must not be in production.
</details>

1. **Read this README top to bottom** - current state, architecture, runbooks, gotchas.
2. **Read `CLAUDE.md`** - the original product spec (vision, principles, phases). All phases 0-11 are COMPLETE; the spec still governs product philosophy (deterministic detection, low false positives, cost control, no fake social proof).
3. **Skim `docs/`** - ARCHITECTURE, DATABASE_SCHEMA, SECURITY_MODEL, DESIGN_SYSTEM.
4. Git: **`main` is the branch of record and always equals what is deployed** - enforced by CI, not by discipline. Remote: `git@github.com:dakshu007/Mykavo.git` - a **PRIVATE** repo. The only public repo is **`dakshu007/Mykavo-app-download`** (Android APK releases + download page; the site's download button points at its `releases/latest`). Work on a branch, verify, fast-forward `main`, then **push - the push is the deploy**. Never leave finished work on an unpushed branch: that is exactly how five weeks of shipped features ended up with no copy in git.
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
| **Brand** | MyKavo + the **page-spark logomark** (gold page panel + five-ray spark, `apps/web/src/components/brand/logo.tsx`, single-currentColor SVG; app icons: **`app/icon.png` (512) is the SINGLE favicon source + `apple-icon.png` (180); `icon.svg` was DELETED 2026-08-03** because browsers and Google's favicon crawler preferred the stale vector over the PNG - do not reintroduce an SVG icon. Master logo lives in the public repo at `Mykavo-app-download/MyKavo.png` (4006px, black tile + gold page-spark); regenerate icons from it with `sips -z <size> <size>`). Name story: "My" = Tamil "En" (mine), "Kavo" from Tamil "Kāval" (காவல்) = protection/guarding - "your digital guardian" (told on /about) |
| **Core monitoring** | Add website → SSRF-guarded validation → robots/sitemap/link discovery → page selection → Playwright baseline scan → scheduled re-scans → deterministic comparison (HTTP/SEO/DOM/text/links/scripts/perf/visual/elements) → severity-scored ChangeEvents |
| **Site health** | Uptime probe every 5 min + SSL expiry tracking, DOWN/SSL incidents, uptime/response-time analytics (7/30/90d), incident history |
| **Lighthouse** | On-demand per any page + weekly scheduled audits (Tue 06:00 UTC) + trend sparkline + performance-drop alerts |
| **SEO report** | `/dashboard/websites/[id]/seo` - scored checks incl. broken internal links |
| **Broken links** | Per-scan internal-link probing (SSRF-guarded, only definite failures flag), grouped into ONE site-wide event |
| **Changes UX** | Filters, bulk actions, notes, CSV export, before/after slider + pixel-diff, approve/ignore/resolve, baseline updates |
| **Scan UX** | Live "scan in progress" state with auto-refresh on the website page (no phantom 409 errors); Free users see an upgrade hint instead of a post-click error |
| **Alerts** | Email + Slack/Discord/webhook channels (signed `X-MyKavo-Signature`), grouped per scan, severity prefs, weekly client-ready reports (Mon 08:00 UTC), mute windows |
| **Site Audit** | Ahrefs-style technical SEO crawl (2026-08-02): `packages/seo-audit` fetch-only crawler (robots.txt + sitemap seeding + BFS, SSRF-validated, 5-concurrent, 10-min cap) + **~81-check** registry with per-check explain/fix tooltip copy; results as capped JSONB on `site_audit` (10 kept per website); worker queue `site-audit` (one at a time, 15-min expiry); dashboard `/dashboard/site-audit` (health gauge = % URLs without error-level issues, issue browser grouped by category with severity chips + affected-URL samples); limits in plans.ts: Free 150 pages/crawl + 1 audit/day, Pro 1,500 pages + 10/day; per-issue drill-down pages + CSV export (`/api/site-audits/[id]/export`); 2026-08-03 additions: broken-image probing, redirect chain/loop walking, canonical→redirect/broken, meta-refresh, internal-nofollow checks |
| **Search Console** | Google Search Console integration (2026-08-03, env-gated on `GOOGLE_CLIENT_ID/SECRET` + `GSC_TOKEN_KEY`): per-website OAuth connect (readonly scope, AES-256-GCM-encrypted tokens in `gsc_connection`, HMAC state CSRF guard), property picker, daily worker sync 07:00 UTC (`gsc-sync` queues; 90d daily series + top 100 rows per dimension for current/previous 28d windows into `gsc_daily`/`gsc_dimension_row`) + manual sync + WoW click-drop alert email; dashboard `/dashboard/search-console/[websiteId]`: stat cards, SVG clicks/impressions chart (7/28/90d), **Priority Opportunities** (pure `buildOpportunities` in @mykavo/shared correlates GSC pages with latest Site Audit issues - noindex-with-impressions, high-traffic errors, click/position drops, missing descriptions, low-CTR-at-rank), top queries/pages tables with deltas + audit-issue counts, countries/devices/search-appearance, live sitemaps panel + resubmit, URL Inspection API box, CSV exports; disconnect deletes tokens + all rows. ALL creds are SET (Netlify + worker env): `GSC_TOKEN_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (client id `808920008938-nq72mrv3iv77fn2jd50uos5umggb1snv...`, created 2026-08-03; redirect URI `https://mykavo.app/api/gsc/callback`, scope webmasters.readonly, "Google Search Console API" enabled). Google APIs used here are FREE with no billing account - quotas only. See Pending item 3 for the second redirect URI still needed by Google sign-in. Not exposed by Google's API (documented in-UI): index-coverage totals, mobile usability, CWV buckets |
| **Chrome extension** | `apps/extension/` - MV3 "MyKavo SEO Checker" (plain JS, no build): activeTab+scripting only, 20 local on-page checks with score ring + fix hints, zero data collection, CTAs to mykavo.app; store-ready zip via the command in `apps/extension/STORE_LISTING.md` (publishing copy + privacy answers included), NOT yet published |
| **MyKavo Analyser (E-E-A-T)** | (2026-08-03) Deterministic Quality-Rater-Guidelines engine `apps/web/src/lib/tools/eeat.ts` (20 weighted signals across Experience/Expertise/Authoritativeness/Trust, **Trust weighted x2** per the QRG; 9 tests incl. a strong page = exactly 100 and a determinism assertion): bylines/credentials/reviewed-by, visible+schema dates, Organization/Person schema + sameAs, about/contact(support counts)/privacy/terms (link-scan first, SSRF-guarded path probes only for what is unlinked), HTTPS/mixed content/citations/copyright/content depth. Three surfaces, one engine: free tool `/tools/eeat-analyzer` (public, rate-limited `/api/tools/eeat`, in footer+sitemap+homepage grid), dashboard section **`/dashboard/analyser`** ("MyKavo Analyser" nav item - analyse ANY url + per-website shortcuts), and per-website `/dashboard/websites/[id]/eeat`. No DB, no worker, no external API - on-demand only. NOTE: the public tool keeps the "E-E-A-T Analyzer" name for search demand; everything inside the dashboard is branded "MyKavo Analyser" |
| **Public** | Status pages `/status/[token]`, SVG uptime badge `/api/badge/[token]`, **white-label client reports `/r/[token]`** (2026-08-01: own revocable `reportToken` per website - enable/regenerate on the website page; 30-day uptime/changes/SSL/Lighthouse, Save-as-PDF; Pro workspaces brand them via Settings → Agency branding = `brandName/brandLogoUrl/brandColor` on Workspace, logo in R2 at `brand-logos/`, served by `/api/brand-logos/[name]`; Free reports show MyKavo branding + CTA), **post-deploy checks `POST /api/hooks/deploy/[token]`** (2026-08-02, Pro: secret rotatable `deployToken` per website; CI/deploy-notification/WP hits it after a release → immediate scan with `ScanTriggerType.DEPLOY` + optional `{note:"v1.2.3"}` on `Scan.note` → comparison → ALWAYS a verdict via email+channels, "✅ Deploy verified" when clean (`deployVerdictEmail`), exempt from maintenance-window mute; shares manual-scan quota/concurrency + advisory-lock dup guard), **scheduled client report delivery** (2026-08-02, Pro: `reportCadence` WEEKLY/MONTHLY + `reportRecipients` (≤5) on Website, daily `client-report-sweep` cron 08:30 UTC emails the branded report to clients via `clientReportDeliveryEmail`; dedupe via `clientReportLastSentAt` guarded claim; pure due-logic `isClientReportDue` in @mykavo/shared) |
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
- **Worker**: launchd agent **`com.fluxen.worker-prod`** on the owner's Mac, code copy at **`~/.fluxen/app`** (launchd cannot execute from ~/Desktop - macOS TCC). Env: `~/.fluxen/app/apps/worker/.env.production`. Logs: `~/.fluxen/logs/worker-prod.log`. Restart: `launchctl kickstart -k gui/501/com.fluxen.worker-prod`. Crons (UTC): scheduler + health */5, retention 03:00 daily, reports Mon 08:00, audits Tue 06:00, **billing renewal reminders 09:00 daily**. Worker only runs while the Mac is awake; queued jobs survive 14 days. **Self-healing** (added 2026-08-01 after a 19-hour silent stall): a watchdog (`apps/worker/src/watchdog.ts`) probes the DB through pg-boss's own pool every 30s and exits after ~3 min of consecutive failures so launchd (KeepAlive, 30s throttle) restarts the process - pg-boss's pool wedges permanently after network drops (Mac sleep/wake) and never recovers on its own. The scheduler sweep also runs `failStuckScans` (`packages/database/src/stuck-scans.ts`): scans stuck QUEUED/RUNNING >60 min with no live queue job become FAILED (`STUCK_QUEUED`/`STUCK_RUNNING`) and BASELINING websites flip to ERROR, so the dashboard/API/scheduler never deadlock on a lost job.
- **Artifacts**: **Cloudflare R2**, bucket **`mykavo`** (us-east/ENAM hint), S3 API via aws4fetch (`packages/scanner/src/storage.ts`, `ARTIFACT_STORE=r2`). Screenshots (worker-compressed to ≤200KB), visual diffs, blog images, and **avatars** all live there - Postgres stores only keys/paths. The bucket stays PRIVATE; all reads go through authorized app routes. Legacy Netlify Blobs store `fluxen-artifacts` still holds a pre-migration copy (safe to ignore/delete later).
- **Payments**: **Dodo Payments LIVE** - Pro product `pdt_0NjKwQ1pTRkSQhk6cmVzo` ($20/mo), `DODO_MODE=live`, live webhook registered at `https://mykavo.app/api/webhooks/dodo`, `DODO_API_KEY` set (in-app cancel + billing portal). Dodo product rule: **subscription pricing ONLY - no License Key entitlements, no credits** (a license-key entitlement once caused instant post-purchase downgrades; the webhook now ignores those event families, but keep products clean).
- **Email**: Resend (key in worker env). ⚠️ Domain UNVERIFIED → outbound mail only reaches the account owner. Progress 2026-08-02: **mykavo.app registered in Resend via API** (domain id `b94edd21-997a-46c4-9745-70f7238b4821`); remaining: add the 3 DNS records (DKIM TXT `resend._domainkey`, MX `send` → `feedback-smtp.us-east-1.amazonses.com` prio 10, TXT `send` → `v=spf1 include:amazonses.com ~all`) in Cloudflare (DNS-only), trigger verify (`POST https://api.resend.com/domains/<id>/verify`), then set `EMAIL_FROM="MyKavo <alerts@mykavo.app>"` in worker `.env.production` + restart worker. Client-report delivery + all customer alerts start actually delivering at that moment.
- **Analytics**: GA4 `G-DQMWRHWFK8` (production only, root layout), Search Console verified (`/googled23738155d4d0020.html`).

## Deploy runbooks

**Web - push to `main`. That is the whole runbook.**

`.github/workflows/deploy-web.yml` runs `pnpm install` → `prisma generate` → lint →
typecheck → the full unit suite → `netlify deploy --build --prod --filter web` on every
push to `main` that touches `apps/web/**`, `packages/**`, `netlify.toml`, or the lockfile.
Watch it in the Actions tab. Needs two repository secrets: `NETLIFY_AUTH_TOKEN` and
`NETLIFY_SITE_ID` (`3c4a3c88-f933-4430-9455-e2d693941f67`). Build-time env still comes from
the Netlify project, so no secrets live in this repo. To re-publish a ref by hand, run the
workflow from the Actions tab and type `deploy` to confirm.

> **Do NOT deploy from a laptop.** Manual `netlify deploy` uploads carry no commit ref, and
> that is exactly how production silently drifted five weeks ahead of `main` (2026-08-03 →
> 2026-09-08): Site Audit, Search Console, MyKavo Analyser and client reports were live with
> their source stranded on an unpushed branch, and a bad deploy from another tool had to be
> rolled back with nothing to trace it to. If it is not on `main`, it must not be in
> production. The old manual path is kept below only for a genuine CI outage.

<details>
<summary>Emergency manual deploy (CI down only)</summary>

From a clean copy OUTSIDE any parent git repo - Next file-tracing bundles a stale parent
Prisma client otherwise:
```bash
export PATH="$HOME/.hermes/node/bin:$PATH"   # pnpm/node/netlify live here on the owner's Mac
rm -rf /tmp/mykavo-deploy
rsync -a --exclude node_modules --exclude .next --exclude .git --exclude '.env*' \
  --exclude .data --exclude .netlify --exclude .claude ./ /tmp/mykavo-deploy/
mkdir -p /tmp/mykavo-deploy/.netlify
echo '{ "siteId": "3c4a3c88-f933-4430-9455-e2d693941f67" }' > /tmp/mykavo-deploy/.netlify/state.json
cd /tmp/mykavo-deploy && pnpm install && netlify deploy --build --prod --filter web
```
`--filter web` is REQUIRED; `netlify.toml` must NOT set base/publish. Confirm `netlify status`
says project `mykavo` first. Afterwards, push the exact commit you deployed to `main` so git
and production match again.
</details>

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
- **NEVER use `<meta http-equiv="refresh">` for auto-refreshing pages.** Chrome fires a scheduled meta refresh even AFTER client-side navigation, so any in-progress page yanks the user back to it from anywhere in the dashboard (this shipped and had to be hot-fixed on Site Audit). Use the `AutoRefresh` component (`app/dashboard/scans/[id]/auto-refresh.tsx`, `router.refresh()` on an interval) instead.
- **Anything that can be QUEUED must have a stuck-state escape.** The scheduler sweep now fails scans stuck >60 min (`failStuckScans`) and site audits stuck >45 min; the UI treats over-age QUEUED/RUNNING rows as timed out so the run button returns. Copy this pattern for any new queue - otherwise one dead job pins the UI in "in progress" forever, 409s the API, and makes the scheduler skip the website.
- **Netlify MASKS secret env values during builds.** A strict zod rule on a secret (e.g. `.length(64)` on `GSC_TOKEN_KEY`) turns the mask into "Invalid server environment" and fails page-data collection - a green local build then a red deploy. Keep secrets `z.string().optional()` in `env.ts` and validate the real shape at point of use.
- **Prisma `migrate dev --create-only` writes to `<cwd>/prisma/migrations`** - running it from `packages/database` created `packages/database/packages/database/...`. Hand-write the migration SQL in the right folder and apply with `migrate deploy` (the established pattern anyway).
- **Site Audit counting semantics**: issue counts are DISTINCT affected URLs, not instances. The first real crawl reported 60k "errors" because one broken link in a global nav multiplied by every page. `aggregateIssues` dedupes by (checkId, url); also caps total fetches (not just parsed pages) and flags `stoppedReason: "blocked"` when >=30% of responses are 403/429 so bot-protected sites do not look catastrophically broken.
- **Landing gold-highlight spans must NOT use `whitespace-nowrap`**: they are `inline-block`, which already refuses to wrap mid-phrase whenever the text fits - nowrap only ever forced horizontal overflow on mobile (28px at 375px via the pricing value quote; fixed by removing it in value-quote/alert-channels/app-download). When a highlighted phrase wraps on a narrow screen, the gold block behind two lines is the intended graceful fallback.
- **Browser-pane verification quirks**: programmatic `scrollIntoView` can yield blank/stale screenshots; on DASHBOARD pages the JS-exec context can detach into a phantom unhydrated DOM (viewport 0x0, synthetic events never reach React, clicks silently no-op). Verify dashboard flows with trusted `computer` clicks/typing on screenshot coordinates, or curl the API with a session cookie (`/api/auth/sign-in/email` → cookie jar) - and confirm effects in the DB/server logs, not just the UI.
- Prod owner login: `daksheshbabu@gmail.com` (Pro, the `BLOG_ADMIN_EMAILS` entry). 2FA can be enrolled from Settings → Security.

## Pending / next up

1. ~~Merge `claude/dashboard-baseline-scan-stuck-2971c0` into `main`~~ **DONE 2026-09-08** - `main` fast-forwarded to it, CI deploys now own production. Follow-ups from that work: **rotate `NETLIFY_AUTH_TOKEN`** (the one in use was pasted into a chat transcript - reissue in Netlify → User settings → Applications and update the repo secret), and bump the deploy workflow's actions (`checkout@v4`, `setup-node@v4`, `pnpm/action-setup@v4`) once GitHub finishes deprecating the Node 20 action runtime.
2. **Resend domain verification** - until mykavo.app is verified, alerts/reports/invites only reach the account owner. Domain is already **registered in Resend** (id `b94edd21-997a-46c4-9745-70f7238b4821`); remaining: add the 3 DNS records in Cloudflare (DNS-only) - DKIM TXT `resend._domainkey`, MX `send` → `feedback-smtp.us-east-1.amazonses.com` prio 10, TXT `send` → `v=spf1 include:amazonses.com ~all` - then `POST https://api.resend.com/domains/<id>/verify` and set `EMAIL_FROM="MyKavo <alerts@mykavo.app>"` in the worker env + restart.
3. **Google OAuth client needs a second redirect URI**: setting `GOOGLE_CLIENT_ID/SECRET` (done 2026-08-03, both Netlify + worker env) also switched ON "Continue with Google" sign-in, which uses `https://mykavo.app/api/auth/callback/google`. Add that URI alongside the GSC one (`/api/gsc/callback`) in Google Cloud Console or Google sign-in throws redirect_uri_mismatch. Also: while the consent screen is in "Testing", only listed test users can connect GSC.
4. **The Mac sleeps at 1 minute** (`pmset -g` shows `sleep 1`, only prevented while an app holds a lock). This has taken production down three times (stuck baseline scan, wedged worker pool, dead site audit). Set sleep to Never while this Mac hosts the prod worker: System Settings → Energy, or `sudo pmset -a sleep 0`. The watchdog now recovers wedges automatically, but nothing runs while the machine is asleep.
5. **Chrome extension is built but NOT published** - `apps/extension/dist/mykavo-seo-checker.zip` is store-ready; listing copy + privacy answers are in `apps/extension/STORE_LISTING.md`. Needs the $5 developer fee + screenshots.
6. **Android APK download is paused** ("coming soon" CTA on the landing page, 2026-08-01). CI keeps publishing releases; re-enabling is a one-line revert of the CTA in `components/landing/app-download.tsx` (APK_URL is still there with a note).
7. **Google SERP favicon**: the new icon is live and byte-verified on production; Google refreshes favicons on its own schedule (days to ~2 weeks). Speed it up with URL Inspection → Request indexing on `https://mykavo.app/` in Google Search Console.
8. **Site Audit deferred checks** (need per-page browser rendering, which would break the zero-cost model at 1,500 pages/crawl): per-page Core Web Vitals, JS-rendered content, colour contrast, image byte-weight, schema property-level validation. Candidate for a future "deep audit" premium tier.
9. **More keyword landing pages** - first 10 shipped 2026-07-19. Remaining candidates: monitoring for agencies/freelancers/developers/ecommerce, meta-tag/canonical/robots.txt/sitemap monitoring, website screenshot comparison, deployment monitoring. Each needs genuinely unique content (spec forbids thin programmatic pages). Rankings also need off-page work; new-domain rankings take months.
10. **Worker off the Mac** (~$5/mo Railway/Render/Fly with the same env) when budget allows - this permanently fixes item 4.
11. Minor: landing page still overflows ~15px at 320px viewports only (agency dashboard mock card cannot shrink below its content width; 360px+ is clean). Fix with `min-w-0` + truncation inside the mock rows.
12. Security tidy-up: the `RELEASE_TOKEN` Actions secret (cross-repo APK publish) currently holds the owner's gh CLI OAuth token (repo-wide scope). Replace with a fine-grained PAT scoped to contents:write on `Mykavo-app-download` only. Note: with the repo private, Actions minutes are metered (free plan 2000 min/month). Measured 2026-09-08: the Android build takes **~20 min** per run (the Gradle `assembleRelease` step alone was 19.5), and it fires on any push touching `apps/mobile` - including one that only swapped the icon PNGs. While the APK download stays paused (item 6), consider making that workflow `workflow_dispatch`-only so the minutes go to web deploys (~3.5 min each) instead.
13. Owner-vetted feature shortlist (not yet built): domain-expiry (RDAP) alerts, competitor page watching, new-page auto-detection, shareable change links.

## Known code-level findings (full read of the codebase, 2026-09-08)

Verified against `main`, none fixed yet. Listed worst-first. The codebase is otherwise in
unusually good shape: **1 `any` in ~53k lines** of non-test code, zero TODO/FIXME, severity
rules genuinely confined to `packages/severity-engine`, plan limits genuinely confined to
`config/plans.ts`, and every mutating API route workspace-scoped through `getApiContext()`
with no bypass.

1. **Visual diff has no shift detection - the biggest false-positive risk.**
   `packages/comparison-engine/src/visual.ts` pads both screenshots onto a common canvas and
   runs pixelmatch. Insert a paragraph near the top of a page and everything below shifts,
   so nearly every pixel differs → ≥15% → a **HIGH alert for a routine content edit**. Spec
   §4.5 makes low false positives a core feature and §61 makes "customers who get a genuinely
   valuable alert" the critical metric, so this is the most likely thing to erode alert trust.
2. **Dead severity branch**, `packages/severity-engine/src/index.ts:409`:
   `p >= 30 ? "HIGH" : p >= 15 ? "HIGH"` - both arms return HIGH, so the spec's
   "30%+ CRITICAL candidate" tier can never fire.
3. **`redirect_appeared` can never fire.** `apps/worker/src/compare-scan.ts:94` hardcodes
   `redirectCount: 0`, and `compare.ts` gates the signal on `current.redirectCount > 0`. The
   severity rule exists and is unit-tested, but no data ever reaches it - spec §19's
   "New redirect: MEDIUM" is effectively unimplemented (`final_url` catches the loud cases).
4. **`pageWeightBytes` is racy.** `packages/scanner/src/scan-page.ts:130` accumulates via
   `response.body().then(...)` - fire-and-forget, never awaited - so the total is read with
   promises still pending and varies between scans. `page_weight` fires at >20% (MEDIUM) /
   >50% (HIGH), making this another false-positive source.
5. **Rate limiting is per-instance on serverless.** `apps/web/src/lib/security/rate-limit.ts`
   is an in-memory `Map`; Netlify runs many Lambda instances, so the effective limit is
   limit x N. Same for Better Auth's in-memory store guarding `/sign-in/email` at 5/min -
   brute-force protection is softer than it reads. A shared store is the fix.
6. **Em-dashes in user-facing strings**, against the no-em-dash convention: ~8 in
   `packages/severity-engine/src/index.ts` change descriptions, which render in the dashboard
   AND in alert emails (title changed, unknown script added, robots.txt, element missing),
   plus the `-` empty-value placeholder.
7. **`docs/` contradicts reality** (this README does not). ARCHITECTURE/IMPLEMENTATION_PLAN/
   DATABASE_SCHEMA still describe Stripe, Trigger.dev, `ProcessedStripeEvent`, and
   "Starter $12 / Pro $29 / Agency $79" with $6 add-ons. Actual: Dodo, pg-boss,
   `ProcessedWebhookEvent`, Free + Pro $20. IMPLEMENTATION_PLAN still marks Phase 0 "current".
8. **Retired add-on feature left behind**: `WebsiteAddon` model, `DODO_ADDON_PRODUCT_ID` in
   `env.ts`, and ~15 tests in `subscription.test.ts` exercising capacity nothing grants.
9. Minor: `dashboard/billing/page.tsx` hardcodes `"8 websites"` in the upgrade CTA instead of
   reading `pro.limits.websites` (the card above it does it correctly).
10. Known limitation, not cheaply fixable: DNS-rebinding TOCTOU - `assertSafeUrl` resolves,
    then `fetch`/Playwright resolves again independently.

## Working conventions for future sessions

- Verify → deploy → verify on production. Never claim done on a red build.
- Hand-write migration SQL; apply with `migrate deploy` locally + on Supabase; re-run `enable-rls.ts` after new tables.
- **Pushing to `main` IS deploying.** Fast-forward `main` after verifying, push, and watch the Actions run. Never deploy by hand from a laptop (see the deploy runbook for why) and never leave work on an unpushed branch - production must always be reproducible from `main`.
- Migrations run BEFORE the push that ships the code needing them - CI deploys the web app but does not touch the database.
- **Update this README whenever architecture, pricing, or runbooks change - it is the project's portable memory across machines and AI accounts.**

---

Built by **Dakshesh B** ([github.com/dakshu007](https://github.com/dakshu007)) with Claude Code.
