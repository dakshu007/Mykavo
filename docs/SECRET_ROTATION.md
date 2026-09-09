# Rotating MyKavo's secrets

Several production secrets were exposed - pasted into a chat transcript, and
some stored in Netlify as non-secret values, meaning they display in plain
text in the UI and API and can surface in build logs. They all need
replacing.

**The order matters.** Two of these break something the moment they change,
and one of them is not an API key at all.

## Before you start

Have open: the Netlify environment variables page, the Supabase dashboard,
and an SSH session to the worker (`ubuntu@<server ip>`). Do these one at a
time and verify each before moving on.

Every value you add to Netlify from now on: tick **"Contains secret values"**.
That is the setting that was missing.

---

## 1. BETTER_AUTH_SECRET - do this first

**What it is:** the key that signs every login session. Anyone holding it can
forge a session as any user, including you. It is the sharpest of the set.

**Consequence:** everyone is logged out. That is all.

```bash
openssl rand -base64 32
```

Netlify → Environment variables → `BETTER_AUTH_SECRET` → replace the value,
tick **Contains secret values**, save. Then redeploy (see the end).

Not needed on the worker - it does not authenticate users.

---

## 2. RESEND_API_KEY

**Consequence:** none, if you replace it in both places promptly. Email stops
between revoking the old key and saving the new one.

1. Resend → API Keys → create a new key, copy it
2. Netlify: replace `RESEND_API_KEY` (tick **Contains secret values**)
3. Worker: `nano ~/mykavo/infra/worker/worker.env`, replace the line, then
   `docker compose -f ~/mykavo/infra/worker/compose.yml up -d --force-recreate`
4. Resend: revoke the old key **only after** both are updated

---

## 3. R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY

**Consequence:** screenshots and blog images stop loading until both places
have the new pair. Create the new token before deleting the old one, so
there is no gap.

1. Cloudflare → R2 → Manage API tokens → create a token scoped to the
   `mykavo` bucket with **Object Read & Write**
2. Netlify: replace both values (tick **Contains secret values** on each)
3. Worker: update `worker.env`, recreate the container as above
4. Cloudflare: delete the old token once images still load

---

## 4. DATABASE_URL password - the risky one

**Consequence:** the moment the password changes, anything still holding the
old one is locked out. The site goes down if Netlify is not updated in the
same few minutes.

Note the two URLs differ and must stay that way:

| Where | Pooler | Port | Suffix |
|---|---|---|---|
| Netlify (web) | transaction | `6543` | `?pgbouncer=true&connection_limit=1` |
| Worker | session | `5432` | `?connection_limit=5` |

1. Supabase → Project Settings → Database → **Reset database password**
2. Immediately update Netlify's `DATABASE_URL` with the new password,
   keeping the `6543` host and the `pgbouncer=true&connection_limit=1`
   suffix. Tick **Contains secret values**.
3. Immediately update the worker's `worker.env`, keeping the `5432` host and
   `?connection_limit=5`, then recreate the container
4. Redeploy Netlify
5. Verify: load the dashboard, then `docker logs --tail 20 mykavo-worker`

If the password contains characters like `@`, `#` or `/`, they must be
percent-encoded in the URL. Simplest fix: let Supabase generate the password
and copy the connection string it gives you rather than assembling one.

---

## 5. GSC_TOKEN_KEY - read this before touching it

**This is not an API key.** It is the AES-256-GCM key that encrypts stored
Google OAuth tokens (`packages/shared/src/gsc.ts`). Change it and every
stored token becomes undecryptable - Search Console silently stops syncing
and every connected property must be reconnected by hand.

It was exposed, so it does need replacing. Do it now, while the number of
connected properties is small. The same reasoning as re-approving baselines:
this cost only grows.

1. `openssl rand -hex 32` (must be 64 hex characters)
2. Update in Netlify **and** the worker env - they must match exactly, or
   tokens written by one cannot be read by the other
3. In the dashboard, disconnect and reconnect each Search Console property

---

## 6. NETLIFY_AUTH_TOKEN

Netlify → User settings → Applications → Personal access tokens. Create a
new one, update the `NETLIFY_AUTH_TOKEN` **repository secret** in GitHub
(Settings → Secrets and variables → Actions), then revoke the old token.

The deploy workflow uses it; nothing else does.

---

## 7. Redeploy, then verify

Netlify environment changes only reach the running functions after a deploy.

GitHub → Actions → **deploy-web** → Run workflow → type `deploy`.

Then check, in order:

- [ ] mykavo.app loads and you can sign in (proves auth + database)
- [ ] a screenshot renders on a change detail page (proves R2)
- [ ] `docker logs --tail 20 mykavo-worker` shows no errors (proves worker DB)
- [ ] run a scan and receive the alert email (proves Resend)
- [ ] Search Console still syncs, or has been reconnected (proves GSC key)

## Afterwards

Do not paste secrets into a chat, an issue, or a commit. To move one between
machines, use `scp` or read it in place:

```bash
grep SOME_KEY ~/mykavo/infra/worker/worker.env
```
