# Running the scan worker in the cloud

The worker is the whole product: it runs every scan, comparison, alert email,
site audit, Search Console sync and scheduled report. Until now it ran as a
launchd agent on the owner's Mac, which meant a closed lid stopped monitoring
**for every customer at once** — and a new user's first baseline scan, the
moment they decide whether MyKavo works, would simply hang.

This directory moves it onto a server. Nothing about the web app changes:
mykavo.app already runs on Netlify's global CDN and is reachable worldwide.

## What you need

A Linux server with **2GB+ RAM** and Docker. Options that fit:

| Host | Cost | Notes |
|---|---|---|
| Oracle Cloud Always Free | $0 | 2 ARM cores / 12GB. Free indefinitely, but the free ARM shape is heavily oversubscribed — "out of capacity" is common. Card required for identity check only. |
| Hetzner CX22 | ~€3.79/mo | 2 vCPU / 4GB. No capacity lottery. |
| Any VPS | varies | Anything with 2GB+ and Docker works. |

No inbound ports are needed. The worker polls the database for jobs, so the
server exposes nothing to the internet — one less thing to secure.

## 1. Create the server

On Oracle: sign up, pick your home region carefully (it cannot be changed
later), then **Compute → Instances → Create**. Choose the
**Ampere / VM.Standard.A1.Flex** shape, set it to 2 OCPUs and 12GB, and pick
**Canonical Ubuntu 24.04**. Save the SSH key it offers — without it you cannot
get back in.

If it says *Out of capacity*, that is Oracle's shortage, not a mistake on your
part. Try a different availability domain, or retry later; capacity frees up
irregularly.

## 2. Bootstrap it

SSH in, then:

```bash
curl -fsSL https://raw.githubusercontent.com/dakshu007/Mykavo/main/infra/worker/setup.sh | bash
```

It installs Docker, clones the repo, and stops to ask for the environment
file.

## 3. Give it the secrets

```bash
nano ~/mykavo/infra/worker/worker.env
```

Paste the contents of `apps/worker/.env.production` from the Mac
(`~/.fluxen/app/apps/worker/.env.production`).

Two things to get right:

- **Strip surrounding quotes.** `docker compose` passes values literally, so
  `EMAIL_FROM="MyKavo <x@y>"` would include the quote characters.
- **Set `?connection_limit=5` on `DATABASE_URL` while both workers run.**
  Supabase's session pooler allows ~15 connections. Two workers at 10 each
  exhausts it, which is exactly the failure that made scans silently report
  "no changes" on 2026-09-08. Raise it back to 10 once the Mac is retired.

Then re-run the setup command from step 2. First build takes 5–10 minutes.

## 4. Make it self-updating

```bash
crontab -e
```

Add:

```
*/5 * * * * /home/ubuntu/mykavo/infra/worker/update.sh >> /home/ubuntu/mykavo-update.log 2>&1
```

Now a push to `main` reaches the worker within five minutes, the same way
Netlify already updates the website. No more manual copying.

## 5. Cut over

Run both workers for a day. This is safe: pg-boss hands each queued job to
exactly one worker, so they share the load rather than duplicating it.

Verify the cloud worker is really doing the work:

```bash
docker logs --tail 50 mykavo-worker      # expect "worker started", then sweeps
```

Trigger a manual scan from the dashboard and confirm it appears in that log.
When you're satisfied, stop the Mac worker:

```bash
launchctl bootout gui/501/com.fluxen.worker-prod     # on the Mac
```

Then raise the server's `connection_limit` back to 10 and
`docker compose -f infra/worker/compose.yml up -d`.

## Expect one wave of visual changes after cutover

**This will happen and it is not a bug.** Existing baseline screenshots were
captured by Chromium on macOS. The server renders with Linux fonts, so text
sits fractionally differently and nearly every page will report a visual
change on its first cloud scan.

Do the migration *now*, while the customer count is near zero. Approve the new
screenshots once (Scan detail → **Approve scan**) and they become the
baselines. Left until you have paying customers, this becomes a flood of false
alerts — the single fastest way to lose trust in a monitoring product
(CLAUDE.md §4.5).

Non-visual checks — SEO tags, links, scripts, availability, performance,
conversion elements — are unaffected: they compare values, not pixels.

## Hardening

Port 22 is reachable from the internet, which is normal for a cloud VM and
means the login prompt is under constant automated attack. Run once:

```bash
bash ~/mykavo/infra/worker/harden.sh
```

It installs fail2ban (jailing repeat offenders, with escalating bans),
pins sshd to keys-only with no root login, and enables unattended security
updates. **Keep your existing session open and confirm a new `ssh` login
works before closing it** - that is the safety net against any sshd change.

It deliberately does not restrict port 22 to one IP. Home addresses change,
and locking yourself out of the only host running the product is worse than
the risk. If you do want that restriction: Oracle console → Networking →
Virtual Cloud Networks → your VCN → Security Lists → edit the ingress rule
for port 22 to your address instead of `0.0.0.0/0`. The recovery path when
your IP changes is the instance's serial console (Instance → Console
connection), so set that up first.

Secrets: see `docs/SECRET_ROTATION.md`.

## Database backups

The worker backs up the database every night at 02:30 UTC
(`apps/worker/src/db-backup.ts`). Nothing to set up: it ships with the image
and uses the existing `DATABASE_URL` and R2 settings.

- **Sundays: full dump.** Every table in the `public` schema.
- **Other nights: core dump.** Every table, but without the rows of the three
  high-volume history tables (`page_link`, `page_script`, `health_check`).
  A full dump every night would use about half of Supabase's 5 GB monthly
  egress quota on its own.
- **Proven, not assumed.** Each dump is restored into a throwaway Postgres
  (unix socket only, deleted afterwards) and key tables' row counts are
  compared with the live database.
- **Off the server.** Sunday's full dump is also copied to R2 under
  `backups/db/` (last 8 weeks). The bucket is private, and no app route
  serves that prefix.
- **Kept on the server** in the `mykavo-data` Docker volume: core dumps for
  30 days, full dumps for 180 days. A few GB at most.
- **Failures email** `ALERT_EMAILS` (or `ADMIN_EMAILS`). Monitoring never
  depends on this job.

List the backups:

```bash
docker exec mykavo-worker ls -lh /data/backups/db
```

Restore one into a NEW empty Postgres 17 database (never straight over
production):

```bash
docker cp mykavo-worker:/data/backups/db/mykavo-YYYY-MM-DD-full.dump .
psql "$TARGET_URL" -c "drop schema public cascade"
pg_restore --no-owner --no-privileges --exit-on-error -d "$TARGET_URL" mykavo-YYYY-MM-DD-full.dump
```

For a core dump, restore the latest full dump's `page_link`, `page_script`
and `health_check` rows afterwards if you need the history:
`pg_restore --data-only -t page_link -t page_script -t health_check ...`.

## Troubleshooting

**Container exits immediately.** `docker logs mykavo-worker`. Usually a
malformed `worker.env` (stray quotes) or an unreachable `DATABASE_URL`.

**"Executable doesn't exist at /ms-playwright/..."** The `playwright` version
in `pnpm-lock.yaml` no longer matches the `FROM` tag in the Dockerfile. Bump
the tag to the same version.

**Chromium won't start / sandbox errors.** `seccomp.json` is missing or the
path is wrong. Do **not** work around it with `--no-sandbox`: scanned pages
are untrusted and this container holds database and R2 credentials
(`packages/scanner/src/lighthouse.ts` refuses it deliberately).

**Disk fills up.** `docker image prune -af` — `update.sh` does this after each
deploy, but old build layers accumulate if it hasn't run.
