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
| **8 — Billing** | **Two plans: Free + Pro $12/mo unlimited**, via **Dodo Payments**, auto-upgrade on payment, security-hardened webhook | ✅ |
| **9 — Conversion monitoring** | Custom monitored elements (CTA/form existence/visibility/text/href) | ⬜ next |
| **10 — Production hardening** | Rate limits, quotas, concurrency, indexes, retention, abuse prevention | ⬜ |
| **11 — SEO growth engine** | More free tools, SEO landing pages, structured data | ⬜ |

Every phase is one git commit (`git log --oneline`). 151 tests pass.

---

## ⚠️ Environment gotchas (read first)

- **pnpm/node are NOT on PATH.** They live at `~/.hermes/node/bin`. Prefix commands:
  ```bash
  export PATH="/Users/dakshu/.hermes/node/bin:$PATH"
  ```
- **PostgreSQL 17** runs locally (Homebrew). Database: **`fluxen_dev`**, connection `postgresql://dakshu@localhost:5432/fluxen_dev`.
- **After any Prisma schema change, restart the Next dev server** — it caches a stale generated client and throws `Cannot read properties of undefined`.
- **Run only ONE worker at a time.** `pkill -f "tsx src/index.ts"` does NOT match it — use `pkill -f "apps/worker/src/index.ts"`. Stale workers silently steal queue jobs and run old code.
- Everything is **zero-budget**: only free/open-source and free-tier services (local Postgres, pg-boss, Playwright, console-email, Dodo test mode). No dependency requires a credit card in dev.

---

## Running it locally

```bash
export PATH="/Users/dakshu/.hermes/node/bin:$PATH"

pnpm install
pnpm dev        # web app → http://localhost:3000
pnpm worker     # scan worker (scheduler + queue consumer) — run in a 2nd terminal
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
- `DODO_WEBHOOK_SECRET` (required for billing webhook) · `DODO_PRODUCT_ID` (defaults to the Pro product) · `DODO_API_KEY` + `DODO_MODE` (optional — in-app cancel + portal)
- `ARTIFACT_DIR` (must match the worker's)

**Worker (`apps/worker/.env`)**
- `DATABASE_URL` · `ARTIFACT_DIR` (same path as web) · `SCHEDULER_CRON` (default `*/5 * * * *`)
- `APP_URL` (email links) · email: `RESEND_API_KEY` + `EMAIL_FROM` (optional — logs to console without them)

Secrets are gitignored (`.env*` except `.env.example`). `.data/` (artifacts) is gitignored.

---

## Billing specifics (Phase 8 — Dodo Payments)

- **Two plans only:** Free, and **Pro $12/mo = unlimited** (config: `apps/web/src/config/plans.ts`, `Infinity` limits rendered as "Unlimited").
- Payment provider is **Dodo Payments** (product `pdt_0Niiijjb1NtzJsNQpp0iD`). Successful payment → workspace auto-upgraded to Pro via a verified webhook.
- **To go live:** register a webhook in Dodo pointing at `<APP_URL>/api/webhooks/dodo`, set `DODO_WEBHOOK_SECRET` (its `whsec_…`). Set `DODO_API_KEY` + `DODO_MODE` only if you want the in-app cancel button + customer portal.
- **Security (do not regress):** attribution uses an unguessable server-issued `CheckoutIntent` token (never the client-editable `metadata.workspaceId`); dedupe + entitlement change happen in one transaction; a `lastEventAt` guard rejects out-of-order events. These fixes came from an adversarial security review — keep them.

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) · [Implementation plan](docs/IMPLEMENTATION_PLAN.md) · [Database schema](docs/DATABASE_SCHEMA.md) · [Security model](docs/SECURITY_MODEL.md) · [Design system](docs/DESIGN_SYSTEM.md)

## Next up

**Phase 9 — Conversion Element Monitoring:** let users define business-critical elements (signup button, checkout CTA, contact form) by CSS selector with expected existence/visibility/text/href, checked on every scan (e.g. `Critical: "Start Free Trial" button is missing from /pricing`). The `MonitoredElement` model is specced in [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) but not yet built.
