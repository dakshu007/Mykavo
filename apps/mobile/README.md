# MyKavo mobile app

Native companion app for [mykavo.app](https://mykavo.app) - React Native (Expo SDK 57, expo-router, TypeScript). Android-first, iOS works from the same codebase.

It signs into the SAME backend as the website (Better Auth cookie sessions, including TOTP 2FA and trust-device), reads via the `/api/mobile/*` JSON endpoints, and mutates through the exact same routes the web dashboard uses - so app and dashboard stay in sync in near-real-time (focus refetch + 3-20s polling, matching the web's own auto-refresh cadence).

## Layout

- `src/lib/theme.ts` - fx design tokens, ported 1:1 from `apps/web/src/app/globals.css` (light + dark)
- `src/lib/types.ts` - the `/api/mobile/*` response contract (mirror of `apps/web/src/app/api/mobile/*`)
- `src/lib/auth.ts` - Better Auth Expo client (SecureStore cookie storage); `EXPO_PUBLIC_API_URL` overrides the backend (defaults to production)
- `src/lib/api.ts` - typed API client; `src/lib/live.ts` - the polling/focus/foreground live-sync hook
- `src/components/` - UI kit (cards, badges, buttons) matching the web dashboard components
- `src/app/` - expo-router screens: `login` (gold v4 style, 2FA), `(tabs)` Overview / Websites / Changes / Scans / Settings, plus `website/[id]`, `change/[id]`, `scan/[id]`

## Run it

This package is intentionally OUTSIDE the pnpm workspace (Metro prefers its own hoisted node_modules). Use npm here:

```bash
cd apps/mobile
npm install
npx expo start          # QR code -> open in Expo Go on your phone (talks to production)
```

Against a local backend: copy `.env.example` to `.env`, set `EXPO_PUBLIC_API_URL=http://<your-Mac-LAN-IP>:3010`, run the web dev server, then `npx expo start`.

## Build an installable Android APK

Option A - EAS (free tier, easiest):

```bash
npm install -g eas-cli
eas login                        # your expo.dev account
eas build -p android --profile preview
```

Option B - local build (needs Android Studio / SDK installed):

```bash
npx expo run:android --variant release
```

`app.json` already carries the Android package id (`app.mykavo.mobile`), the `mykavo://` scheme, and brand icons (generated from the page-spark mark).

## Backend coupling

The server side lives in `apps/web`: the `expo()` Better Auth plugin + `mykavo://` / `exp://` trusted origins in `src/lib/auth.ts`, and the read endpoints under `src/app/api/mobile/*`. If you change one of those response shapes, update `src/lib/types.ts` here to match.
