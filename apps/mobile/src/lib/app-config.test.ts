import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards the two values that decide whether push notifications work at all.
 *
 * Both are set once and then never thought about again, which is precisely why
 * they need a test: if `extra.eas.projectId` is dropped or mistyped, the app
 * still builds, still installs, and still looks fine - the alerts toggle just
 * refuses to turn on, and the only way to find out is to install the APK. A
 * 25-minute build is the wrong place to discover that, so fail here instead.
 *
 * The Android package name is in the same category. It must match the Android
 * app registered in Firebase (`google-services.json`, which CI writes from a
 * secret and which this PUBLIC repo deliberately does not contain). A mismatch
 * produces push tokens that are accepted by Expo and then silently never
 * deliver - no error anywhere.
 */

type AppJson = {
  expo: {
    android?: { package?: unknown };
    ios?: { bundleIdentifier?: unknown };
    extra?: { eas?: { projectId?: unknown } };
  };
};

const appJson = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "app.json"), "utf8"),
) as AppJson;

/** The package name the Firebase Android app is registered under. */
const PACKAGE = "app.mykavo.mobile";

describe("app.json", () => {
  it("carries an EAS project id, so push tokens can be issued", () => {
    const id = appJson.expo.extra?.eas?.projectId;
    expect(typeof id).toBe("string");
    // Expo issues v4 UUIDs. Shape-checking catches a truncated paste, which
    // would otherwise fail only at runtime on a real device.
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("keeps the Android package matching the Firebase registration", () => {
    expect(appJson.expo.android?.package).toBe(PACKAGE);
  });

  it("keeps the iOS bundle id aligned with the Android package", () => {
    // Not shipped yet, but a divergence here becomes a second Firebase app to
    // register later, silently.
    expect(appJson.expo.ios?.bundleIdentifier).toBe(PACKAGE);
  });
});
