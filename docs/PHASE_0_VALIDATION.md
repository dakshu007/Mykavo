# Fluxen — Phase 0: Validation Assets

**Goal:** validate acquisition and interest before building expensive scanning infrastructure.

## Deliverables

1. **Marketing landing page** (`/`) — all 16 sections from spec §50: nav, hero ("Know What Changed." / "Fix What Matters."), interactive URL input, dashboard preview, trust indicators (honest — no fake logos/testimonials), core problem, change categories, before/after comparison, agency workflow, how it works, use cases, free tools, pricing, FAQ, final CTA, footer.
2. **Pricing page** (`/pricing`) — Free / Starter $12 / Pro $29 / Agency $79 from centralized `src/config/plans.ts`.
3. **Dashboard preview** (`/preview`) — static mock states of the real product IA (overview, websites, changes, change detail) using the production design system. Clearly presented as a product preview; realistic sample data, no fabricated customer data.
4. **Waitlist** — `POST /api/waitlist`, Zod-validated, deduplicated, rate-limited; store is interface-backed (file locally → Prisma in Phase 1). Signup forms in hero, pricing, and final CTA.
5. **Analytics foundation** — `src/lib/analytics.ts` with spec §47 event vocabulary (`pricing_viewed`, `checkout_started`, plus Phase 0 events `waitlist_joined`, `tool_used`); pluggable provider (console in dev, Plausible-ready via env).
6. **Free tool #1: Website Change Detector** (`/tools/website-change-detector`) —
   - Enter a URL → SSRF-guarded server fetch → deterministic snapshot (HTTP status, final URL, redirect chain, title, meta description, canonical, robots meta, H1s, internal/external link counts, third-party scripts, page weight, response time).
   - Compare **two URLs** side-by-side (e.g., staging vs production) or **save a snapshot** (browser localStorage) and re-check the same URL later to see exactly what changed.
   - Grouped, severity-hinted diff output. CTA: "Monitor changes automatically with Fluxen."

## Definition of Done (spec §57)

- [ ] Production-quality landing page
- [ ] Responsive design (marketing fully responsive; preview desktop-first)
- [ ] SEO metadata (titles, descriptions, OpenGraph, canonical, structured data)
- [ ] Analytics wired to page views + key events
- [ ] Functional waitlist signup
- [ ] Free tool functional end-to-end with SSRF protection
- [ ] Clear Fluxen branding
- [ ] No fake social proof
- [ ] `lint`, `typecheck`, `build` all green

## Design Reference

The dashboard visual direction follows the user-provided reference: soft neutral canvas, white cards with large radii, gradient accent stat tiles, pill controls, a persistent right rail, generous whitespace, strong friendly typography. Adapted to Fluxen's professional/technical brand per [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — status colors carry meaning (severity), gradients are reserved for a small number of hero stat tiles, and information density stays high where it matters (tables, diffs).

## Success Signals to Watch

- Waitlist conversion rate from landing + tool traffic.
- Free tool usage volume and repeat usage (saved-snapshot re-checks are a strong intent signal).
- `pricing_viewed` → waitlist conversion.
- Organic impressions for "website change detector" and adjacent queries.

## Explicit Non-Goals in Phase 0

Real auth, database server, Playwright, screenshots, scheduled scans, Stripe, AI. See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).
