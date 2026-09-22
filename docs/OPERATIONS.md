# Operations

> **Migrations are applied BY HAND, before the web deploy** (see README).
> Nothing in the build pipeline runs `prisma migrate deploy`. Two migrations
> from 2026-09-20 are outstanding unless you have already applied them:
> `20260920100000_pending_artifact_deletion` and
> `20260920110000_email_alerts_opt_in`. Neither is required for correctness -
> the code degrades safely without them - but until the first one is applied,
> deleted websites' storage is not actually reclaimed.
>
> ```bash
> cd packages/database && DATABASE_URL=<session-pooler-url> pnpm exec prisma migrate deploy
> ```
>
> Then re-run `enable-rls.ts`: `pending_artifact_deletion` is a new table.

Runbook notes for things that are configured or run by hand rather than on a
schedule. Scheduled work (scans, retention, health, reports) lives in the
worker and needs nothing from you.

---

## When the worker loses the database

The worker emails the operators if it cannot reach Postgres. This exists
because it has twice run for hours unable to connect, and both times it
surfaced only because somebody went looking: while it is true there are no
scans, no uptime checks, no alerts and no reports, and **the dashboard looks
entirely normal**, because the dashboard shows what is in the database and the
database simply stops changing.

**Setup.** Set `ALERT_EMAILS` (comma-separated) in the worker's `worker.env`,
or rely on `ADMIN_EMAILS`. With neither set the alert is disabled, and the
worker logs an error saying so at boot rather than starting up quietly.

**Behaviour.** A probe runs every minute, starting immediately at boot so a
worker that starts with bad credentials reports itself rather than waiting out
the first interval.

| Situation | What happens |
|---|---|
| Unreachable under 5 minutes | nothing - restarts and failovers recover on their own |
| Unreachable 5 minutes or more | one email, carrying the underlying error |
| Still unreachable | one reminder every 6 hours, subject marked `STILL` |
| Reachable again | one email with the total outage duration |
| A query fails for a non-connectivity reason | nothing - a constraint violation is not an outage |

**Why it is a plain timer, not a pg-boss cron.** Every other recurring job in
the worker is a pg-boss schedule, and pg-boss fetches its jobs from Postgres.
In this exact failure that fetch is what is broken, so a cron-based check
would be silent precisely when it matters. The decision logic lives in
`packages/shared/src/db-watch.ts` where CI tests it; `apps/worker/src/db-watch.ts`
only probes, sends and logs.

**After an outage.** Queued work resumes by itself. Scans and audits whose
pg-boss jobs died mid-flight stay `QUEUED` until the scheduler's recovery
sweep fails them - 60 minutes for scans, 45 for audits - and then need running
again. If you want them cleared sooner, the sweep's own statements are safe to
run by hand against the `scan` and `site_audit` tables.

---

## New-signup alerts

The operator gets a push notification the first time somebody creates a MyKavo
account, and both `/dashboard/users` on the web and **Settings → Admin → Users**
in the Android app list who has joined.

**Signups only, never logins.** A login alert would fire several times a day
for returning customers and be muted within a week, at which point it reports
nothing. One notification per person, ever, is a signal worth reading.

**Setup.** `ADMIN_EMAILS` in the worker's `worker.env` decides who is an
operator - the same allowlist the web app uses, and the worker logs a warning
rather than staying silent if it is unset. The push lands on any device where
an admin has signed in to the mobile app; with none registered the worker says
so in the log, since "configured but nowhere to land" and "working" otherwise
look identical.

**Path.** Signup hook (`apps/web/src/lib/auth.ts`) enqueues to pg-boss; the
worker sends. Never sent from the signup request itself: that request creates
the account, and an Expo round trip must not be able to slow it down or fail
it. The enqueue swallows its own errors for the same reason.

