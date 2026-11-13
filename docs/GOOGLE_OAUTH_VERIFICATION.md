# Google OAuth: from Testing to Production, and verification

MyKavo uses one Google OAuth client for two things:

- **Sign in with Google** (Better Auth): scopes `openid`, `email`, `profile`. These are non-sensitive.
- **Search Console connection**: scope `https://www.googleapis.com/auth/webmasters.readonly`
  (`GSC_SCOPE` in `packages/shared/src/gsc.ts`). Google classes it as **sensitive**, so it needs
  verification. It is not *restricted*, so there is no paid security assessment (CASA).

## Why this matters

While the consent screen's publishing status is **Testing**, Google expires every user's refresh
token after **7 days**. Search Console connections then fail with `invalid_grant` and the
dashboard shows "Reconnect". Publishing to **Production** removes the 7-day expiry at once, even
before verification is finished. Until verification is approved, users see a "Google hasn't
verified this app" screen and the app is capped at 100 users of the sensitive scope.

## Steps (Google Cloud Console, project that owns `GOOGLE_CLIENT_ID`)

The console now calls this area **Google Auth Platform** (APIs & Services, OAuth consent screen).

### 1. Check the client

- **Clients**: the Web client used by mykavo.app. Authorized redirect URIs must include
  `https://mykavo.app/api/gsc/callback` and the Better Auth Google callback
  (`https://mykavo.app/api/auth/callback/google`). Remove any localhost or old URIs from the
  production client.

### 2. Branding

- App name: **MyKavo** (must match the name on the site and in the video).
- User support email: `support@mykavo.app`.
- App logo: the square MyKavo mark, 120 x 120 px (`apps/web/public/brand/mykavo-icon-1200.png`, resized).
- App home page: `https://mykavo.app`
- Privacy policy: `https://mykavo.app/privacy` (has the Search Console and Limited Use section).
- Terms of service: `https://mykavo.app/terms`
- Authorized domains: `mykavo.app`. The domain must be verified in Google Search Console by an
  owner or editor of this Cloud project (Google checks this).
- Developer contact email: an inbox you read.

### 3. Data access (scopes)

Add exactly these scopes and nothing more:

- `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
- `https://www.googleapis.com/auth/webmasters.readonly`

Scope justification (paste and adjust):

> MyKavo is a website change monitoring service. When a user connects Google Search Console to a
> website they monitor in MyKavo, we read that property's search performance (clicks,
> impressions, CTR, position by day, page, query, country, device and search appearance), its
> list of sitemaps, and URL inspection results the user requests. We show this data only to that
> user in their MyKavo dashboard and use it to email them when clicks drop sharply. Access is
> read-only; MyKavo never changes anything in Search Console. Tokens are stored encrypted and the
> user can disconnect at any time, which deletes the tokens and all synced data.

### 4. Audience: publish

- User type: **External**.
- Publishing status: press **Publish app** to move from Testing to **In production**.
  This alone stops the 7-day token expiry.

### 5. Demo video (unlisted YouTube)

Record about 2 to 4 minutes, in English, at a readable size, showing:

1. mykavo.app home page, then signing in to the dashboard.
2. Opening **Search Console** in the dashboard and pressing **Connect** for a website.
3. The full Google consent screen, with the **MyKavo** name and the Search Console read-only
   permission visible (show the browser address bar with the OAuth client ID).
4. Choosing the property, then the data in use: the performance chart, top queries and pages,
   countries and devices, sitemaps list, a URL inspection.
5. **Disconnect**, to show the user can remove access.

Upload to YouTube Studio with visibility **Unlisted** and paste the link in the verification form.

### 6. Submit for verification

- **Verification Center**: submit brand verification first (it must be published before data
  access verification), then data access verification for the sensitive scope.
- Answer Google's emails from the developer contact address; they often ask for a clearer video
  or justification. Expect a review of a few days to several weeks.

### 7. After approval

- The unverified-app warning and the 100-user cap go away.
- Existing users whose connections expired while in Testing press **Reconnect** once. Reconnecting
  keeps the property they chose and syncs fresh data straight away
  (`apps/web/src/app/api/gsc/callback/route.ts`).

## What the code does about dead connections

- When Google rejects a refresh token, the web app and the worker record it on the connection
  (`GscAuthError`), and the dashboard shows **Reconnect**.
- API actions answer `409 { reconnect: true }` instead of failing with a 500.
- The daily sync skips connections waiting for a reconnect instead of retrying them every day.
- Resubmitting a sitemap opens Search Console itself: it needs write access, which MyKavo does not
  request, keeping the scope read-only.

If the keyword agent later sends Search Console data to an AI provider, update the privacy
policy's Limited Use paragraph and the scope justification before that ships.
