# Google OAuth: production status and how it is set up

**Status (13 Nov 2026): done.** The app is **In production**, branding is verified and
published, and Google raises no verification requirement. Search Console connections no
longer expire after 7 days.

## Where it lives

- Google Cloud project: **MyKavo**, project number **808920008938** (there are two
  projects named MyKavo; the other, `mykavo-e0f9c`, is Firebase for Android push).
- Direct links: [Clients](https://console.cloud.google.com/auth/clients?project=808920008938),
  [Audience](https://console.cloud.google.com/auth/audience?project=808920008938).
- One Web client, "MyKavo GSC", ID `808920008938-nq72mrv3iv77fn2jd50uos5umggb1snv...`,
  used for both Google sign-in (Better Auth) and the Search Console connection.

## What is configured

- **Branding:** app name MyKavo, support email the owner's Gmail, home page
  `https://mykavo.app`, privacy `https://mykavo.app/privacy`, terms
  `https://mykavo.app/terms`, authorised domain `mykavo.app`. No logo yet: adding one
  sends branding back for review.
- **Data Access:** exactly four scopes: `openid`, `userinfo.email`, `userinfo.profile`,
  `webmasters.readonly` (`GSC_SCOPE` in `packages/shared/src/gsc.ts`). Google's console
  lists none of them as sensitive or restricted, so no data access review or demo video
  is required.
- **Audience:** External, In production.

## Rules for later changes

- **Never add `.../auth/webmasters`** (read and write). MyKavo needs read-only access; the
  write scope would trigger a full review. Sitemap resubmission opens Search Console
  instead for this reason.
- Adding a scope that Google lists as sensitive (for example Google Analytics or Ads)
  brings back the verification banner and needs the review: a scope justification, an
  unlisted YouTube demo video showing the consent screen and the data in use, and a
  submission in the Verification Center.
- Changing the app name, logo or domains needs a new branding verification. After Google
  approves it, press **Publish branding** within 7 days.
- If the keyword agent ever sends Search Console data to an AI provider, update the privacy
  policy's Limited Use paragraph first.

## What the code does about dead connections

- When Google rejects a refresh token, the web app and the worker record it on the
  connection (`GscAuthError`), and the dashboard shows **Reconnect**.
- API actions answer `409 { reconnect: true }` instead of failing with a 500.
- The daily sync skips connections waiting for a reconnect instead of retrying them daily.
- Reconnecting keeps the chosen property and syncs at once
  (`apps/web/src/app/api/gsc/callback/route.ts`).
