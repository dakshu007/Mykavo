# MyKavo — Implementation Plan

MyKavo is built strictly phase-by-phase. A phase begins only when the previous phase's Definition of Done is met (lint, typecheck, tests, production build all passing).

## Phase Overview

| Phase | Scope | Definition of Done |
|---|---|---|
| **0 — Validation Assets** ✅ current | Landing page, pricing page, dashboard mock states, waitlist, analytics foundation, free tool #1 (Website Change Detector) | Production-quality responsive marketing site with SEO metadata, functional waitlist, functional free tool, no fake social proof |
| **1 — Foundation** | pnpm monorepo hardening, `packages/database` (Prisma + Postgres), Better Auth, workspace auto-creation, dashboard shell, env validation, structured logging, test infra | User can register, sign in, own a workspace, access an authenticated dashboard |
| **2 — Website Management** | Add website, URL validation, SSRF guard promoted to `packages/shared`, website CRUD, robots.txt + sitemap discovery, internal link discovery, page selection, plan limits | User can safely add a website and select monitored pages |
| **3 — Scanning Engine** | Background jobs (Trigger.dev), `apps/worker`, Playwright scanner, browser pool, stabilization, metadata/DOM/screenshot/script/link/perf extraction, monitored element checks, snapshot storage (R2) | Async scans persist reliable snapshots |
| **4 — Baselines** | Baseline scans, versions, approval, history | Every monitored page has an approved active baseline |
| **5 — Comparison Engine** | HTTP/SEO/DOM/text/link/script/perf/screenshot/element comparison, change grouping, severity engine | Meaningful changes detected between baseline and scan |
| **6 — Changes Interface** | Changes list + filters, change detail, before/after values + screenshots, diff visualization, review/approve/ignore, baseline update flow | Users understand and manage detected changes |
| **7 — Scheduling & Notifications** | Central scheduler, recurring scans, retries, Resend email alerts, preferences, scan summaries, failure alerts | MyKavo monitors automatically without user action |
| **8 — Billing** ✅ | Dodo Payments Checkout, idempotent webhooks, sync, portal, plan enforcement, upgrade/cancel. **Free + Pro $12/mo (50 sites) + self-serve $6/mo add-ons (+30 sites each)** | Customers pay; limits (incl. add-on capacity) enforced server-side |
| **9 — Conversion Monitoring** ✅ | Per-page monitored elements (name/selector/importance/expected existence·visibility·text·href), Pro-gated CRUD + UI, in-page checks in the scanner, CONVERSION comparison + severity rules, capped 20/page | Users monitor business-critical CTAs and forms |
| **10 — Production Hardening** ✅ | Retention cleanup cron (plan-based, artifact-aware, baseline-safe), per-plan scan quotas + concurrent-scan cap, per-workspace + auth rate limits, duplicate-scan advisory lock (§40), retention indexes. Deferred to ops: external error-monitoring/APM, metrics, Redis limiter (multi-instance), load tests, backups | Safe and reliable for public paying customers (code-level) |
| **11 — SEO Growth Engine** ◀ next | Remaining free tools, SEO landing-page architecture, structured data, sitemaps, internal linking, conversion tracking | Scalable organic acquisition system |

## Phase 0 Work Breakdown (current)

1. **Docs** — this directory (architecture, plan, schema, security, validation, design system).
2. **Workspace** — pnpm workspace root; `apps/web` (Next.js 16, TS, Tailwind v4).
3. **Design system** — tokens + primitives per [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).
4. **Marketing site** — landing page (16 sections per spec §50), pricing page from centralized `plans.ts` config.
5. **Dashboard preview** — static mock states demonstrating the real product IA (overview, websites, changes, change detail) with realistic sample data clearly framed as product preview.
6. **Waitlist** — `POST /api/waitlist` (Zod-validated, deduplicated, file-backed store with an interface that swaps to Prisma in Phase 1).
7. **Analytics** — `lib/analytics.ts` event tracker with the spec §47 event vocabulary, provider-pluggable (console/no-op in dev, Plausible-ready).
8. **Free tool** — Website Change Detector at `/tools/website-change-detector`: SSRF-guarded server fetch, deterministic snapshot extraction, compare two URLs or a saved snapshot vs live, grouped diff output, MyKavo CTA.
9. **Verification** — lint, typecheck, production build, manual visual review.

## What Phase 0 deliberately does NOT include

- No real authentication (waitlist only; auth arrives in Phase 1 with Better Auth).
- No database server dependency (file-backed waitlist store behind an interface).
- No Playwright/scanning infrastructure (the free tool uses plain HTTP fetch + HTML parsing).
- No Stripe (pricing page links to waitlist).
- No AI anywhere.

## Carry-forward contracts from Phase 0

- `src/lib/security/ssrf.ts` and `src/lib/url.ts` are written to the production spec (§11, §12) and migrate into `packages/shared` in Phase 2 unchanged.
- `src/config/plans.ts` is the single source of pricing/limits truth; Phase 8 consumes it for Stripe products and server-side enforcement.
- `src/lib/analytics.ts` event names follow spec §47 and remain stable.
