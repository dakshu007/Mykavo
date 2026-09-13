/**
 * Signs Android release builds with a REAL upload key instead of the debug key.
 *
 * Expo's prebuild template ships this, with its own warning:
 *
 *     release {
 *       // Caution! In production, you need to generate your own keystore file.
 *       signingConfig signingConfigs.debug
 *     }
 *
 * A debug-signed build carries the certificate `CN=Android Debug, OU=Android,
 * O=Unknown`, which Google Play rejects outright. Worse, the debug keystore's
 * password and alias are public knowledge, so anybody holding the file could
 * sign an "update" that installs over a real user's app - one holding a live
 * session to their clients' dashboards.
 *
 * Done as a config plugin rather than a post-prebuild `sed` because prebuild
 * regenerates android/ from scratch every run; a patch applied afterwards is
 * one refactor away from silently not applying, and "silently not applying"
 * here means shipping a debug-signed build believing it is signed properly.
 *
 * Credentials come from the environment, never from a commit:
 *   ANDROID_KEYSTORE_PATH      absolute path to the .jks/.keystore
 *   ANDROID_KEYSTORE_PASSWORD  store password
 *   ANDROID_KEY_ALIAS          key alias
 *   ANDROID_KEY_PASSWORD       key password (often the same as the store one)
 *
 * With none of them set the plugin does nothing, so `expo run:android` and
 * local sideload builds keep working on the debug key. The CI workflow is what
 * refuses to publish a Play artifact in that state - see android-apk.yml.
 */

const { withAppBuildGradle } = require("@expo/config-plugins");

const REQUIRED = [
  "ANDROID_KEYSTORE_PATH",
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD",
];

/**
 * The body of the brace-delimited block introduced by `header`, matched by
 * counting braces. Returns null when the header is absent.
 */
function extractBlock(source, header) {
  const start = source.indexOf(header);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start + header.length - 1; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start + header.length, i);
    }
  }
  return null;
}

/** Groovy single-quoted string literal. */
function groovy(value) {
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

module.exports = function withReleaseSigning(config) {
  const present = REQUIRED.filter((name) => (process.env[name] ?? "").trim().length > 0);

  if (present.length === 0) {
    return config; // Local/dev build - keep the debug key.
  }
  if (present.length !== REQUIRED.length) {
    // A partial set means somebody intended release signing and it would
    // silently fall back to the debug key - exactly the failure this plugin
    // exists to prevent.
    const missing = REQUIRED.filter((name) => !present.includes(name));
    throw new Error(
      `Release signing is partly configured: missing ${missing.join(", ")}. ` +
        "Set all four, or none to build with the debug key.",
    );
  }

  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      throw new Error(
        `with-release-signing expects a Groovy build.gradle, got ${cfg.modResults.language}.`,
      );
    }

    let gradle = cfg.modResults.contents;

    // A marker of our own, so "have we already inserted this?" is answered by
    // looking for OUR block rather than by pattern-matching Groovy. An earlier
    // version tested /signingConfigs\s*\{[\s\S]*?release\s*\{/, which happily
    // matched the `release {` inside buildTypes further down the file, decided
    // the config already existed, and emitted a build.gradle referencing a
    // signingConfigs.release that was never written.
    const MARKER = "// mykavo: release signing (injected by plugins/with-release-signing.js)";

    const signingBlock =
      `        ${MARKER}\n` +
      `        release {\n` +
      `            storeFile file(${groovy(process.env.ANDROID_KEYSTORE_PATH.trim())})\n` +
      `            storePassword ${groovy(process.env.ANDROID_KEYSTORE_PASSWORD)}\n` +
      `            keyAlias ${groovy(process.env.ANDROID_KEY_ALIAS.trim())}\n` +
      `            keyPassword ${groovy(process.env.ANDROID_KEY_PASSWORD)}\n` +
      `        }\n`;

    // 1. Add a `release` signing config next to the existing `debug` one.
    const anchor = "    signingConfigs {\n";
    if (!gradle.includes(anchor)) {
      throw new Error("with-release-signing: no signingConfigs block in build.gradle.");
    }
    if (!gradle.includes(MARKER)) {
      gradle = gradle.replace(anchor, anchor + signingBlock);
    }

    // 2. Point the release build type at it. Matching the template's exact
    //    line keeps this from touching the debug build type by accident.
    const debugSigned = "            signingConfig signingConfigs.debug\n" +
      "            def enableShrinkResources";
    if (!gradle.includes(debugSigned)) {
      throw new Error(
        "with-release-signing: the release build type no longer matches the " +
          "expected template - refusing to guess which signingConfig to change.",
      );
    }
    gradle = gradle.replace(
      debugSigned,
      "            signingConfig signingConfigs.release\n" +
        "            def enableShrinkResources",
    );

    // 3. Prove it took, both halves. Shipping a debug-signed "release" is the
    //    whole risk, and so is emitting a reference to a signingConfig that
    //    does not exist (Gradle then fails late, in CI, after a long build).
    //
    //    Both blocks are extracted by brace matching rather than by regex:
    //    `signingConfigs` and `buildTypes` each contain a `release {` at the
    //    same indentation, and an earlier version of this check matched the
    //    wrong one and rejected a correct file.
    const signing = extractBlock(gradle, "    signingConfigs {");
    if (signing === null || !/\n\s*release\s*\{/.test(signing)) {
      throw new Error(
        "with-release-signing: no `release` entry inside signingConfigs after injection.",
      );
    }
    if (!signing.includes("storeFile")) {
      throw new Error("with-release-signing: the injected release config has no storeFile.");
    }
    const buildTypes = extractBlock(gradle, "    buildTypes {");
    if (buildTypes === null) {
      throw new Error("with-release-signing: no buildTypes block in build.gradle.");
    }
    const releaseType = extractBlock(buildTypes, "        release {");
    if (releaseType === null || !releaseType.includes("signingConfigs.release")) {
      throw new Error(
        "with-release-signing: the release build type is not using signingConfigs.release.",
      );
    }
    if (releaseType.includes("signingConfigs.debug")) {
      throw new Error(
        "with-release-signing: the release build type is still on signingConfigs.debug.",
      );
    }

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
