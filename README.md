# Fluxen

> Know what changed. Fix what matters.

Website change detection and regression monitoring SaaS for agencies, developers, SEO teams, and website owners.

## Status

**Phase 0 — Validation Assets** (complete): marketing landing page, pricing page, dashboard preview, waitlist, analytics foundation, and the free Website Change Detector tool. See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for the full roadmap.

## Getting started

```bash
pnpm install
pnpm dev          # Next.js dev server at http://localhost:3000
pnpm lint
pnpm typecheck
pnpm build
```

Copy `apps/web/.env.example` to `apps/web/.env.local` to configure the site URL and analytics provider.

## Repository layout

```
apps/web/    Next.js app — marketing site, dashboard preview, APIs
packages/    Shared workspace packages (from Phase 1)
docs/        Architecture, plan, schema, security model, design system
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Security model](docs/SECURITY_MODEL.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Phase 0 validation](docs/PHASE_0_VALIDATION.md)
