# Fluxen

> Know what changed. Fix what matters.

Fluxen is a **website change detection & regression monitoring SaaS** for agencies, developers, SEO teams, and website owners. It creates approved baselines of your pages, re-scans them on a schedule, detects meaningful visual / SEO / content / link / script / performance / availability changes, scores them by severity, and emails you when something important breaks.

This file is the single source of truth for picking the project back up in a fresh session. Read it top to bottom.

---

## Status — Phases 0–8 complete (of 0–11)

| Phase | What it delivered | Done |
|---|---|---|
| **0 — Validation assets** | Marketing site, pricing, dashboard preview, waitlist, free "Website Change Detector" tool | ✅ |
| **1 — Foundation** | Monorepo, Postgres/Prisma, Better Auth, workspace auto-create, dashboard shell, logging, tests | ✅ |
| **2 — Website management** | Add website, SSRF-guarded validation, robots/sitemap/link discovery, page selection, plan limits | ✅ |
| **3 — Scanning engine** | Playwright worker + browser pool, stabilization, DOM normalization, screenshots, snapshots (pg-boss queue) | ✅ |
| **4 — Baselines** | Auto-create v1 on first scan, versioning, approve/supersede, history (one ACTIVE per page) | ✅ |
| **5 — Comparison engine** | `severity-engine` + `comparison-engine` (deterministic + pixelmatch visual diff), ChangeEvents; **+ Google sign-in** | ✅ |
| **6 — Changes interface** | Review/approve/ignore/resolve, update-baseline flow, approve-entire-scan, filters | ✅ |
| **7 — Scheduling & notifications** | pg-boss cron scheduler (recurring scans, no user action), grouped email alerts (Resend/console), preferences | ✅ |
| **8 — Billing** | **Free + Pro $12/mo (50 websites) + self-serve $6/mo add-ons (+30 websites each)**, via **Dodo Payments**, auto-upgrade on payment, security-hardened webhook | ✅ |
| **9 — Conversion monitoring** | Per-page monitored elements — CTA/form existence·visibility·text·href checks → CONVERSION change events, Pro-gated UI + CRUD | ✅ |
| **10 — Production hardening** | Retention cleanup cron (plan-based, artifact-aware), per-plan scan quotas + concurrency cap, per-workspace + auth rate limits, duplicate-scan DB lock, retention indexes | ✅ |
| **11 — SEO growth engine** | More free tools, SEO landing pages, structured data | ⬜ next |
| **+ Performance audits** | On-demand **Lighthouse** audit per website (scores + Core Web Vitals), free for all plans, rate-limited | ✅ |

Every phase is one git commit (`git log --oneline`). 178 tests pass.

**Phase 10 scope note:** the *code-level* hardening is done (above). Explicitly deferred to ops (some need paid services, against the zero-budget rule): external error monitoring/APM (Sentry), Prometheus/StatsD metrics, a shared (Redis) rate-limit store for multi-instance, load testing, and a managed backup strategy. The in-app rate limiters and Better Auth throttle are **per-process/in-memory** — correct for single-instance; swap to a shared store before scaling out horizontally.