**What the notification says.** The name and a masked address - `d******@gmail.com`.
A push body shows on a lock screen before anyone unlocks the phone, so the
full address stays out of it; the admin page and the email copy use it in full.
An admin's own signup is skipped.

**Signup names are checked**, because accounts were arriving named
`------------------`. The rule is deliberately NOT "alphabetic characters
only": MyKavo's market is global, and that rule turns away Jose with an
accent, Jean-Luc, O'Brien and every non-Latin script there is. Rejecting a
paying customer over an accent is a worse outcome than a junk row in an admin
list. Instead a name must have at least two letters in any script, letters
must be at least half of the non-space characters, and it must not contain a
URL. See `packages/shared/src/person-name.ts`.

Rows created before that shipped keep whatever was stored, so the list falls
back to the address handle rather than printing the junk.

**Users lives on its own page** (`/dashboard/users`), not beside All Usage.
They answer different questions - "is anybody using it" versus "what is this
costing" - and sharing a screen made the first easy to miss under the second.

**Tapping the notification** opens the app's Users screen, which is where the
notification's obvious next question - who else joined, and did any of them
activate - is answered. An APK older than that screen (anything before the
build that added it) lands on expo-router's unmatched route instead; these
pushes only reach platform admins, who are the people who update the app.

**On the phone** the screen is reached from Settings rather than the tab bar:
at 48px a tab the floating bar stops fitting a 360dp phone past six, and Users
is a screen you open when a notification arrives, not one you check constantly.
It reads `/api/mobile/users`, which is gated by the same `ADMIN_EMAILS`
allowlist and answers **404** rather than 403 for everyone else - whether this
installation has an operator view is not something a customer needs to learn.

**The dashboard card** lists the 25 most recent users with how long ago they
joined and how many websites they have added. The website count is the point:
a signup that never added one is not a customer yet, and "12 signups, 3 of whom
added a website" is a different fact from "12 signups". There is deliberately
no signups table - `User.createdAt` already holds this, and a second copy would
start disagreeing with the first the day an account was deleted.

---

## The welcome email

Every new account gets one email, immediately after it is created:
*"Welcome to MyKavo - start monitoring your website."*

**Signup, never sign-in.** It fires from the same `user.create.after` hook as
the operator alert (`apps/web/src/lib/auth.ts`), so it reaches everyone once
whether they signed up with Google or with an email and password. A hook on
sign-in would resend it on every visit, which is how a welcome becomes a spam
report - and a spam report costs the sending domain's reputation for every
alert MyKavo sends afterwards.

**Its own queue.** `WELCOME_EMAIL_QUEUE`, separate from `ADMIN_SIGNUP_QUEUE`
even though both fire on the same event. The admin job returns early when
`ADMIN_EMAILS` is unset and skips an admin's own signup; folding the customer's
welcome into it would let those early returns swallow it silently.

**Sent exactly once.** The job de-duplicates on a `Notification` row for the
workspace with `channelType=EMAIL` and the welcome's subject. Only a `SENT` row
blocks a retry - `PENDING` or `FAILED` means the last attempt did not land and
should be tried again. That also means the welcome shows up wherever
notification history does, with no new column and no migration.

**It does not honour the email opt-in rule, on purpose.** That rule
(`apps/web/src/lib/notification-settings.ts`) governs recurring alerts about
websites, which nobody receives until they ask. This is a single transactional
message confirming an account somebody just created at the address they just
typed in - the same category as a receipt.

**It tells the reader alerts are off.** This is the part that matters
operationally. New workspaces are opt-in, so a new user can add a website,
watch the baseline finish, and then never hear anything - concluding the
product does not work. The welcome is the one message guaranteed to arrive
before that happens, so it says so and links to `/dashboard/notifications`.
The getting-started checklist's step is worded to match ("Choose where alerts
reach you"), rather than the old "Get alerts beyond email", which implied email
was already working.

**If nobody is getting it**, check in this order:

