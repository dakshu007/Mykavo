# The first run

> One loop, then depth. Not eight entry points on day one.

MyKavo does one job: approve a known-good baseline of a website, then hear
about it when something important changes. Everything else — the technical
audit, Search Console correlation, the analyser, agency reports, status pages —
is **depth on that job**, and reads completely differently once somebody
already understands the product than it does as a menu on day one.

This document records the shape that follows from that, because every part of
it is easy to undo by accident.

## The loop

```
add a website → pick its pages → baseline captured → monitoring is live
                                                          ↓
                                            something changes → alert
                                                          ↓
                                    expected? approve the new baseline
                                    unexpected? fix the website
```

The first four steps are the only ones a new account can complete by itself.
The alert arrives when the world changes, not when the user clicks something.

## What this means in the code

### 1. Adding a website starts the baseline

`apps/web/src/app/dashboard/websites/new/add-website-wizard.tsx`

The wizard saves the page selection **and starts the baseline scan**, landing
the user on the live scan. It must not save pages and stop: that is where the
loop used to break, one click after signup, leaving every new account to work
out on its own that monitoring had not actually begun.

The scan route decides the trigger type itself — a website with no finished
scan gets `BASELINE`, which is exempt from the manual-scan plan gate — so no
decision about who may scan lives in the wizard.

If the scan cannot be started the pages are **already saved**, so the failure
must never look like a failed save and must never dead-end: the fallback is
the website page, which offers "Run baseline scan".

### 2. The getting-started checklist is the loop, and nothing else

`apps/web/src/lib/onboarding.ts`

Required: add a website → select pages → capture a baseline. Optional, and
clearly demoted: an extra alert channel, inviting a teammate.

"Get alerts beyond email" used to be **required**, which meant an account with
monitoring genuinely running was still told it was mid-setup until it had wired
up Slack, Discord or a webhook. Email alerts already work. A third-party
integration must never gate the product's own setup.

There is deliberately **no "approve your baseline" step**, tempting as it
reads. The first baseline is created *and* approved by the system
(`packages/database/src/baseline.ts` — `approvedByUserId` null, `approvedAt`
set); a human approves something only once a later scan finds a change. A step
nobody can complete on day one would leave the card up forever.

`apps/web/src/lib/onboarding.test.ts` fails six ways if an extra step is ever
made required again.

### 3. The navigation is grouped, and the analysis group is gated

`apps/web/src/lib/dashboard-nav.ts` — one definition, read by both the sidebar
and the mobile pill row, which were previously separate hand-maintained lists.

| Group | Items | Shown |
|---|---|---|
| (unlabelled) | Overview, Websites, Changes, Scan History | always |
| Deeper analysis | Site Audit, Search Console, MyKavo Analyser | once monitoring is live |
| Account | Notifications, Billing, Settings | always |
| Admin | Blog / Users / All Usage | by allowlist |

Ten items at equal weight, on every screen, reads as ten products. The gate is
not a judgement about clutter: before a baseline exists each of those three
pages renders its own "add a website first" empty state, so on day one they are
dead ends in the navigation.

**Nothing is removed.** The routes stay reachable, the command palette still
finds everything, and the group appears for good the moment the first baseline
lands. `isMonitoringLive()` (`apps/web/src/lib/monitoring-live.ts`) is the
single definition of "live", shared with the checklist so the sidebar and the
card can never disagree about whether setup is finished.

Account access is never gated. Billing and Settings must be reachable from the
first second of the first session.

## What this does NOT mean

**The marketing site keeps its breadth.** Agencies buy breadth: someone
comparing tools needs to see that the audit and the Search Console work exist,
and those pages are the organic acquisition channel (spec §48). The loop-first
rule applies to the **first screen** and the **first run**, not to the site.

Concretely, on the homepage:

- The hero states the loop. It used to enumerate seven change categories in one
  breath, which is the fastest way to read as seven products.
- `how-it-works` comes **before** `categories`, so the loop is explained before
  the breadth is listed.
- The categories section keeps every one of them, under a heading that frames
  them correctly: *eight kinds of change, one monitoring layer*.
- The signal ticker sits below the categories rather than directly under the
  hero, where it was a breadth signal in the breadth-first slot.
- Page metadata, `FEATURE_LIST` and the keyword landing pages are unchanged —
  the breadth stays in full wherever a search engine or an answer engine reads
  it.

**Inside the app, group and collapse — never hard-hide.** A returning user who
used a tool last week must not have to hunt for it.

## Origin

This came from unsolicited feedback from another founder working on website QA,
who pointed out that the eight-capabilities problem was an onboarding problem
rather than a copy problem: fix only the headline and the same confusion shows
up two clicks later, when the app still opens on eight equal entry points.

That was correct, and checking it against the code turned up the broken loop in
§1 — a real funnel bug, not a matter of emphasis, that every account which ever
signed up had walked into.