**Performance audits (Lighthouse):** a "Run audit" button on each website detail page runs a Google Lighthouse audit (`packages/scanner/src/lighthouse.ts` drives Playwright's bundled Chromium via `chrome-launcher`) and shows the 4 category scores + Core Web Vitals with history. On-demand only (never per scan — Lighthouse is ~10–40s/CPU-heavy, spec §22/§62), **free for all plans**, capped at 5 audits/workspace/hour. The audit keeps Chrome's OS sandbox **on** (the URL is untrusted) and re-checks the URL through the SSRF guard first. Needs Playwright's Chromium installed (`pnpm --filter @fluxen/scanner exec playwright install chromium`). Adds `lighthouse` + `chrome-launcher` to `@fluxen/scanner`.

---

## ⚠️ Environment gotchas (read first)

- **pnpm/node are NOT on PATH.** They live at `~/.hermes/node/bin`. Prefix commands:
  ```bash
  export PATH="/Users/dakshu/.hermes/node/bin:$PATH"
  ```
- **PostgreSQL 17** runs locally (Homebrew). Database: **`fluxen_dev`**, connection `postgresql://dakshu@localhost:5432/fluxen_dev`.
- **After any Prisma schema change, restart the Next dev server** — it caches a stale generated client and throws `Cannot read properties of undefined`.
- **Run only ONE worker at a time.** `pkill -f "tsx src/index.ts"` does NOT match it — use `pkill -f "apps/worker/src/index.ts"`. Stale workers silently steal queue jobs and run old code.
- **The retention sweep permanently deletes data** older than each workspace's plan window (30d Free / 365d Pro): expired snapshots + their artifacts + old change events. It runs daily in the worker (`RETENTION_CRON`, default `0 3 * * *`), pages in batches, and **never deletes baseline-referenced snapshots** (that would cascade-destroy the baseline). It's a no-op until data ages past the window.
- Everything is **zero-budget**: only free/open-source and free-tier services (local Postgres, pg-boss, Playwright, console-email, Dodo test mode). No dependency requires a credit card in dev.

---

## Running it locally

> **⚠️ You MUST run the worker.** The web app only *enqueues* scans and Lighthouse
> audits; the **worker** process executes them. Without it, every scan/audit sits
> QUEUED forever — "adding a site does nothing" and "Run audit spins." Use
> `pnpm dev:all` (runs both) or run `pnpm dev` **and** `pnpm worker` in two terminals.

```bash
export PATH="/Users/dakshu/.hermes/node/bin:$PATH"

pnpm install
pnpm dev:all    # ⭐ web (→ http://localhost:3000) + worker together — the normal way to run

# …or run the two halves separately (two terminals):
pnpm dev        # web app only → http://localhost:3000
pnpm worker     # scan + audit worker (queue consumer + scheduler) — REQUIRED

pnpm test       # all package tests
pnpm lint       # web eslint
pnpm typecheck  # web tsc  (worker: pnpm --filter worker typecheck)
pnpm build      # web production build
```

Migrations: `cd packages/database && pnpm exec prisma migrate dev` (8 migrations applied).

**Test account:** `alex@example.com` / `correct-horse-battery` (currently on **Pro** with the `anthropic.com` website + baselines + change history from E2E testing).

---

## Repository layout (pnpm workspace + Turborepo-ready)

```
apps/
  web/        Next.js 16 (App Router, TS, Tailwind v4) — marketing, dashboard, all APIs
  worker/     Node worker — pg-boss consumer: scans, comparison, notifications, scheduler cron
packages/
  database/          Prisma schema + client + shared DB logic (baseline, changes, subscription) + DB integration tests
  scanner/           Playwright browser pool, page scan, DOM normalization, artifact storage (local disk → R2)
  comparison-engine/ Deterministic snapshot diff + visual pixel diff (pixelmatch/jpeg-js/pngjs)
  severity-engine/   Centralized, pure severity rules (spec §19/§26) — the ONLY place severity is decided
  email/             Pluggable sender (console/Resend) + scan-summary & failure templates
  shared/            url normalization, SSRF guard, queue names, schedule helpers
docs/         ARCHITECTURE, IMPLEMENTATION_PLAN, DATABASE_SCHEMA, SECURITY_MODEL, DESIGN_SYSTEM, PHASE_0_VALIDATION
```

**Data flow:** web enqueues `scan-website` jobs to **pg-boss** (in the same Postgres, `pgboss` schema) → worker scans pages with Playwright → persists `PageSnapshot`s + screenshots (to `.data/artifacts`, served via authorized routes) → compares against the active `Baseline` → writes `ChangeEvent`s → sends grouped email. A pg-boss **cron** (`scheduler-sweep`) claims due websites and enqueues scans automatically.

---

## Design language (important — user-approved)

The UI follows a specific reference the user provided: **soft cool-gray canvas (`#eceef4`), white cards with 24px radii + soft shadows, royal-blue primary (`#3556f4`), pill buttons/chips, at most ~2 gradient accent tiles per screen, a right rail, Geist Sans/Mono.** Severity always pairs color with a text label. Full tokens in [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md). Keep new UI consistent with this.

---

## Environment variables

Copy `apps/web/.env.example` → `apps/web/.env.local` and `apps/worker/.env.example` → `apps/worker/.env`.

**Web (`apps/web/.env.local`)**
- `DATABASE_URL` (required) · `BETTER_AUTH_SECRET` (32+ chars) · `BETTER_AUTH_URL` · `APP_URL`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional — enables "Continue with Google")
- `DODO_WEBHOOK_SECRET` (required for billing webhook) · `DODO_PRODUCT_ID` (defaults to the Pro product) · `DODO_ADDON_PRODUCT_ID` (the $6/mo website add-on product — unset hides the add-on UI) · `DODO_API_KEY` + `DODO_MODE` (optional — in-app cancel + portal)
- `ARTIFACT_DIR` (must match the worker's)

**Worker (`apps/worker/.env`)**
- `DATABASE_URL` · `ARTIFACT_DIR` (same path as web) · `SCHEDULER_CRON` (default `*/5 * * * *`) · `RETENTION_CRON` (default `0 3 * * *`, daily retention sweep)
- `APP_URL` (email links) · email: `RESEND_API_KEY` + `EMAIL_FROM` (optional — logs to console without them)

Secrets are gitignored (`.env*` except `.env.example`). `.data/` (artifacts) is gitignored.

---

## Billing specifics (Phase 8 — Dodo Payments)

- **Two plans:** Free, and **Pro $12/mo = 50 websites + unlimited pages** (config: `apps/web/src/config/plans.ts`). Pages stay `Infinity` ("Unlimited"); websites are a finite base.
- **Self-serve website add-ons:** on Pro, buy **+30 websites for $6/mo** (repeatable — 80, 110, 140…). Each purchase is its own recurring Dodo subscription tracked in the `WebsiteAddon` table; **effective website limit = 50 + (active add-ons × 30)**, computed server-side in `lib/billing/subscription.ts::getEffectiveWebsiteLimit` and enforced in `lib/limits.ts`. `WEBSITE_ADDON` in `config/plans.ts` holds the 30/$6 numbers. Manage from **dashboard → Billing** (capacity card + "Add 30 more" button).
- Payment provider is **Dodo Payments** (base product `pdt_0Niiijjb1NtzJsNQpp0iD`). Successful payment → workspace auto-upgraded / capacity granted via a verified webhook.
- **To enable add-ons:** create a **recurring $6/mo product** in Dodo and set its id as `DODO_ADDON_PRODUCT_ID`. Until then the add-on button is hidden and the billing page shows "add-ons aren't enabled" (Pro base still works).
- **To go live:** register a webhook in Dodo pointing at `<APP_URL>/api/webhooks/dodo`, set `DODO_WEBHOOK_SECRET` (its `whsec_…`). Set `DODO_API_KEY` + `DODO_MODE` only if you want the in-app cancel button + customer portal.
- **Security (do not regress):** attribution uses an unguessable server-issued `CheckoutIntent` token (never client-editable metadata) — the token now also carries a `kind` (`pro` | `website_addon`) so the webhook routes to the right handler without trusting the client; dedupe + entitlement change happen in one transaction; a `lastEventAt` guard (on both `Subscription` and `WebsiteAddon`) rejects out-of-order events. These fixes came from an adversarial security review — keep them.

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) · [Implementation plan](docs/IMPLEMENTATION_PLAN.md) · [Database schema](docs/DATABASE_SCHEMA.md) · [Security model](docs/SECURITY_MODEL.md) · [Design system](docs/DESIGN_SYSTEM.md)

## Next up

**Phase 11 — SEO growth engine:** the remaining free acquisition tools (redirect-chain checker, meta-tag checker, bulk URL status, script detector), SEO landing-page architecture, structured data, sitemap/internal-linking, and product-led CTAs. See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

Phase 10 (production hardening) is **done**: a daily **retention sweep** deletes expired snapshots + artifacts + change events per plan window (baseline snapshots protected); **per-plan scan quotas** (Pro 20 manual/day) + a **concurrent-scan cap** (10/workspace); **per-workspace rate limits** on scan/website-create and a **Better Auth brute-force throttle**; a **DB advisory lock** enforces spec §40 "no duplicate scans"; retention indexes added. Passed a multi-agent adversarial review (2 low findings, both fixed). Deferred to ops: external error-monitoring/APM, metrics, a shared (Redis) limiter for multi-instance, load testing, backups.
