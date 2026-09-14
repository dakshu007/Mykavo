# Releasing MyKavo for Android

Everything in the repo is ready. What remains needs your accounts, so it cannot
be done from CI or by an agent: a signing key that must only ever exist on your
machine, an Expo project id, and Firebase credentials.

**Do the sections in order.** §3 depends on §2 (there is no EAS project to
attach FCM credentials to until `eas init` has run), and §4 must happen before
the in-app toggle can register a device. Work through §1–§5 once; after that,
every release is just a workflow run.

---

## 1. Create your upload key (once, on your Mac)

**This key is the app's identity for its entire life.** Once real users install
a build signed with it, that key can never change without every one of them
uninstalling and reinstalling. Generate it on your machine; never paste it into
a chat, a file in the repo, or an issue.

```bash
keytool -genkeypair -v \
  -keystore ~/mykavo-upload.jks \
  -alias mykavo-upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Dakshesh Babu, OU=MyKavo, O=MyKavo, L=Chennai, ST=Tamil Nadu, C=IN"
```

It asks for a password twice (store password, then key password). **Use the same
one for both** and put it in your password manager — losing it is unrecoverable.

Back the file up somewhere durable that is not this repo and not only this
laptop. If `~/mykavo-upload.jks` is lost, you cannot ship another update to the
same listing; you would have to publish a brand-new app and lose your installs
and reviews.

> Google Play App Signing (on by default) gives you a safety net: Google holds
> the *app* signing key, and yours is only the *upload* key, which can be reset
> by support if lost. Leave it enabled. It does not make the backup optional.

Then produce the base64 for the GitHub secret:

```bash
base64 -i ~/mykavo-upload.jks | pbcopy   # now on your clipboard
```

---

## 2. Expo project id (do this BEFORE §3)

Expo issues push tokens per project, which is why the in-app toggle currently
refuses to turn on. §3 also needs this project to exist before it can attach
credentials to it.

```bash
cd apps/mobile
npx eas-cli login      # your Expo account (free tier is enough)
npx eas-cli init       # prints a project id like 8f3b1c4a-...-...
```

Copy the id. It is **not** a secret — it is a public identifier — so either
put it in the `EXPO_PROJECT_ID` GitHub secret (§5) or let `eas init` write
`extra.eas.projectId` into `app.json` and commit that. The secret wins if both
are present.

---

## 3. Firebase, so Android can actually deliver

Expo relays through FCM, and Android has no other push transport. Both are free
with no per-message charge and no message cap.

1. <https://console.firebase.google.com> → **Add project** (reuse one if you have it).
2. **Add app → Android**, package name **exactly** `app.mykavo.mobile`.
   A mismatch here produces tokens that silently never deliver.
3. Download **`google-services.json`**, then:
   ```bash
   base64 -i ~/Downloads/google-services.json | pbcopy
   ```
4. Firebase → **Project settings → Cloud Messaging**: confirm the
   **Firebase Cloud Messaging API (V1)** is enabled.
5. Firebase → **Project settings → Service accounts → Generate new private key**.
6. Hand that key to Expo so it can deliver on your behalf:
   ```bash
   cd apps/mobile
   npx eas-cli credentials      # Android → production → FCM V1 service account key
   ```

Step 6 is the one people skip. Without it Expo accepts your sends and has
nothing to hand FCM, so nothing arrives and no error appears in the app.

---

## 4. Run the push migration

Push devices live in a table that does not exist yet. Until this runs, turning
the toggle on fails server-side. Supabase → **SQL Editor**:

