/**
 * Push notifications - the reason a monitoring app belongs on a phone.
 *
 * Verified against the INSTALLED expo-notifications 57.0.18 type definitions
 * (per AGENTS.md: the SDK 57 API differs from older guides). In particular
 * `NotificationBehavior` now requires `shouldShowBanner`/`shouldShowList`;
 * the old `shouldShowAlert` is deprecated.
 *
 * Requirements that are NOT in this file's control:
 *  - an EAS projectId in app.json (`extra.eas.projectId`) - Expo issues tokens
 *    per project, so there is nothing to request without it;
 *  - a real device (simulators have no push transport);
 *  - Android push needs a development/production build with FCM credentials.
 *    Expo Go dropped Android remote push in SDK 53.
 * Each of those surfaces as a specific, readable reason rather than a silent
 * no-op, because "notifications appear to be on but nothing arrives" is the
 * worst possible state for an alerting product.
 */

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api } from "./api";
import { safeSecureStorage } from "./secure-storage";


/** Android channel ids - must match packages/shared/src/push.ts. */
const CHANNEL_CRITICAL = "critical-changes";
const CHANNEL_DEFAULT = "changes";

/** The token this install last registered, so we can unregister it exactly. */
export const PUSH_TOKEN_KEY = "mykavo-push-token";

/**
 * Show alerts even while the app is foregrounded. Someone staring at the
 * dashboard still wants to know a site just went down.
 */
export function configureNotificationHandler(): void {
  // The web preview has no notification transport; setting a handler there
  // would throw during module evaluation and take the whole app down.
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Android requires channels to exist before any notification can use them,
 * and their importance is fixed at creation time - the user can later change
 * it, but the app cannot. Two channels so routine changes never buzz with the
 * same urgency as a site being down.
 */
export async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_CRITICAL, {
    name: "Critical changes",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FFD400",
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_DEFAULT, {
    name: "Website changes",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
}

/** The EAS project id Expo issues push tokens against. */
function projectId(): string | null {
  const fromEas = Constants.easConfig?.projectId;
  if (typeof fromEas === "string" && fromEas.length > 0) return fromEas;
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: unknown } }
    | undefined;
  const fromExtra = extra?.eas?.projectId;
  return typeof fromExtra === "string" && fromExtra.length > 0 ? fromExtra : null;
}

export type PushRegistration =
  | { ok: true; token: string }
  | { ok: false; reason: string; canRetry: boolean };

/**
 * Ask for permission (if not already decided), fetch the Expo token and
 * register it with the backend.
 *
 * `promptIfUndetermined: false` lets the app check the existing state on boot
 * without throwing a permission dialog at someone who never asked for one.
 */
export async function registerForPush(
  options: { promptIfUndetermined?: boolean } = {},
): Promise<PushRegistration> {
  if (Platform.OS === "web") {
    return { ok: false, reason: "Push alerts are only available in the app.", canRetry: false };
  }
  if (!Device.isDevice) {
    return {
      ok: false,
      reason: "Push alerts need a real device - simulators have no push transport.",
      canRetry: false,
    };
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted) {
    // Only ask when we are allowed to ask, and only when iOS/Android says the
    // dialog can still change something.
    if (!existing.canAskAgain) {
      return {
        ok: false,
        reason: "Notifications are blocked for MyKavo in your system settings.",
        canRetry: false,
      };
    }
    if (options.promptIfUndetermined === false) {
      return { ok: false, reason: "Notifications are not enabled yet.", canRetry: true };
    }
    const asked = await Notifications.requestPermissionsAsync();
    granted = asked.granted;
  }
  if (!granted) {
    return { ok: false, reason: "Notification permission was declined.", canRetry: true };
  }

  const id = projectId();
  if (!id) {
    // Not a bug and not something the app can fix at runtime: Expo issues push
    // tokens per project, and the project belongs to the account that owns the
    // app. Name both the cause and the fix, since "contact support" for
    // something the owner can do in 30 seconds is a dead end.
    return {
      ok: false,
      reason:
        "Push is not set up for this build yet.\n\n" +
        "Expo issues push tokens per project, and this build carries no project id. " +
        "The owner needs to run `eas init` in apps/mobile and add the id it prints as " +
        "the EXPO_PROJECT_ID secret (or into app.json), then rebuild.\n\n" +
        "Android delivery also needs Firebase credentials. See apps/mobile/RELEASING.md.",
      canRetry: false,
    };
  }

  await ensureAndroidChannels();

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId: id });
    token = result.data;
  } catch (err) {
    // Offline, or Android without FCM credentials. Surface the real message -
    // guessing here is how "enabled but silent" happens.
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Could not get a push token.",
      canRetry: true,
    };
  }

  try {
    await api.registerPushDevice({
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
      deviceName: Device.deviceName ?? undefined,
    });
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Could not register this device.",
      canRetry: true,
    };
  }

  safeSecureStorage.setItem(PUSH_TOKEN_KEY, token);
  return { ok: true, token };
}

/** Stop alerts for this device. Leaves OS permission alone. */
export async function unregisterFromPush(): Promise<boolean> {
  const token = safeSecureStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return true;
  try {
    await api.unregisterPushDevice(token);
  } catch {
    return false;
  }
  await safeSecureStorage.deleteItemAsync(PUSH_TOKEN_KEY);
  return true;
}

/** Whether this install currently has a token registered with the backend. */
export function locallyRegisteredToken(): string | null {
  return safeSecureStorage.getItem(PUSH_TOKEN_KEY);
}

export { routeForNotification } from "./push-route";
