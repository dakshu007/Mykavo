# MyKavo — Security Model

MyKavo fetches user-provided URLs. The scanning environment is treated as untrusted, and SSRF protection is a first-class product component — not middleware bolted on later.

## 1. SSRF Protection Pipeline

Every outbound request to a user-influenced URL (discovery, scanning, site meta, site audit, health probes, free tools) goes through one shared guard: `packages/shared/src/ssrf.ts` (re-exported to the web app as `apps/web/src/lib/security/ssrf.ts`). Code that needs a transport `safeFetch` does not offer (TLS certificate probes, the scanner's egress proxy) uses the same module's `resolveSafeHost` + `pinnedLookup`.

Validation order for any URL:

1. Parse the URL; reject unparseable input.
2. Allow only `http:` and `https:` schemes.
3. Reject URLs containing credentials (`user:pass@host`).
4. Reject hostnames that are obviously internal (`localhost`, `*.local`, `*.internal`, `*.localdomain`, `*.localhost`, single-label hosts, `metadata.google.internal`, `metadata.googleapis.com`).
5. Resolve DNS (all A and AAAA records).
6. Reject if **any** resolved address (or the IP literal in the URL) is blocked:
   - **IPv4 denylist:** `0/8`, `10/8`, `100.64/10`, `127/8`, `169.254/16` (link-local, cloud metadata), `172.16/12`, `192.0.0/24`, `192.0.2/24`, `192.88.99/24`, `192.168/16`, `198.18/15`, `198.51.100/24`, `203.0.113/24`, `224/4`, `240/4` (includes `255.255.255.255`).
   - **IPv6 allowlist:** addresses are parsed to bytes (so `::ffff:7f00:1` and `::ffff:127.0.0.1` are the same address) and only global unicast `2000::/3` passes, minus `2001::/23` (Teredo `2001::/32`, benchmarking, ORCHID), `2001:db8::/32` and `3fff::/20` (documentation) and `2002::/16` (6to4). Everything outside `2000::/3` is blocked: `::`, `::1`, IPv4-compatible `::/96`, NAT64 `64:ff9b::/96` and `64:ff9b:1::/48`, `100::/64`, ULA `fc00::/7` (includes AWS `fd00:ec2::254`), link-local `fe80::/10`, multicast `ff00::/8`. The one exception is IPv4-mapped `::ffff:0:0/96`, which is judged by the embedded IPv4.
7. **Connect only to the vetted addresses (DNS pinning).** `safeFetch` uses `node:http`/`node:https` with a custom `lookup` (`pinnedLookup`) that answers only with the addresses that passed step 6. There is no second DNS resolution, so a rebinding answer cannot redirect the socket. The request still names the real hostname, so the `Host` header, TLS SNI and certificate verification are unchanged. (`undici` is not a dependency of this repo, so the global `fetch` cannot be given a pinned dispatcher; `safeFetch` therefore does not use `fetch`.)
8. Fetch with redirects **disabled**; follow redirects manually, re-running steps 1 to 7 on every hop.
9. Maximum redirect count (5 by default; the site audit allows 10).
10. Request timeout (10 s default, per call site configurable).
11. Maximum response size, enforced on the **decoded** body while streaming (2 MB default), so a small compressed response cannot expand into a large allocation. Callers may opt into truncating instead of failing, or into not reading the body at all (status probes).
12. Rate limits: per-IP for free tools, per-workspace plan quotas for scans.

**Never trust discovered URLs.** URLs from HTML, sitemaps, `robots.txt` `Sitemap:` lines, redirects, JavaScript, or user configuration are each re-validated independently.

### 1.1 Browser egress (scanner and Lighthouse)

Chromium fetches everything a scanned page asks for, so the scanner enforces egress in three layers:

1. **Playwright routing** (`packages/scanner/src/scan-page.ts`). `context.route("**/*")` checks every request a page starts (documents, iframes, subresources, fetch/XHR). Non-http(s) schemes are aborted (only `data:` and `blob:`, which never reach the network, are allowed), and hosts are checked with the guard, DNS cached per page scan. The context has `acceptDownloads: false` and `serviceWorkers: "block"` (service-worker fetches bypass routing). Playwright only calls route handlers for the *first* URL of a redirect chain, so this layer does not cover redirects on its own.
2. **Egress proxy** (`packages/scanner/src/egress-proxy.ts`). Every Chromium the worker starts (the `BrowserPool` and Lighthouse's Chrome) is launched with `--proxy-server` pointing at a proxy on `127.0.0.1` in the worker process, with `<-loopback>` so even loopback URLs go to the proxy. For each `CONNECT` tunnel (HTTPS, WebSockets) and plain-HTTP request the proxy resolves the host through the guard and connects only to vetted addresses (`pinnedLookup`, answers cached 60 s). This covers redirect hops, WebSockets, worker requests and DNS rebinding. TLS stays end to end between the browser and the site. WebRTC is limited to proxied transports (`--force-webrtc-ip-handling-policy=disable_non_proxied_udp`).
3. **Final URL revalidation.** Before anything is stored, the navigation response URL and the page's final URL are re-checked. A scan that ends on an unsafe address fails with the structured error `UNSAFE_URL`; a redirect hop the proxy refused is detected the same way. Lighthouse results are discarded with `LighthouseError("UNSAFE_URL")` if the audited page's final URL is unsafe.

Per-page budgets (spec §43): at most 300 requests and 25 MB of response data per page. Past either, further requests are aborted and the snapshot result records `resourceLimit: "REQUESTS" | "BYTES"`. Page weight is counted from decoded bytes as they arrive (CDP `Network.dataReceived`), never by buffering response bodies.

### 1.2 Host firewall (worker server)

`infra/worker/harden.sh` installs `/usr/local/sbin/mykavo-egress-firewall` and a systemd unit that runs it after `docker.service` (and again whenever Docker restarts). It adds a `MYKAVO-EGRESS` chain, hooked into `DOCKER-USER` for traffic arriving from `docker0` and `br-*`, that **drops** container traffic to `169.254.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` and `100.64.0.0/10` (and `fc00::/7`, `fe80::/10` when Docker IPv6 is enabled). It keeps replies to established connections, container-to-container traffic on Docker bridges, and DNS (port 53 only) to the host's upstream resolvers, which on Oracle Cloud is `169.254.169.254`. Public internet destinations (Supabase, R2, Resend, scanned sites) are unaffected. The rules are re-applied at boot by the unit, not saved with `netfilter-persistent`.

### 1.3 Known gaps

- **Container to host.** `DOCKER-USER` filters forwarded traffic only. Traffic from the container to the host's own addresses (for example the bridge gateway) goes through `INPUT` and is not covered by these rules; the host exposes only `sshd` (keys only, fail2ban).
- **Lighthouse routing.** Lighthouse drives Chrome directly over CDP, so there is no per-request routing or request budget for audits; egress is enforced by the proxy and the final URL check only.
- **Out-of-process iframes.** Page weight from CDP covers the main page process; bytes loaded by cross-site iframes that Chromium isolates into other processes are not counted toward page weight or the byte budget (the request budget and egress checks still apply).
- **Direct `fetch` callers.** A few call sites still validate with `assertSafeUrl` and then call the global `fetch` themselves (webhook/Slack/Discord dispatch in `packages/shared/src/channels.ts`, link checks in `packages/shared/src/link-check.ts`, used by the broken-links tool). Those validate every hop but resolve DNS again at connect time, so they are not DNS-pinned yet.

## 2. Scanned Content Handling

- Scanned website HTML is **never rendered unsanitized** in MyKavo UIs. Extracted values (titles, meta, h1s) are rendered as text, never as HTML.
- Free-tool output renders extracted strings via React text nodes only (auto-escaped); no `dangerouslySetInnerHTML` on scanned content.
- Screenshots are served from object storage via signed URLs, never proxied raw HTML.
- Playwright runs target-site JavaScript inside Chromium's OS sandbox (never `--no-sandbox`; see `infra/worker/compose.yml`). The worker container holds database and storage credentials, which is why the egress layers in section 1.1 and 1.2 exist.

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
- Scanner: max pages per website, per-page request (300) and byte (25 MB) budgets, max screenshot dimensions, navigation timeout, max concurrent pages per worker, plan-based quotas.
- robots.txt protections are respected, not bypassed.
- No unlimited crawling; discovery caps on URL count and depth.

## 7. Phase 0 Surface

Phase 0's only attack surface is the marketing site, the waitlist endpoint, and the Website Change Detector tool:

| Surface | Controls |
|---|---|
| `POST /api/waitlist` | Zod validation, email normalization, dedupe, per-IP rate limit, no PII beyond email |
| `POST /api/tools/inspect-url` | Full SSRF pipeline above, 10s timeout, 2 MB cap, 5 redirects, per-IP rate limit, text-only rendering of extracted values |
