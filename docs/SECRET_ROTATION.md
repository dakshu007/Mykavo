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

Two things about that tick box, both learned the hard way:

- **It is one-way.** Netlify will not let you un-tick it. To undo it you must
  delete the variable and create it again, which means having the value to
  hand before you start.
- **Netlify hides a secret-flagged value from its own API**, returning a mask
  like `****************mw0=`. This repo builds with `netlify deploy --build`
  from GitHub Actions, so the build reads env through that API and sees the
  mask, not the value. `apps/web/src/lib/env.ts` now accepts a mask during
  the build and enforces every rule at runtime, where Netlify injects the
  real values - so flagging a secret no longer breaks the deploy. Before that
  fix it did, and the only escape anyone found was to un-flag the variable,
  which is how a live database password ended up back in plain text.

---

## 1. BETTER_AUTH_SECRET - do this first

**What it is:** the key that signs every login session. Anyone holding it can
forge a session as any user, including you. It is the sharpest of the set.

**Consequence: everyone is logged out AND every two-factor enrolment is
destroyed.** Not just invalidated - unrecoverable.

This is the part that is easy to miss, because nothing in Better Auth's
config hints at it. `BETTER_AUTH_SECRET` is not only a signing key; the
two-factor plugin uses it as an **encryption key** for what it stores:

```js
// enrolment  - better-auth/plugins/two-factor/index.mjs
const encryptedSecret = await symmetricEncrypt({ key: ctx.context.secretConfig, data: secret });
// verifying  - better-auth/plugins/two-factor/totp/index.mjs
const secret = await symmetricDecrypt({ key: ctx.context.secretConfig, data: twoFactor.secret });
```

`secretConfig` is this variable. Change it and every stored TOTP secret
becomes undecryptable, so no authenticator code will ever match again.
**Backup codes do not help** - `generateBackupCodes(ctx.context.secretConfig, …)`
encrypts those with the same key. Affected users see only *"That code didn't
work. Try again."* and have no way through.

This is the same hazard as `GSC_TOKEN_KEY` in §5, which destroys stored
Google OAuth tokens for exactly the same reason. If a secret is used to
*encrypt* stored data rather than merely to sign it, rotating it is a
destructive migration, not a swap.

### Before you rotate

1. Find who is enrolled:

   ```sql
   SELECT email FROM "user" WHERE "twoFactorEnabled" = true;
   ```

2. Tell them first. After the rotation they sign in with email and password
   only, then re-add two-factor from Settings, deleting the stale MyKavo
   entry in their authenticator app. Until they do, those accounts are
   password-only.

### Rotate

```bash
openssl rand -base64 48
```

Netlify → Environment variables → `BETTER_AUTH_SECRET` → replace the value,
tick **Contains secret values**, save. Then redeploy (see the end).

Not needed on the worker - it does not authenticate users.

### Immediately after the deploy

Clear the now-unreadable enrolments, or nobody in that list can log in:

```sql
BEGIN;
DELETE FROM "twoFactor"
  WHERE "userId" IN (SELECT id FROM "user" WHERE "twoFactorEnabled" = true);
UPDATE "user" SET "twoFactorEnabled" = false WHERE "twoFactorEnabled" = true;
COMMIT;
```

Then re-enrol. Do not try to rescue the old enrolments by restoring the
previous secret: the secret you are rotating is the exposed one, and putting
it back to save a re-enrolment trades account-takeover risk for a two-minute
inconvenience.

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

**Choose an alphanumeric password.** Letters and digits only, 20+ characters.
Anything in `@ : / ? # [ ] %` has to be percent-encoded inside a connection
URL, and an unencoded `@` splits the URL at the wrong place - which surfaces
as a baffling hostname error rather than anything about passwords. Do **not**
use Supabase's *Generate* button: it favours punctuation, which is the trap.

**Stage both sides first, flip last.** Nothing breaks until step 3, which
keeps the outage to the length of one deploy instead of however long the
edits take.

1. Update Netlify's `DATABASE_URL` with the new password, keeping the `6543`
   host and the `pgbouncer=true&connection_limit=1` suffix. Tick **Contains
   secret values**.
2. Update the worker's `worker.env`, keeping the `5432` host and
   `?connection_limit=5`. Change **only the password** - the two URLs are not
   interchangeable. This swaps it in place without touching host or params:

   ```bash
   read -rs -p "New DB password: " NEWPW && echo
   sed -i "s|\(^DATABASE_URL=postgresql://[^:]*:\)[^@]*\(@.*\)|\1$NEWPW\2|" \
     infra/worker/worker.env
   unset NEWPW
   ```

   Do not recreate the container yet.
3. Supabase → Project Settings → Database → **Reset database password**.
   *Downtime starts here.*
4. Immediately: recreate the worker container, and trigger the web deploy.
5. Verify: load the dashboard, then `docker logs --tail 20 mykavo-worker`.

### If it comes back "Can't reach database server"

Prisma reports a **rejected password** as `P1001 Can't reach database server`,
which reads like a network fault and sends you checking DNS and firewalls.
It is usually the password. Get the real error from Postgres instead:

```bash
read -rs -p "DB password: " PGPASSWORD && export PGPASSWORD && echo
psql -h aws-0-us-east-1.pooler.supabase.com -p 5432 \
  -U postgres.<project-ref> -d postgres -c "select 1"
unset PGPASSWORD
```

| psql says | Meaning |
|---|---|
| `select 1` returns a row | credentials fine - the fault is in how the app builds its URL |
| `password authentication failed` | the reset did not save what you think it did; set it again |
| `Tenant or user not found` | wrong username for the pooler, or the project is paused |
| hangs, then times out | the project is down or restarting |

`nc -vz <pooler host> 5432` succeeding proves nothing on its own - that load
balancer fronts every Supabase project in the region, so it answers whether
or not yours is reachable.

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

## 7. Firebase service account key (FCM) - added 2026-09-14

The `mykavo-e0f9c` service account JSON was pasted into a chat transcript.

**What it grants:** Firebase Admin on that project - sending push notifications
to every registered MyKavo device, and read/write on the
`mykavo-e0f9c.firebasestorage.app` bucket. Not the database, not auth, not
Stripe.

**Consequence of rotating:** none right now. The key has not been uploaded to
Expo yet, so nothing is using it. Rotate before wiring it up, not after.

1. Firebase Console → gear → **Project settings → Service accounts**
2. **Manage service account permissions** (opens Google Cloud IAM) →
   **Service Accounts** → `firebase-adminsdk-fbsvc@mykavo-e0f9c.iam.gserviceaccount.com`
   → **Keys** tab
3. Delete the key ending **`...222a0e629`** (created 2026-09-14)
4. **Add key → Create new key → JSON**
5. Upload that new file straight to Expo (see `apps/mobile/RELEASING.md` §3a).
   It must not pass through a chat, a commit, or an issue on the way.
6. Delete the download once Expo has it

Do not skip step 3 because the key "was never used". A key that exists can be
used; deleting it is the only thing that makes that false.

---

## 8. Redeploy, then verify

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
