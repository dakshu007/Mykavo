# Fluxen

> Know what changed. Fix what matters.

Fluxen is a **website change detection & regression monitoring SaaS** for agencies, developers, SEO teams, and website owners. It baselines your pages, re-scans on a schedule, detects meaningful visual / SEO / content / link / script / performance / availability changes, scores them by severity, and alerts you before customers notice.

This file is the single source of truth for picking the project back up in a fresh session. Read it top to bottom. Deeper operational history lives in the Claude memory dir (`~/.claude/projects/-Users-dakshu-Desktop-Fluxen/memory/` — start with `fluxen-deployment.md`).

---

## Status — ALL spec phases (0–11) complete, plus a lot more

**LIVE IN PRODUCTION: https://fluxenn.netlify.app**

Everything in the original CLAUDE.md spec is built, plus:

| Area | What exists |
|---|---|
| **Core monitoring** | Add website → SSRF-guarded validation → robots/sitemap/link discovery → page selection → Playwright baseline scan → scheduled re-scans → deterministic comparison (HTTP/SEO/DOM/text/links/scripts/perf/visual/elements) → severity-scored ChangeEvents |
| **Site health** | Uptime probe every 5 min + SSL expiry tracking, DOWN/SSL incidents (2-strike open, recovery + 24h renotify), Health card + **Uptime & performance analytics** (7/30/90d day-bars, response-time chart, incident history) |
| **robots/sitemap** | Per-scan `SiteMetaSnapshot`; `Disallow: /` = CRITICAL, sitemap vanished/shrank >50% = HIGH; site-wide events render "Site-wide" |
| **Lighthouse** | On-demand per ANY page of a site (dropdown/custom path, same-origin enforced) + **weekly scheduled audits** (Tue 06:00 UTC) + score trend sparkline + **performance-drop alerts** (prev ≥30, drop ≥15) |
| **SEO health report** | `/dashboard/websites/[id]/seo` — score + grouped issues (titles/descriptions/H1/noindex/canonical/errors/**broken internal links**) from the latest scan, no extra crawling |
| **Broken link monitoring** | Per-scan internal-link status check in the worker (`check-links.ts`: HEAD probes w/ GET fallback, SSRF-guarded per hop, 150-link cap, monitored-page statuses reused free, only definite failures recorded — 0/404/410/5xx; 401/403/429/timeouts never flag). Newly-broken links vs baseline → ONE grouped site-wide LINKS event (≥5 HIGH, else MEDIUM) with per-link list on the change detail page |
| **Changes UX** | Filters, bulk select/actions, notes thread, filtered CSV export, before/after **slider + pixel-diff modes**, approve/ignore/resolve, update-baseline, approve-entire-scan, broken-links list card on site-wide LINKS events |
| **Alerts** | Email + **Slack/Discord/webhook channels** (SSRF-guarded, HMAC-signed generic webhooks, send-test), grouped per scan, severity threshold prefs, **weekly client-ready report emails** (Mon 08:00 UTC), **mute windows** (1h/8h/24h) |
| **Public** | **Status pages** `/status/[token]` (90-day uptime bars, incidents, "Monitored by Fluxen" growth loop) + **SVG uptime badge** `/api/badge/[token]` — both share `Website.publicToken`, separate enable flags |
| **Teams** | Invites by email (Pro = 5 seats), roles OWNER/ADMIN/MEMBER/VIEWER enforced on EVERY mutating route (viewer read-only, billing owner-only), workspace switcher (cookie + membership-verified) |
| **Dashboard polish** | ⌘K command palette (search sites/pages/changes + actions), onboarding checklist (live-derived), website **tags** + filtering, loading skeletons everywhere, router cache, **dark mode** (System/Light/Dark, WCAG-AA-tested tokens) |
| **Blog CMS** | `/dashboard/blog` (admin allowlist env `BLOG_ADMIN_EMAILS`) with **Gutenberg-style Tiptap visual editor** (Visual/Markdown tabs, H1–H6, tables, image upload→Blobs, `/cta` `/faq` `/toc` blocks, byte-identical shortcode round-trip), public `/blog` + RSS `/blog/feed.xml`, magazine post layout (hero, sticky ToC, author bio) |
| **Free SEO tools** | `/tools/*`: website-change-detector, meta-tag-checker, redirect-chain-checker (per-hop SSRF revalidation), bulk-url-status-checker, script-detector — all rate-limited + SSRF-guarded, product CTAs |
| **Landing page** | stamped.io-style editorial redesign (2026-07-13, user-directed): fixed dark palette + Instrument Serif/Sora, scroll-scrubbed hero, inset pastel panels — all in `apps/web/src/components/landing/` (`style.ts` = its design system, deliberately NOT `--fx-*` tokens). Other marketing pages still use `components/marketing/*` shell |
| **Billing** | Dodo Payments: Free (1 site, 5 pages) / **Pro $12** (8 sites, 20 pages/site, 5 seats, daily scans) / add-ons **$6 = +1 site, max 3**. Config in `apps/web/src/config/plans.ts` ONLY |
| **Settings** | Plan card, profile (photo upload → validated data-URL, name), Team management |

**Tests: 556 web · 92 shared · 19 email · 4 scanner · 29+ DB integration.** Run `pnpm --filter web test` etc.

---

## 🚀 Production architecture (all zero-budget)

- **Web**: Netlify site `fluxenn` (id `3c4a3c88-f933-4430-9455-e2d693941f67`), serverless in US-East. Deploy = rsync worktree → clean dir → `netlify deploy --build --prod --filter web` (see runbook below).
- **Database**: **Supabase** project `mdjpcdwqwyufjbzguzfr` (**us-east-1** — MUST be in the functions' region, not near the user; a Mumbai project caused timeouts and was migrated + deleted). Direct host is IPv6-only → always use the pooler `aws-0-us-east-1.pooler.supabase.com`, username `postgres.mdjpcdwqwyufjbzguzfr`. Web uses **transaction pooler :6543** (`?pgbouncer=true&connection_limit=1`); worker + `prisma migrate deploy` use **session pooler :5432**. Neon and Supabase-Mumbai are retired/deleted.
- **Worker**: runs on this Mac as launchd agent **`com.fluxen.worker-prod`** from **`~/.fluxen/app`** (a code copy — launchd can't execute from `~/Desktop` due to TCC). Env: `~/.fluxen/app/apps/worker/.env.production`. Logs: `~/.fluxen/logs/worker-prod.log`. Restart: `launchctl kickstart -k gui/501/com.fluxen.worker-prod`. Crons: scheduler + health (*/5), retention (daily 03:00), reports (Mon 08:00), audits (Tue 06:00) — all UTC.
- **Artifacts** (screenshots/diffs): **Netlify Blobs** store `fluxen-artifacts` (`ARTIFACT_STORE=netlify-blobs`). Worker writes with `NETLIFY_SITE_ID`+`NETLIFY_AUTH_TOKEN`; web reads with `NETLIFY_BLOBS_SITE_ID`/`NETLIFY_BLOBS_TOKEN` site env vars. Blog images live at `blog-images/*` in the same store.
- **Payments**: Dodo (test mode). **Email**: Resend key present but NO verified domain → mail only reaches the account owner (see "Pending").

