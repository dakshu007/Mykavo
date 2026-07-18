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
    }),
    twoFactorClient(),
  ],
});

export const { useSession } = authClient;
