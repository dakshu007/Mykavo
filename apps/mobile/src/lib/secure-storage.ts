/**
 * Crash-proof SecureStore adapter for the Better Auth client.
 *
 * expo-secure-store reads can THROW natively on Android when a Keystore
 * entry can no longer decrypt its value (OS backup/restore, keystore reset,
 * device credential changes). Because the auth client reads storage during
 * app boot, an unguarded throw becomes a PERMANENT crash-on-open loop in
 * release builds. Every operation here is wrapped; a failed read self-heals
 * by deleting the corrupt entry - worst case the user signs in again, which
 * beats an app that never opens.
 */

import * as SecureStore from "expo-secure-store";

function heal(key: string): void {
  SecureStore.deleteItemAsync(key).catch(() => {
    // Even the cleanup failed - nothing more we can safely do.
  });
}

export const safeSecureStorage = {
  getItem(key: string): string | null {
    try {
      return SecureStore.getItem(key);
    } catch {
      heal(key);
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      SecureStore.setItem(key, value);
    } catch {
      // Persisting failed (full keystore, size limit, ...) - session simply
      // will not survive a restart, which is recoverable.
    }
  },

  async getItemAsync(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      heal(key);
      return null;
    }
  },

  async setItemAsync(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // See setItem.
    }
  },

  async deleteItemAsync(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Already gone or locked - ignore.
    }
  },
};

/** Keys the app persists outside the auth client's own storage. */
export const WORKSPACE_KEY = "mykavo-active-workspace";

/** Wipe everything this app persists in SecureStore (recovery path). */
export async function wipeSecureStorage(): Promise<void> {
  // The Better Auth expo client stores under `${storagePrefix}_cookie` and
  // `${storagePrefix}_session_data`; we prefix with "mykavo".
  const keys = ["mykavo_cookie", "mykavo_session_data", WORKSPACE_KEY];
  await Promise.all(keys.map((k) => safeSecureStorage.deleteItemAsync(k)));
}
