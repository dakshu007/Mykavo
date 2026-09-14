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

/**
 * Why push could not be turned on, and whether the person holding the phone
 * can do anything about it.
 *
 * "unavailable" means this build or this device cannot do push at all - there
 * is no button that fixes it, so the UI shows it calmly and disables the
 * toggle rather than raising an alarm the user cannot answer.
 * "actionable" means a retry is meaningful: permission was declined, the
 * device is offline, the request failed.
 *
 * Every `reason` here is shown to END USERS. No repo paths, no CLI commands,
 * no environment variable names - those go to console.warn for whoever is
 * attached to the logs.
 */
export type PushFailureKind = "unavailable" | "actionable";

export type PushRegistration =
  | { ok: true; token: string }
  | { ok: false; kind: PushFailureKind; reason: string };

/**
 * Whether this build/device can do push AT ALL, decided synchronously so the
 * toggle can render disabled from the first frame instead of flashing enabled
 * and then failing. Returns a user-facing sentence, or null when push is
 * possible.
 */
let warnedMissingProjectId = false;

export function pushUnavailableReason(): string | null {
  if (Platform.OS === "web") return "Push alerts are only available in the MyKavo app.";
  if (!Device.isDevice) {
    return "Push alerts need a physical device - an emulator has no way to receive them.";
  }
  if (!projectId()) {
    // The owner has not finished push setup for this build. Deliberately vague
    // to the user: naming `eas init` or a file in the repo is meaningless to
    // them and looks broken in a store listing. Warned once, not on every
    // render - this function is called during layout.
    if (!warnedMissingProjectId) {
      warnedMissingProjectId = true;
      console.warn(
        "[push] No EAS project id in this build - see apps/mobile/RELEASING.md. " +
          "Expo cannot issue a push token without it.",
      );
    }
    return "Push alerts aren't available in this version of MyKavo yet.";
  }
  return null;
}

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
  const unavailable = pushUnavailableReason();
  if (unavailable) {
    return { ok: false, kind: "unavailable", reason: unavailable };
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted) {
    // Only ask when we are allowed to ask, and only when iOS/Android says the
    // dialog can still change something.
    if (!existing.canAskAgain) {
      return {
        ok: false,
        kind: "actionable",
        reason:
          "Notifications are turned off for MyKavo. Enable them in your phone's " +
          "settings, then try again.",
      };
    }
    if (options.promptIfUndetermined === false) {
      return { ok: false, kind: "actionable", reason: "Notifications are not enabled yet." };
    }
    const asked = await Notifications.requestPermissionsAsync();
    granted = asked.granted;
  }
  if (!granted) {
    return {
      ok: false,
      kind: "actionable",
      reason: "Notification permission was declined.",
    };
  }

  // pushUnavailableReason() already established there is one.
  const id = projectId();
  if (!id) {
    return {
      ok: false,
      kind: "unavailable",
      reason: "Push alerts aren't available in this version of MyKavo yet.",
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
    // e.g. "FirebaseApp is not initialized" - true, and meaningless to a user.
    console.warn("[push] getExpoPushTokenAsync failed:", err);
    return {
      ok: false,
      kind: "actionable",
      reason:
        "Could not set up alerts right now. Check your connection and try again.",
    };
  }

  try {
    await api.registerPushDevice({
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
      deviceName: Device.deviceName ?? undefined,
    });
  } catch (err) {
    console.warn("[push] device registration failed:", err);
    return {
      ok: false,
      kind: "actionable",
      reason: "Could not register this device for alerts. Please try again.",
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
