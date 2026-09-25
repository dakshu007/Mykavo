/**
 * The MyKavo Android app, as the marketing site describes it. The download
 * itself is gated (request, approval, then the dashboard) - see
 * config/app-release.ts and docs/APP_ACCESS.md.
 */

/** The app's marketing page. */
export const ANDROID_APP_PAGE_PATH = "/android-app";

/** Oldest Android version the app installs on (Expo SDK 57's floor). */
export const ANDROID_MIN_VERSION = "7.0";

/** The Android package id, as it will appear on Google Play. */
export const ANDROID_PACKAGE_ID = "app.mykavo.mobile";
