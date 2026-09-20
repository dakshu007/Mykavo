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
