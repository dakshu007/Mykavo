/**
 * Better Auth client for the MyKavo app.
 *
 * Talks to the SAME backend as mykavo.app - same accounts, same sessions,
 * same TOTP 2FA. The Expo plugin persists the session cookie on device and
 * replays it (plus the two_factor challenge and trust_device cookies)
 * automatically. Storage goes through the crash-proof SecureStore adapter -
 * a corrupt keystore entry must never take the whole app down at boot. On
 * web (react-native-web dev preview) it falls back to browser cookies.
 */

import { expoClient } from "@better-auth/expo/client";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { safeSecureStorage } from "./secure-storage";

/**
 * Backend base URL. Production talks to mykavo.app; local development points
 * at the Next dev server via EXPO_PUBLIC_API_URL (use your Mac's LAN IP, not
 * localhost, when running on a physical phone).
 */
export const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") || "https://mykavo.app";

export const authClient = createAuthClient({
  baseURL: API_BASE,
  plugins: [
    expoClient({
      scheme: "mykavo",
      storagePrefix: "mykavo",
      storage: safeSecureStorage,
      // No session-object cache: cold boots always fetch the session fresh
      // over the network (the cookie jar still persists, so logins survive
      // restarts). Removes the entire hydrate-cached-session-at-bundle-eval
      // path, which only ever runs on relaunch-after-login - exactly where
      // the reported crash lives.
      disableCache: true,
    }),
    twoFactorClient(),
  ],
});

export const { useSession } = authClient;

/* ------------------------------ Google sign-in ---------------------------- */

/**
 * Where Google sends the browser back to. The app's own scheme, which the
 * backend lists in trustedOrigins - the Expo plugin hands this to
 * openAuthSessionAsync as the URL that ends the browser session, and the
 * session cookie rides back on it.
 */
const APP_CALLBACK_URL = "mykavo://";

export type GoogleSignInResult =
  | { status: "signed-in" }
  /** The browser was dismissed without finishing. Not an error to report. */
  | { status: "cancelled" }
  | { status: "failed"; message: string };

/**
 * Sign in with Google.
 *
 * The same accounts as mykavo.app: anyone who created their account with
 * Google has no password to type, so without this they simply cannot get
 * into the app at all.
 *
 * The Expo client plugin does the browser work - it opens Google through the
 * backend's authorization proxy and stores the returned cookie. What it does
 * NOT do is tell us whether a session actually resulted, so this asks: a
 * dismissed browser and a completed sign-in both return quietly otherwise.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    const res = await authClient.signIn.social({
      provider: "google",
      callbackURL: APP_CALLBACK_URL,
    });
    if (res.error) {
      return {
        status: "failed",
        message: res.error.message || "Google sign-in failed. Please try again.",
      };
    }
  } catch {
    return {
      status: "failed",
      message: `Could not reach ${API_BASE}. Check your connection.`,
    };
  }

  // The plugin resolves whether or not a session was established, so the
  // only trustworthy answer is the session itself.
  try {
    const session = await authClient.getSession();
    if (session.data?.session) return { status: "signed-in" };
  } catch {
    return {
      status: "failed",
      message: "Signed in with Google, but the session could not be read. Try again.",
    };
  }
  return { status: "cancelled" };
}

/** Which sign-in methods this backend offers. */
export async function fetchAuthConfig(): Promise<{ google: boolean } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/mobile/auth-config`);
    if (!res.ok) return null;
    const body = (await res.json()) as { google?: unknown };
    return { google: body.google === true };
  } catch {
    return null;
  }
}