### Deploy runbook (web)
```bash
cd <this repo>   # branch claude/heuristic-agnesi-d235d1 == main == deployed
rm -rf /tmp/fluxen-deploy
rsync -a --exclude node_modules --exclude .next --exclude .git --exclude '.env*' \
  --exclude .data --exclude .netlify --exclude .claude ./ /tmp/fluxen-deploy/
mkdir -p /tmp/fluxen-deploy/.netlify
echo '{ "siteId": "3c4a3c88-f933-4430-9455-e2d693941f67" }' > /tmp/fluxen-deploy/.netlify/state.json
cd /tmp/fluxen-deploy && pnpm install && netlify deploy --build --prod --filter web
```
Migrations first (session pooler URL): `cd packages/database && DATABASE_URL=<session-pooler-url> pnpm exec prisma migrate deploy`.
Worker update: rsync the same excludes to `~/.fluxen/app`, `pnpm install`, `prisma generate` in packages/database, then `launchctl kickstart -k gui/501/com.fluxen.worker-prod`.

---

## ⚠️ Gotchas (each one cost real debugging time)

- **pnpm/node are NOT on PATH**: `export PATH="/Users/dakshu/.hermes/node/bin:$PATH"` first. Local dev DB: `postgresql://dakshu@localhost:5432/fluxen_dev`.
- **After Prisma schema changes, restart the Next dev server AND `rm -rf apps/web/.next`** — stale generated client throws `Cannot read properties of undefined`; stale compiled CSS makes theme tokens compute empty.
- **Only ONE worker per database.** Kill prod worker via launchctl (above); `pkill -f "Fluxen/apps/worker"` does NOT match it.
- **Client components must NOT import the `@fluxen/shared` barrel** — it re-exports `ssrf.ts` (`node:dns`) and breaks client chunks. Use subpaths: `@fluxen/shared/stabilization`, `/channels`, `/url`, `/script-services`.
- **Netlify CLI targets whatever `.netlify/state.json` (or a stale global link) says** — ALWAYS confirm `netlify status` shows `fluxenn` before env/deploy commands; a wrong cwd once pointed it at another site (`rank-tracker-hub`). `netlify env:get/list` need `--context production` (secret vars exist).
- **Agent-tool worktrees branch from `main`**, not the session branch — fast-forward main before launching implementation agents.
- Interrupting `prisma migrate deploy` mid-run leaves a "failed" migration record — if the DDL actually applied, fix with `prisma migrate resolve --applied <name>`.
- pg-boss v12: named import `{ PgBoss }`; new `page.evaluate` in the scanner needs the `__name` shim (see scan-page.ts).
- Local test login: `alex@example.com` / `correct-horse-battery` (Pro, has data). Prod owner: `daksheshbabu@gmail.com` (also the only `BLOG_ADMIN_EMAILS` entry in prod).

