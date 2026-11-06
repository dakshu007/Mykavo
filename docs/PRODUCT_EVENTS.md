# Product events (Mixpanel)

MyKavo sends ten product events to Mixpanel from the server. Page views and
marketing traffic stay in Google Analytics; these events cover what happens
inside the product, where ad blockers cannot drop them.

## Setup

| Variable | Where | Notes |
|---|---|---|
| `MIXPANEL_TOKEN` | Netlify (web) and the worker's `worker.env` | Project token from Mixpanel > Project settings. Unset = nothing is sent. |
| `MIXPANEL_API_HOST` | both, optional | Only for EU data residency: `https://api-eu.mixpanel.com`. |

Changing either needs a new deploy (Netlify) or a container restart (worker).

## How it works

- Sender: `packages/shared/src/product-events.ts` posts to Mixpanel's `/track`
  API with `fetch`. 3 second timeout, never throws.
- Context: `packages/database/src/event-context.ts` adds `plan_at_time`,
  `trial_status`, `acquisition_source` and `is_internal` to every event.
- `distinct_id` is the workspace owner's user id: one Mixpanel person per account.
- Web events run in `after()` (next/server), after the response is sent.
- Nothing personal is sent: no emails, names or website URLs. Internal
  accounts (`is_internal = true`) are flagged so they can be filtered out.
- `$insert_id` plus a stable `time` keeps count-once events from double
  counting when a job or webhook is retried.

## Events

| Event | Sent from | When | Key properties |
|---|---|---|---|
| `baseline_funnel_started` | worker `scan-website.ts` | A baseline scan starts | `platform_setup`, `websites_count`, `pages_count` |
| `baseline_funnel_completed` | worker `scan-website.ts` | A baseline scan saves pages | `time_to_baseline_hours` (from signup), `hours_since_website_added`, `pages_count_per_website` |
| `monitoring_activated` | worker `scan-website.ts` | Same moment, unless the website is paused | `scan_frequency`, `websites_count` |
| `first_change_detected` | worker `scan-website.ts` | The workspace's first ever change events | `time_to_first_change_hours`, `alert_severity`, `change_category`, `integration_type` |
| `trial_ended` | worker `plan-sweep.ts` | The trial sweep closes a trial | `trial_end_reason` (expired, upgraded), `plan_after`, websites, pages, integrations |
| `change_viewed` | web change detail page | Every view | `alert_severity`, `change_status`, `time_since_detected_minutes`, `viewer_role` |
| `change_reviewed` | web change routes (single, bulk, update baseline) | Review, approve, ignore, resolve | `review_decision`, `surface`, `bulk_count`, `ai_explanation_viewed` |
| `change_approved` | same routes | Approve or approve as new baseline | `time_to_approval_minutes`, `updates_baseline` |
| `ai_explanation_viewed` | web `api/changes/[id]/explain` | An explanation is returned | `alert_severity`, `time_from_detected_minutes` |
| `trial_to_paid_conversion` | web Dodo webhook | A workspace's first payment only | `converted_plan`, `billing_interval`, `had_trial`, `trial_status_at_upgrade`, `days_since_signup` |

Shared properties on every event: `plan_at_time` (free, starter, pro, agency),
`trial_status` (in_trial, trial_ended, never_trialed, paid),
`acquisition_source` (google_organic, ai_assistant, wordpress,
chrome_web_store, linkedin, direct, referral, ...), `is_internal`, `source` (server).
