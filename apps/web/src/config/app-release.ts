/**
 * Where the Android build lives, and the links around it.
 *
 * Its own module rather than an export from the landing component: API routes
 * need the URL, and importing it from a React component would pull lucide
 * icons and the whole landing tree into a route handler's bundle.
 *
 * The release is PUBLIC (the rolling `mobile-latest` release on
 * dakshu007/Mykavo-app-download, built by .github/workflows/android-apk.yml).
 * Access control around it is a guest list, not a lock - see
 * packages/shared/src/app-access.ts.
 */

export const APK_URL =
  "https://github.com/dakshu007/Mykavo-app-download/releases/latest/download/mykavo.apk";

/** The dashboard page an approved user downloads from. */
export const APP_DOWNLOAD_PATH = "/dashboard/app";

/** Same page, asking it to start the download by itself - used in the email. */
export const APP_DOWNLOAD_AUTOSTART_PATH = `${APP_DOWNLOAD_PATH}?download=1`;

/** Login bounce that returns to the auto-starting download page. */
export const APP_DOWNLOAD_LOGIN_PATH = `/login?next=${encodeURIComponent(
  APP_DOWNLOAD_AUTOSTART_PATH,
)}`;