## Running it locally

```bash
export PATH="/Users/dakshu/.hermes/node/bin:$PATH"
pnpm install
pnpm dev        # web → http://localhost:3000 (Claude sessions use launch.json → port 3010)
pnpm worker     # scan worker, 2nd terminal (apps/worker/.env → local DB)
pnpm test       # all package tests
pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web build
```
Migrations: `cd packages/database && pnpm exec prisma migrate dev` (23 migrations).

## Repository layout (pnpm workspace)

```
apps/web        Next.js 16 App Router — marketing, dashboard, blog, tools, all APIs
apps/worker     pg-boss consumer: scans, comparison, health, reports, audits, retention, notifications
packages/
  database          Prisma schema/client + DB helpers (+ live-DB integration tests)
  scanner           Playwright pool, page scan, stabilization, lighthouse, artifact storage (disk/Blobs)
  comparison-engine deterministic diff + pixelmatch visual diff + site-meta (robots/sitemap)
  severity-engine   the ONLY place severity rules live
  email             console/Resend sender + all templates
  shared            url/ssrf/queues/schedule/retention/channels/stabilization/health/report/performance/script-services
docs/           ARCHITECTURE, IMPLEMENTATION_PLAN, DATABASE_SCHEMA, SECURITY_MODEL, DESIGN_SYSTEM
```

## Design language (user-approved — keep consistent)

Soft cool-gray canvas, white cards (24px radius, soft shadows), royal-blue primary `#3556f4`, pill buttons/chips, Geist Sans/Mono, severity colors ALWAYS paired with text labels. **All colors flow through `--fx-*` CSS variables in `apps/web/src/app/globals.css`** (light + dark palettes; `lib/theme-contrast.test.ts` enforces WCAG AA on every pairing — never hardcode Tailwind palette classes like `text-red-600`; use the semantic tokens incl. `*-strong`, `ink-inverse`, `panel`). Charts are hand-rolled SVG (`components/charts/`, `lib/health-charts.ts`) — no chart libraries.

## Environment variables

**Web** (`apps/web/.env.local` locally; Netlify env in prod): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `APP_URL`, `BLOG_ADMIN_EMAILS`, `ARTIFACT_STORE=netlify-blobs` (+ `NETLIFY_BLOBS_SITE_ID`/`NETLIFY_BLOBS_TOKEN` in prod), `DODO_*` (webhook secret pending), optional `GOOGLE_CLIENT_ID/SECRET`.
**Worker** (`apps/worker/.env` local, `~/.fluxen/app/apps/worker/.env.production` prod): `DATABASE_URL`, `APP_URL`, `ARTIFACT_STORE`/`ARTIFACT_DIR`, `NETLIFY_SITE_ID`+`NETLIFY_AUTH_TOKEN`, `RESEND_API_KEY`/`EMAIL_FROM`, cron overrides (`SCHEDULER_CRON`, `HEALTH_CRON`, `RETENTION_CRON`, `REPORT_CRON`, `AUDIT_CRON`).

## Pending / known limitations

1. **Resend domain unverified** → all outbound email (alerts, weekly reports, team invites) only delivers to the Resend account owner. Fix: verify a domain in Resend, set `EMAIL_FROM`, done. (Invite "Copy link" is the workaround.)
2. **Worker lives on this Mac** — must be on/awake; queued jobs survive 14 days. Proper fix: a ~$5/mo host (Railway/Render) with the same env.
3. `DODO_WEBHOOK_SECRET` not set in prod (payment attribution incomplete); Dodo still in test mode.
4. Google OAuth configured in code but no credentials set.
5. Canonical URLs across the site use `site.url` = `https://fluxen.app` (domain not owned/connected yet) — set `NEXT_PUBLIC_SITE_URL` when a real domain lands.

## Working conventions for future sessions

- Feature rounds run as parallel subagents in isolated worktrees (branched from `main` — keep main current!), merged + verified by the orchestrator: lint, typecheck, full tests, production build, real-browser verification, then deploy web + worker + migrations, live smoke, memory update.
- Hand-write migration SQL in agent worktrees (never connect agents to databases); apply with `migrate deploy` locally + on Supabase at integration.
- Verify everything on production after deploying — screenshots, curl smoke tests, worker logs.