1. `RESEND_API_KEY` in the worker's `worker.env` - without it `sendEmail` falls
   back to the `noop` provider in production and reports success.
2. `EMAIL_FROM` - Resend's sandbox sender delivers only to the Resend account
   owner and silently drops everything else.
3. `APP_URL` - wrong value means the links in the email point at the wrong host.
4. `pgboss.job` for the `welcome-email` queue: rows in `failed` carry the
   provider error in their output.

---

## Lead forms: demo, guest posts, partner applications

The Book a Demo (`/demo`), Write for Us (`/write-for-us`) and Partner Program
(`/partners/agency`, `/partners/tech`) forms all POST to `/api/leads`, which
appends each submission to a Google Sheet through an Apps Script web app - the
same pattern as the signup export, so the sheet stays private to its owner.

**Setup.** Set `LEAD_SHEET_WEBHOOK_URL` to the Apps Script deployment URL.

Unset, the forms still work and nothing is lost: every submission is written
to the application log first, before the network call, precisely so that a
missing or broken webhook costs you a copy-paste rather than a lead. This is
the one difference from the signup export, where Postgres is already the
source of truth.

**Payload.** One JSON object per submission:

```json
{ "kind": "...", "name": "...", "email": "...", "company": "...",
  "website": "...", "message": "...", "details": { }, "submittedAt": "..." }
```

`kind` is one of `demo`, `guest-post`, `partner-agency`, `partner-tech` - route
each to its own tab. `details` is free-form and differs per form: team size and
platforms for agencies, working title for guest posts, product category for
technology partners.

**Abuse handling** is already in the route: a honeypot field, five submissions
per IP per hour, and hard length caps on every field. Nothing to configure.

---

## Backfilling oversized screenshots

Stored screenshots are capped at 150KB, but that cap only binds images written
after it shipped. Objects stored under the earlier, looser rules - some of them
several megabytes - stay exactly as they are until their snapshot ages out of
the retention window months later.

**This now happens automatically.** The nightly retention sweep inspects 200
of the oldest screenshot objects and shrinks any that are over budget, so the
backlog clears over weeks with no manual step. It is deliberately a small
batch: the work rewrites content-addressed objects and repoints database
rows, which is fine unattended two hundred at a time and is not fine across
the whole bucket at once.

Two environment variables control it:

- `SHRINK_SCREENSHOTS=0` turns it off without a deploy.
- `SHRINK_SCREENSHOTS_BATCH=N` changes how many are inspected per night.

To finish the backlog sooner, with a dry run first and somebody watching:

```bash
ARTIFACT_STORE=r2 R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… \
DATABASE_URL=… pnpm --dir apps/worker exec tsx src/scripts/shrink-screenshots.ts
```

Dry run by default: it prints every oversized object, what it would shrink to,
and the total saving. Add `--apply` to write, and `--limit=N` to work through
the bucket in stages.

Safe to interrupt and re-run. Screenshot keys are content-addressed, so the
script uploads under the new hash, repoints the snapshot rows, and only then
deletes the old object - interrupted, it wastes one object or leaves one
orphan for the retention sweep, rather than leaving rows pointing at an image
that no longer exists.

---

## Reclaiming storage from deleted websites

This one is automatic and needs no intervention; it is documented because the
two-stage design is surprising if you meet it in the logs.

Deleting a website reads its storage keys **before** the database cascade,
parks them in `pending_artifact_deletion`, and enqueues an `artifact-purge`
job. The worker drains that table in batches of 500. The nightly retention
sweep drains it again, so a queue outage delays the reclaim by hours rather
than losing it.

Screenshot keys are reference-checked after the cascade, because a
content-addressed object can be shared by several snapshots across a
workspace. To see what is outstanding:

```sql
SELECT count(*), sum((attempts > 0)::int) AS failing FROM pending_artifact_deletion;
```

Rows with `attempts >= 5` are skipped by the drain - they are almost always
keys whose object is already gone.
