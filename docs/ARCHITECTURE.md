# MyKavo — Architecture

> Know what changed. Fix what matters.

MyKavo is a website change detection and regression monitoring SaaS. This document describes the target architecture and how the codebase evolves toward it phase-by-phase.

## 1. Architectural Style

**Modular monolith with separate worker processes.**

- One Next.js application serves the marketing site, dashboard, and application APIs.
- Separate worker processes (introduced in Phase 3) execute long-running scans with Playwright.
- Shared logic lives in workspace packages so web and workers consume the same code.
- No microservices. No premature service boundaries.

## 2. High-Level Flow

```
Browser
  ↓
Next.js Web App (marketing + dashboard)
  ↓
API Layer (Next.js Route Handlers)
  ↓
PostgreSQL (Prisma)
  ↓
Background Job System (Trigger.dev or BullMQ + Redis)
  ↓
Scan Workers
  ↓
Playwright Browser Pool
  ↓
Website Scanner → Normalized Page Snapshot
  ↓
Comparison Engine → Change Events
  ↓
Severity Engine
  ↓
Notification Engine → Email (Resend) + Dashboard
```

**Rule: scanning is always asynchronous.** No HTTP request handler ever waits for a full website scan.

## 3. Repository Structure

```
apps/
  web/                 # Next.js app: marketing, dashboard, APIs
  worker/              # Scan workers (Phase 3+)
packages/
  database/            # Prisma schema + client (Phase 1+)
  scanner/             # Playwright scanning + snapshot capture (Phase 3+)
  comparison-engine/   # Deterministic snapshot comparison (Phase 5+)
  severity-engine/     # Centralized severity rules (Phase 5+)
  billing/             # Stripe + plan limits (Phase 8+)
  email/               # Resend + React Email templates (Phase 7+)
  shared/              # URL normalization, SSRF guard, types, utils
  config/              # Shared tsconfig/eslint/plan configuration
infra/                 # Deployment / IaC notes
docs/                  # This documentation
```

Tooling: pnpm workspaces (+ Turborepo when the worker app lands). Phase 0 ships only `apps/web` plus `docs/`.

## 4. Technology Stack

| Concern | Choice |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Lucide |
| Forms/validation | React Hook Form + Zod |
| Database | PostgreSQL + Prisma |
| Auth | Better Auth |
| Payments | Stripe (Checkout, Portal, Webhooks, Subscriptions) |
| Background jobs | **pg-boss** (PostgreSQL-backed queue — zero extra infra; chosen over BullMQ+Redis to stay zero-budget) |
| Browser automation | Playwright (bundled Chromium) |
| Email | Resend + React Email |
| Object storage | Local disk in dev behind an `ArtifactStorage` interface → Cloudflare R2 free tier in prod. Screenshots never live in Postgres |

## 5. Core Domain Concepts

- **Workspace** — owns websites, subscription, usage, notification settings.
- **Website** — a monitored site with scan frequency and status lifecycle (PENDING → DISCOVERING → BASELINING → ACTIVE / PAUSED / ERROR).
- **MonitoredPage** — a specific URL under a website selected for monitoring.
- **Scan** — one execution (BASELINE / SCHEDULED / MANUAL) producing PageSnapshots.
- **PageSnapshot** — normalized capture: HTTP result, hashes (raw HTML, normalized DOM, visible text), SEO metadata, screenshot key, links, scripts, performance metrics.
- **Baseline** — the approved snapshot for a page. New scans compare against the *approved baseline*, not merely the previous scan.
- **ChangeEvent** — a detected, categorized, severity-scored difference with previous/current values.
- **MonitoredElement** — user-defined conversion element (selector + expectations).

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for the full model.

## 6. Comparison Model

```
Approved Baseline ── compare ──> Current Scan
                        ↓
                  Change Events (categorized, severity-scored)
                        ↓
        User approves expected change  →  new Baseline version (old → SUPERSEDED)
        User fixes unexpected change   →  next scan resolves the event
```

Detection is **deterministic** — value vs value, hash vs hash, pixel diff vs threshold. No AI in the detection path. Results must be reproducible and explainable.

## 7. Scan Pipeline (Phase 3+)

```
SCAN_WEBSITE job
  → create Scan row
  → fan out SCAN_PAGE jobs (per monitored page)
      → SSRF validation → Playwright navigation → stabilization
      → extract DOM/text/SEO/links/scripts/perf → screenshot → hashes
      → persist PageSnapshot
  → COMPARE_PAGE jobs (snapshot vs approved baseline)
      → change events + severity
  → scan summary rollup
  → SEND_NOTIFICATIONS (grouped per scan/website)
```

Workers scale horizontally, retry idempotently, tolerate partial failures, and shut down gracefully. Browser concurrency is pooled and capped (max browsers per worker, max pages per browser, restart after N uses).

## 8. False-Positive Defense (core feature, not polish)

- Scan stabilization: DOMContentLoaded + fonts + bounded network-quiet + post-load delay; animations/transitions disabled; volatile attributes stripped.
- DOM normalization pipeline before hashing (comments, nonces, hydration attributes, whitespace, configured ignores).
- Screenshot determinism: fixed viewport/scale/browser/locale/timezone, masks, ignored selectors.
- Configurable thresholds; visual diff % alone never sets final severity.
- Grouped alerts ("17 internal links became broken"), consecutive-scan confirmation for flappy signals.

## 9. Security Posture

MyKavo fetches user-supplied URLs, so the scanner is treated as hostile territory. Full SSRF pipeline (scheme allowlist, DNS resolution, private/reserved/metadata IP blocking, redirect revalidation, size/time caps, rate limits) is documented in [SECURITY_MODEL.md](./SECURITY_MODEL.md). Every discovered URL is independently re-validated. Scanned HTML is never rendered unsanitized.

## 10. Cost Control

Plan-based caps on pages, frequency, history; browser reuse; screenshot compression + R2 lifecycle rules; scan deduplication (idempotency keys / DB locks); conditional external-link checking; controlled worker concurrency. Cost per scan/page/screenshot/GB is tracked as an operational metric.

## 11. Phase 0 Slice (current)

Phase 0 ships only validation assets inside `apps/web`:

- Marketing landing page + pricing page (SEO metadata, responsive).
- Dashboard **preview** (static mock states, real design system — no backend).
- Waitlist capture (API route + local persistence, swappable to Postgres in Phase 1).
- Free tool #1: **Website Change Detector** (server-side fetch behind the same SSRF guard module the real scanner will use).
- Analytics foundation (`lib/analytics.ts`, pluggable provider).

The SSRF guard and URL normalization modules written in Phase 0 are the seeds of `packages/shared` — they move, they are not rewritten.
