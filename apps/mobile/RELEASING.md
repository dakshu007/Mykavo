# Releasing MyKavo for Android

Everything in the repo is ready. What remains needs your accounts, so it cannot
be done from CI or by an agent: a signing key that must only ever exist on your
machine, an Expo project id, and Firebase credentials.

Work through §1–§3 once. After that, every build is just a workflow run.

---

## 1. Create your upload key (do this once, on your Mac)

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

Then produce the base64 to paste into a GitHub secret:

```bash
base64 -i ~/mykavo-upload.jks | pbcopy   # now on your clipboard
```

---

## 2. Firebase, for push notifications

Android cannot receive a push without FCM.

1. <https://console.firebase.google.com> → **Add project** (reuse one if you have it).
2. **Add app → Android**, package name exactly `app.mykavo.mobile`.
3. Download **`google-services.json`**.
4. Base64 it for the secret:
   ```bash
   base64 -i ~/Downloads/google-services.json | pbcopy
   ```
5. In Firebase → **Project settings → Cloud Messaging**, make sure the
   **Firebase Cloud Messaging API (V1)** is enabled.
6. Give Expo the credentials so it can deliver on your behalf:
   ```bash
   cd apps/mobile
   npx eas-cli credentials       # Android → production → FCM V1 service account key
   ```
   Upload the service-account JSON from Firebase → Project settings →
   Service accounts → Generate new private key.

---

## 3. Expo project id, for push tokens

Expo issues push tokens per project, which is why the in-app toggle currently
refuses to turn on.

```bash
cd apps/mobile
npx eas-cli login      # your Expo account
npx eas-cli init       # prints a project id like 8f3b...-...-...
```

Copy the id. You do **not** need to commit it — it goes in a secret (§4), so
changing Expo accounts later never needs a code change.

> `eas init` may offer to write `extra.eas.projectId` into `app.json`. Either is
> fine; the secret wins if both are present.

---

## 4. Add the GitHub secrets

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
| --- | --- |
| `ANDROID_RELEASE_KEYSTORE_B64` | base64 from §1 |
| `ANDROID_KEYSTORE_PASSWORD` | the store password from §1 |
| `ANDROID_KEY_ALIAS` | `mykavo-upload` |
| `ANDROID_KEY_PASSWORD` | the key password from §1 |
| `GOOGLE_SERVICES_JSON_B64` | base64 from §2 |
| `EXPO_PROJECT_ID` | the id from §3 |

Already present and still used: `RELEASE_TOKEN` (publishes the sideload APK to
the public download repo) and `ANDROID_DEBUG_KEYSTORE_B64` (the old sideload
key, only used while `ANDROID_RELEASE_KEYSTORE_B64` is absent).

The build is deliberately tolerant: with none of these it still produces a
sideload APK, warns loudly, and skips the AAB. **All four signing secrets or
none** — a partial set fails the build rather than silently falling back to the
debug key.

---

## 5. Build

**Actions → android-apk → Run workflow.**

Artifacts on the run page:

- **`mykavo-android-apk`** — sideload build, for you and testers.
- **`mykavo-play-aab`** — the Play upload. Only built when §1 and §4 are done,
  because Play requires an App Bundle and rejects debug-signed uploads.

The run fails if a build that was supposed to be release-signed comes out on the
debug certificate, so a green run with an AAB means it really is signed with
your key. `versionCode` tracks the workflow run number, so it always climbs.

---

## 6. Play Console

You already have the $25 developer account.

1. **Create app** — name *MyKavo*, app (not game), free.
2. **App content**, and answer honestly:
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

## 7. Afterwards

- **Never change the signing key.** Back up `~/mykavo-upload.jks` and its
  password; treat losing them as losing the listing.
- `npm run notices` after adding or removing any dependency — CI fails the build
  if `THIRD-PARTY-NOTICES.md` has drifted from what actually ships.
- Bump `version` in `app.json` for user-visible releases. `versionCode` is
  automatic.
- To test push end to end: install the build, enable **Settings → Alerts on this
  phone**, then tap **Send a test alert**. That job goes through the real path
  (web → pg-boss → worker → Expo → FCM → phone), so a notification arriving
  proves the whole chain rather than a shortcut. If nothing arrives within a few
  seconds, check the worker log for `push test dispatched` - it records
  attempted/delivered/pruned counts and the first Expo error.
- Muted websites and the workspace severity threshold apply to push exactly as
  they do to email, so a real alert needs a scan that finds a HIGH or CRITICAL
  change.
