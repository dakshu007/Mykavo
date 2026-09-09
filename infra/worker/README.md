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