```sql
ALTER TYPE "NotificationChannelType" ADD VALUE IF NOT EXISTS 'PUSH';

CREATE TABLE IF NOT EXISTS "push_device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceName" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "disabledReason" TEXT,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "push_device_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_device_token_key" ON "push_device" ("token");
CREATE INDEX IF NOT EXISTS "push_device_userId_idx" ON "push_device" ("userId");
CREATE INDEX IF NOT EXISTS "push_device_enabled_idx" ON "push_device" ("enabled");

ALTER TABLE "push_device"
  ADD CONSTRAINT "push_device_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

(The same file is at
`packages/database/prisma/migrations/20260913100000_push_devices/migration.sql`.)

---

## 5. Add the GitHub secrets

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
| --- | --- |
| `ANDROID_RELEASE_KEYSTORE_B64` | base64 from §1 |
| `ANDROID_KEYSTORE_PASSWORD` | the store password from §1 |
| `ANDROID_KEY_ALIAS` | `mykavo-upload` |
| `ANDROID_KEY_PASSWORD` | the key password from §1 |
| `EXPO_PROJECT_ID` | the id from §2 |
| `GOOGLE_SERVICES_JSON_B64` | base64 from §3 |

Already present and still used: `RELEASE_TOKEN` (publishes the sideload APK to
the public download repo) and `ANDROID_DEBUG_KEYSTORE_B64` (the old sideload
key, used only while `ANDROID_RELEASE_KEYSTORE_B64` is absent).

The build is deliberately tolerant: with none of these it still produces a
sideload APK, warns loudly, and skips the AAB. **All four signing secrets or
none** — a partial set fails the build rather than silently falling back to the
debug key.

---

## 6. Build

**Actions → android-apk → Run workflow.** Takes about 25 minutes.

Artifacts on the run page:

- **`mykavo-android-apk`** — sideload build, for you and testers.
- **`mykavo-play-aab`** — the Play upload. Only built once §1 and §5 are done,
  because Play requires an App Bundle and rejects debug-signed uploads.

The run fails if a build that was supposed to be release-signed comes out on the
debug certificate, so a green run with an AAB means it really is signed with
your key. `versionCode` tracks the workflow run number, so it always climbs.

---

## 7. Prove push works before you ship it

Install the APK, then **Settings → Alerts on this phone** → turn it on →
**Send a test alert**.

That job goes through the real path — web → pg-boss → worker → Expo → FCM →
phone — so a notification arriving proves the whole chain rather than a
shortcut. If nothing arrives within a few seconds, the worker log records
`push test dispatched` with attempted/delivered/pruned counts and the first
Expo error, which tells you which link broke:

| Symptom | Almost always |
| --- | --- |
| Toggle refuses, says unavailable | `EXPO_PROJECT_ID` missing from the build (§2, §5) |
| Toggle turns on, test arrives | working — you are done |
| Toggle turns on, nothing arrives | FCM V1 service key not uploaded to Expo (§3 step 6) |
| Toggle fails with a server error | migration not run (§4) |
| `push test dispatched` absent from the log | worker is down or on old code |

Real alerts additionally respect muted websites and the workspace severity
threshold, exactly as email does, so a genuine notification needs a scan that
finds a HIGH or CRITICAL change.

---

## 8. Play Console

You already have the $25 developer account.

1. **Create app** — name *MyKavo*, app (not game), free.
2. **App content**, answered honestly:
   - **Privacy policy**: `https://mykavo.app/privacy`
   - **Ads**: no.
   - **Content rating**: complete the questionnaire (a business/productivity tool).
   - **Target audience**: 18+. Not designed for children.
   - **Data safety**: see the table below.
3. **Production → Create new release** → upload `app-release.aab`.
4. Release notes, then roll out.

Google reviews a first submission properly; allow a few days.

### Data safety answers

Derived from what the app actually does, not from a template. Check each against
<https://mykavo.app/privacy> before submitting — you are the one signing it.

| Question | Answer |
| --- | --- |
| Does the app collect or share user data? | **Yes**, collects. **No** sharing with third parties. |
| Personal info → Name, Email address | Collected. Purpose: **Account management**. Required. |
| App activity → Other actions | Collected (the websites and pages you choose to monitor). Purpose: **App functionality**. Required. |
| Device or other IDs | Collected **only if push is enabled** (the push token). Purpose: **App functionality**. Optional — the user controls it in Settings. |
| Is data encrypted in transit? | **Yes** (HTTPS throughout). |
| Can users request deletion? | **Yes** — account deletion is in the dashboard. |
| Financial info | **Not collected by the app.** Card details go directly to Dodo Payments and never reach MyKavo servers. Billing is not in the app. |
| Location, contacts, photos, messages, health | **Not collected.** |

The app stores the session cookie and the push token in Android Keystore
(`expo-secure-store`), and the theme preference in local storage. Nothing else
is kept on the device.

---

## 9. Afterwards

- **Never change the signing key.** Back up `~/mykavo-upload.jks` and its
  password; treat losing them as losing the listing.
- `npm run notices` after adding or removing any dependency — CI fails the build
  if `THIRD-PARTY-NOTICES.md` has drifted from what actually ships.
- Bump `version` in `app.json` for user-visible releases. `versionCode` is
  automatic.
- Do not ship to Play with the alerts toggle visible but disabled. A dead switch
  in Settings reads as broken software; either finish §2–§4 or hide the card.
