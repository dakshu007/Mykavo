# AI Keyword Agent: how it works and how to switch it on

Spec: `docs/keyword-agent.md`. Impact check: `docs/KEYWORD_AGENT_STEP0.md`.

## What it does

1. **Your business** (setup): reads up to 12 public pages of the site (SSRF-safe
   `safeFetch`), Haiku fills in business type, services, audience, country and
   language; the user confirms or edits. Can be filled in by hand.
2. **Striking distance**: Search Console searches at positions 8 to 20, from
   `gsc_query_page` (synced daily). No AI, no cost.
3. **Keyword report** (deep analysis): Haiku seeds, Google autocomplete (cached 30
   days, rate limited, optional), Sonnet web research (max 5 searches), Sonnet
   scoring into the top 20. Search Console figures are joined in code and never
   sent to the model.
4. **Post writer**: one Sonnet call per draft. Code sanitises the HTML, keeps only
   links to the site's own pages, builds the slug and JSON-LD, and refuses
   truncated or thin drafts. Editor: Tiptap, version-checked saves, copy as HTML
   or Markdown, download .html or .md, copy schema, one free rewrite.

## Where the code is

| Part | Path |
|---|---|
| Agent logic, prompts, pricing, quotas, HTML safety | `packages/keyword-agent` |
| Worker job runner and retention | `apps/worker/src/keyword-agent.ts` |
| Queue | `ai-agent` (`AI_AGENT_QUEUE`), retryLimit 0, 20 s polling |
| Quota and job start | `apps/web/src/lib/keywords/jobs.ts` |
| Pages | `/dashboard/keywords`, `/dashboard/keywords/[websiteId]`, `.../posts/[postId]` |
| API | `/api/keywords/...`, `/api/admin/ai-rollout` |
| Public page | `/ai-keyword-agent` (404 until rollout is "everyone") |

## Safety rails

- **Kill switch**: All Usage, AI controls, Pause all AI. Takes effect on the next call.
- **Spend cap**: `AI_AGENT_MONTHLY_BUDGET_USD`, default 0 (nothing can spend), plus a
  per-job ceiling (setup $0.02, report $0.60, post $0.40).
- **Ledger**: every call in `ai_usage` (feature `keyword_agent`, with the plan tier).
- **Quotas** (`packages/keyword-agent/src/limits.ts`), refilled monthly on the billing
  renewal date (signup date on Free): Free 1 report and 1 post, Starter 2 and 3,
  Pro 8 and 10, Agency 30 and 40, trial posts capped at 3. Reserved under a lock
  before queueing, refunded if the job fails, and kept when a site or post is
  deleted. Paused when billing is on hold.
- **Rollout**: All Usage, AI controls: Admins only, Beta list, or Everyone.

## Switching it on

1. **Worker** (`infra/worker/worker.env` on the server): add
   `ANTHROPIC_API_KEY=...` and `AI_AGENT_MONTHLY_BUDGET_USD=5` (or your cap), then
   `docker compose -f infra/worker/compose.yml up -d`.
2. **Netlify** (Project configuration, Environment variables): add the same
   `AI_AGENT_MONTHLY_BUDGET_USD`. Redeploy (Actions, deploy-web, Run workflow, type
   `deploy`).
3. Try it yourself as an admin on one site: setup, a report, a post.
4. Rollout to **Beta list** with a few verified customer emails, watch All Usage.
5. Rollout to **Everyone**: the sidebar shows AI Keywords to every user and the
   public `/ai-keyword-agent` page goes live.

## Data kept, and for how long

| Table | Kept |
|---|---|
| `agent_step` (debug log, redacted) | 7 days |
| `autocomplete_cache` (public data) | 30 days |
| `keyword_report` + `keyword_opportunity` | 60 days |
| `ai_job` | 90 days after it finished |
| `content_profile`, `content_post` | until the website is deleted |
| `ai_quota_use`, `ai_usage` | kept (cost and quota records) |

## Not built yet (later phases)

- WordPress draft publishing and auto-monitoring of published posts.
- The headless-browser fallback for sites plain fetching cannot read.
- Content gaps and topic clusters as separate tools (clusters appear in reports).
- .docx download, weekly opportunity emails, celebration emails, Android view.
- One free account per domain.
