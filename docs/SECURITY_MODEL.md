# Fluxen — Security Model

Fluxen fetches user-provided URLs. The scanning environment is treated as untrusted, and SSRF protection is a first-class product component — not middleware bolted on later.

## 1. SSRF Protection Pipeline

Every outbound fetch (discovery, scanning, free tools) passes through one shared guard module (`ssrf.ts`, Phase 0 in `apps/web/src/lib/security/`, later `packages/shared`). No code path may call `fetch`/Playwright navigation on a user-influenced URL directly.

Validation order for any URL:

1. Parse the URL; reject unparseable input.
2. Allow only `http:` and `https:` schemes.
3. Reject URLs containing credentials (`user:pass@host`).
4. Reject hostnames that are obviously internal (`localhost`, `*.local`, `*.internal`, single-label hosts).
5. Resolve DNS (both A and AAAA).
6. Reject if **any** resolved address is:
   - Loopback (`127.0.0.0/8`, `::1`)
   - Private (`10/8`, `172.16/12`, `192.168/16`, `fc00::/7`)
   - Link-local (`169.254/16`, `fe80::/10`) — includes cloud metadata `169.254.169.254`
   - Reserved / unspecified / broadcast (`0.0.0.0/8`, `100.64/10`, `192.0.0/24`, `198.18/15`, `224/4`, `240/4`, `255.255.255.255`, `::`, IPv4-mapped IPv6 forms)
7. Explicitly block known metadata endpoints (`169.254.169.254`, `metadata.google.internal`, `[fd00:ec2::254]`).
8. Fetch with redirects **disabled**; follow redirects manually, re-running steps 1–7 on every hop.
9. Enforce a maximum redirect count (5).
10. Enforce request timeout (10s Phase 0 tool; configurable per scanner).
11. Enforce maximum response size (2 MB Phase 0 tool; streamed with a hard cutoff).
12. Rate limits: per-IP for free tools (Phase 0), per-workspace + global abuse limits (Phase 2+).

**DNS rebinding:** connections should be pinned to the validated IP. Phase 0 mitigates by resolving immediately before fetch with a short window and rejecting on re-resolution mismatch; the Phase 3 scanner pins sockets to validated addresses.

**Never trust discovered URLs.** URLs from HTML, sitemaps, redirects, JavaScript, or user configuration are each re-validated independently.

## 2. Scanned Content Handling

- Scanned website HTML is **never rendered unsanitized** in Fluxen UIs. Extracted values (titles, meta, h1s) are rendered as text, never as HTML.
- Free-tool output renders extracted strings via React text nodes only (auto-escaped); no `dangerouslySetInnerHTML` on scanned content.
- Screenshots are served from object storage via signed URLs, never proxied raw HTML.
- Playwright (Phase 3) runs with JavaScript from target sites sandboxed in the browser context; workers hold no production secrets beyond storage write credentials.

## 3. Authentication & Authorization (Phase 1+)

- Better Auth; no custom auth.
- Every API route resolves session → workspace membership → role server-side. Frontend checks are UX only.
- Workspace-scoped queries always filter by `workspaceId` derived from the session, never from client input alone.

## 4. Billing Security (Phase 8)

- Stripe webhook signatures verified; events processed idempotently via `ProcessedStripeEvent`.
- Subscription state is read from the database (synced by webhooks), never from the frontend.
- Plan limits enforced server-side on every mutating operation.

## 5. Secrets & Logging

- Secrets only via environment variables; `.env.example` documents required keys; `.env*` gitignored.
- Structured logs include `requestId / jobId / scanId / websiteId / workspaceId` and **never** passwords, tokens, Stripe secrets, session cookies, or sensitive headers.
- TLS verification is never disabled.

## 6. Abuse & Resource Protection

- Free tools: per-IP rate limiting, response size caps, timeout caps, concurrency caps.
- Scanner (Phase 3+): max pages per website, max page size, max screenshot dimensions, max redirects, max scan duration, max concurrent scans, plan-based quotas.
- robots.txt protections are respected, not bypassed.
- No unlimited crawling; discovery caps on URL count and depth.

## 7. Phase 0 Surface

Phase 0's only attack surface is the marketing site, the waitlist endpoint, and the Website Change Detector tool:

| Surface | Controls |
|---|---|
| `POST /api/waitlist` | Zod validation, email normalization, dedupe, per-IP rate limit, no PII beyond email |
| `POST /api/tools/inspect-url` | Full SSRF pipeline above, 10s timeout, 2 MB cap, 5 redirects, per-IP rate limit, text-only rendering of extracted values |
