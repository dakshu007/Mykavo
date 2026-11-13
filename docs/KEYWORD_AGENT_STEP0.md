# AI Keyword Agent: Step 0 impact check (rerun, 13 Nov 2026)

Spec: `docs/keyword-agent.md`. This rerun follows the five pre-build fixes. Read-only
check; the full test suite passes (2,721 tests, lint, web and worker typecheck), and a
scan, change detection and CRITICAL alert run locally the same as before.

## The five blockers

| # | Blocker | Status | Where |
|---|---|---|---|
| 1 | Egress: dashboard pages re-ran ~15 queries every 3 to 6 s during scans | Fixed | `lib/live-status.ts`, `/api/live-status`, `LiveRefresh`; background pg-boss queues poll every 60 s |
| 2 | Google OAuth in Testing (7-day token expiry) | Fixed | App published to production on 13 Nov, branding verified, read-only scopes only, no review needed (`docs/GOOGLE_OAUTH_VERIFICATION.md`). Connections that expired earlier need one Reconnect |
| 3 | No AI kill switch, one shared spend cap | Fixed | `app_setting` table, `isAiPaused()` in `@mykavo/database`, toggle on All Usage; agent pool `AI_AGENT_MONTHLY_BUDGET_USD` (default $0) |
| 4 | AI cost records deleted with a website | Fixed | `ai_usage` ledger, no foreign keys, backfilled (47 rows, totals match) |
| 5 | Deploys not gated on tests | Fixed | `deploy-web.yml`: `test` job (Postgres service, all migrations, all suites) gates `deploy`; worker follows `worker-release`, moved only after tests pass |

## Verdict per launch feature

| Feature | Verdict | What it touches / what must change |
|---|---|---|
| Kill switch | **Safe** | Done. Agent jobs call `isAiPaused()` before each step. |
| Spend tracking | **Needs change** | `ai_usage` exists. Add a nullable `plan` column (free vs paid split) and the 50/75/90% credit alerts. Additive. |
| Separate AI queue | **Needs change** | New `ai-agent` pg-boss queue in `apps/worker/src/index.ts`, batchSize 1, `BACKGROUND_POLL` style 30 s polling. Scan queues untouched. |
| Quick setup (site profile) | **Needs change** | Plain fetch through `packages/shared/src/ssrf.ts` (`resolveSafeHost`, `pinnedLookup`) in the worker. The Playwright fallback shares the scanner's browser pool: **Risky** unless it waits for a pool slot; recommend no Playwright fallback at launch. |
| Striking distance | **Needs change** | Current sync stores top queries and top pages separately (`gsc_dimension_row`), never which page ranks for a query. Add one capped `[query, page]` fetch to `apps/worker/src/gsc-sync.ts` and a new table. No AI cost. |
| Deep analysis mode | **Needs change** | Autocomplete is an unofficial endpoint (rate limit and cache, fallback to model ideas). Web search costs $10 per 1,000 searches on top of tokens and needs Sonnet or Opus. |
| Report screen | **Safe** | New route group under `/dashboard`, polls `/api/live-status`-style tiny status rows. |
| Post writer | **Needs change** | Worker job on Sonnet 5.5 with a per-job token budget and MAX_STEPS; check `stop_reason` so a truncated post is never saved. |
| Post editor | **Safe** | Reuse the Tiptap editor; sanitise server-side. Separate from the admin blog CMS. |
| WordPress draft publish | **Needs change** | Needs a new endpoint in `plugins/` and a plugin release; old plugin versions need an "update" prompt. Suggest phase 2. |
| Plan limits and quotas | **Needs change** | New AI limit keys in `apps/web/src/config/plans.ts`, separate from monitoring limits; reserve quota in a transaction; count from `ai_usage`, which survives deletes. |
| Monitoring integration | **Risky if rushed** | Auto-monitoring published posts can exceed page limits and trigger alerts on our own changes. Phase 2, after the plugin reports "published". |
| Storage and egress | **Safe** | Database is 198 MB of 500 MB. List screens select light columns only; post bodies load on open. |
| Marketing pages | **Needs change** | `config/comparisons.ts` and `config/page-overviews/pages.ts` say MyKavo does no keyword research. Reword before the feature page goes live. |

Spec prices and site limits match the code (`packages/shared/src/plan-tier.ts`: $7, $20,
$79; 1, 2, 8 and 30 sites).

## Decisions still needed from you

1. Striking distance: all plans, or Pro and up (the spec says both).
2. Quota reset: calendar month (UTC, how AI explanations reset today) or billing date.
3. Drop the Playwright fallback at launch (recommended).
4. WordPress publish in phase 2 instead of launch (recommended).
5. Accept the unofficial autocomplete endpoint, with fallback.
6. One free account per domain and email alias normalisation: build now or later.
7. Rewording the "no keyword research" copy on existing pages.
8. Cost model: include web search fees ($0.01 per search) in the per-plan estimates.

## Overall

**Safe to build.** No remaining blocker in the codebase. The Google OAuth app is now in
production. Before *launch* (not before building): answer the decisions above. Build behind the admin-only rollout with the agent cap at $0 until you
raise it.
