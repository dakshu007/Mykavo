/**
 * Dynamic Expo config, layered on top of app.json.
 *
 * app.json stays the readable source of truth; this file injects the three
 * things that must come from the environment rather than a commit:
 *
 *  - EXPO_PROJECT_ID     the EAS project id Expo issues push tokens against.
 *                        Not a secret (it is a public identifier), but it
 *                        belongs to the owner's Expo account, so CI supplies
 *                        it and nobody has to edit code to change accounts.
 *  - ANDROID_VERSION_CODE Play rejects an upload whose versionCode is not
 *                        higher than the last one. CI passes the run number,
 *                        so it always climbs without anyone remembering to
 *                        bump it.
 *  - GOOGLE_SERVICES_JSON path to google-services.json, which Android needs
 *                        for FCM. Absent locally; written from a secret in CI.
 *
 * Each is optional: a local `expo start` works with none of them set. What is
 * NOT optional is honesty about the result - registerForPush() reports the
 * missing project id to the user rather than silently failing, because an
 * alerting app that looks switched on but delivers nothing is the worst
 * possible outcome.
 */

const { existsSync } = require("node:fs");

/** Trimmed env var, or undefined when unset/blank. */
function env(name) {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

module.exports = ({ config }) => {
  const projectId = env("EXPO_PROJECT_ID");
  const rawVersionCode = env("ANDROID_VERSION_CODE");
  const googleServices = env("GOOGLE_SERVICES_JSON");

  // A non-numeric versionCode would be silently dropped by prebuild and the
  // upload would then be rejected by Play for a duplicate version - fail here,
  // where the cause is obvious, instead.
  let versionCode;
  if (rawVersionCode !== undefined) {
    versionCode = Number(rawVersionCode);
    if (!Number.isInteger(versionCode) || versionCode < 1) {
      throw new Error(
        `ANDROID_VERSION_CODE must be a positive integer, got "${rawVersionCode}".`,
      );
    }
  }

  // Pointing at a file that is not there makes prebuild fail deep in a Gradle
  // plugin; say so plainly instead.
  if (googleServices && !existsSync(googleServices)) {
    throw new Error(
      `GOOGLE_SERVICES_JSON points at "${googleServices}", which does not exist.`,
    );
  }

  return {
    ...config,
    android: {
      ...config.android,
      ...(versionCode !== undefined ? { versionCode } : {}),
      ...(googleServices ? { googleServicesFile: googleServices } : {}),
    },
    extra: {
      ...config.extra,
      ...(projectId ? { eas: { projectId } } : {}),
    },
  };
};
