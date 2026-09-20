import { describe, expect, it } from "vitest";

/**
 * env.ts validates on import, so give it something valid before loading it.
 * Every assertion below drives parseServerEnv directly with its own source
 * object, so these two values never affect a result.
 */
process.env.DATABASE_URL = "postgresql://user:pw@host:5432/db";
process.env.BETTER_AUTH_SECRET = "x".repeat(40);

const { parseServerEnv, isMaskedSecret, isBuildPhase, SERVER_ENV_KEYS } =
  await import("./env");

const BUILD = "phase-production-build";
const REAL_DB = "postgresql://user:pw@host:5432/db?pgbouncer=true";
const REAL_SECRET = "XoxgTrKr7oW9z0SLEU38cGVPAPGtHpko7Q840cUipPkC";

/** Exactly the shape Netlify's API returns for a secret-flagged value. */
const MASKED_SECRET = "****************mw0=";
const MASKED_DB = "****************it=1";

describe("isMaskedSecret", () => {
  it("recognises Netlify's mask", () => {
    expect(isMaskedSecret(MASKED_SECRET)).toBe(true);
    expect(isMaskedSecret(MASKED_DB)).toBe(true);
  });

  it("does not mistake a real credential for a mask", () => {
    expect(isMaskedSecret(REAL_SECRET)).toBe(false);
    expect(isMaskedSecret(REAL_DB)).toBe(false);
    // Asterisks are legal inside a password - only a leading run is the mask.
    expect(isMaskedSecret("postgresql://u:pa**word@h:5432/d")).toBe(false);
    expect(isMaskedSecret("")).toBe(false);
    expect(isMaskedSecret(undefined)).toBe(false);
  });
});

describe("isBuildPhase", () => {
  it("is true only during next build", () => {
    expect(isBuildPhase({ NEXT_PHASE: BUILD })).toBe(true);
    expect(isBuildPhase({})).toBe(false);
    expect(isBuildPhase({ NEXT_PHASE: "phase-production-server" })).toBe(false);
  });
});

describe("parseServerEnv", () => {
  /**
   * The failure this was written for. Netlify hands the build a mask instead
   * of the secret; before this, `.url()` and `.min(32)` rejected it and the
   * deploy died, and the only known escape was to un-flag the variable -
   * putting a live database password back into plaintext.
   */
  it("accepts Netlify-masked values during the build", () => {
    const result = parseServerEnv({
      NEXT_PHASE: BUILD,
      DATABASE_URL: MASKED_DB,
      BETTER_AUTH_SECRET: MASKED_SECRET,
    });
    expect(result.env.DATABASE_URL).toBe(MASKED_DB);
    expect(result.deferred).toEqual(
      expect.arrayContaining(["DATABASE_URL", "BETTER_AUTH_SECRET"]),
    );
  });

  /**
   * The other half, and the reason this is not just "skip the check". At
   * runtime Netlify injects the real values, so a mask reaching a running
   * function is a genuine fault and must still fail loudly.
   */
  it("rejects the same masked values at runtime", () => {
    expect(() =>
      parseServerEnv({
        DATABASE_URL: MASKED_DB,
        BETTER_AUTH_SECRET: MASKED_SECRET,
      }),
    ).toThrow(/Invalid server environment/);
  });

  /**
   * The narrowness guard. A build-time bypass that waved through ANY value
   * would let a typo'd connection string deploy. Only what the build cannot
   * see is excused - a value it CAN see is still checked.
   */
  it("still rejects a visible but invalid value during the build", () => {
    expect(() =>
      parseServerEnv({
        NEXT_PHASE: BUILD,
        DATABASE_URL: "not-a-connection-url",
        BETTER_AUTH_SECRET: REAL_SECRET,
      }),
    ).toThrow(/DATABASE_URL must be a valid connection URL/);

    expect(() =>
      parseServerEnv({
        NEXT_PHASE: BUILD,
        DATABASE_URL: REAL_DB,
        BETTER_AUTH_SECRET: "too-short",
      }),
    ).toThrow(/at least 32 characters/);
  });

  it("defers an empty value during the build and names it", () => {
    // A deploy context left empty looks the same to the build as a mask.
    // It is reported rather than passed silently, because the warning is the
    // only signal before it fails on the first request.
    const result = parseServerEnv({
      NEXT_PHASE: BUILD,
      DATABASE_URL: "",
      BETTER_AUTH_SECRET: REAL_SECRET,
    });
    expect(result.deferred).toEqual(["DATABASE_URL"]);
  });

  it("rejects an empty value at runtime", () => {
    expect(() =>
      parseServerEnv({ DATABASE_URL: "", BETTER_AUTH_SECRET: REAL_SECRET }),
    ).toThrow(/DATABASE_URL/);
  });

  it("reports nothing deferred when the real values are present", () => {
    for (const source of [
      { DATABASE_URL: REAL_DB, BETTER_AUTH_SECRET: REAL_SECRET },
      { NEXT_PHASE: BUILD, DATABASE_URL: REAL_DB, BETTER_AUTH_SECRET: REAL_SECRET },
    ]) {
      const result = parseServerEnv(source);
      expect(result.deferred).toEqual([]);
      expect(result.env.BETTER_AUTH_SECRET).toBe(REAL_SECRET);
    }
  });

  it("leaves the optional variables alone", () => {
    const result = parseServerEnv({
      DATABASE_URL: REAL_DB,
      BETTER_AUTH_SECRET: REAL_SECRET,
      GSC_TOKEN_KEY: MASKED_SECRET,
      DODO_API_KEY: MASKED_SECRET,
    });
    // These are `.optional()` with no shape rule, so a mask is simply a
    // string to them - they were never what broke the build.
    expect(result.env.GSC_TOKEN_KEY).toBe(MASKED_SECRET);
    expect(result.deferred).toEqual([]);
  });
});

describe("every variable survives being secret-flagged", () => {
  /**
   * The guard that outlives the four variables this was written for.
   *
   * Any variable can be ticked "Contains secret values" in Netlify - it is a
   * checkbox, not a code change - and from then on the build sees a mask. So
   * a shape rule added later without strictAtRuntime does not fail in review,
   * it fails on the deploy after somebody ticks a box, which is how tonight
   * went. Feeding a mask to every key catches that here instead.
   *
   * NODE_ENV is excluded: Netlify does not hold it, so it is never masked.
   */
  it("accepts a mask for every key during the build", () => {
    const source: Record<string, string | undefined> = { NEXT_PHASE: BUILD };
    for (const key of SERVER_ENV_KEYS) {
      if (key === "NODE_ENV") continue;
      source[key] = MASKED_SECRET;
    }

    expect(() => parseServerEnv(source)).not.toThrow();
  });

  it("covers the variables that carry a shape rule", () => {
    // Named explicitly so removing a wrapper is visible in the diff, not just
    // in a loop's pass/fail.
    for (const key of [
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "LEAD_SHEET_WEBHOOK_URL",
      "APP_URL",
      "DODO_MODE",
    ]) {
      expect(SERVER_ENV_KEYS).toContain(key);
      const result = parseServerEnv({
        NEXT_PHASE: BUILD,
        DATABASE_URL: REAL_DB,
        BETTER_AUTH_SECRET: REAL_SECRET,
        [key]: MASKED_SECRET,
      });
      expect(result.deferred).toContain(key);
    }
  });
});

describe("optional variables", () => {
  it("treats an empty value as unset rather than malformed", () => {
    // Netlify writes "" for a deploy context left blank. Failing the schema
    // over a blank optional would take the site down for a feature nobody
    // had configured.
    const result = parseServerEnv({
      DATABASE_URL: REAL_DB,
      BETTER_AUTH_SECRET: REAL_SECRET,
      LEAD_SHEET_WEBHOOK_URL: "",
      APP_URL: "",
    });
    expect(result.env.LEAD_SHEET_WEBHOOK_URL).toBeUndefined();
    expect(result.env.APP_URL).toBeUndefined();
    expect(result.deferred).toEqual([]);
  });

  it("still rejects a malformed optional value at runtime", () => {
    expect(() =>
      parseServerEnv({
        DATABASE_URL: REAL_DB,
        BETTER_AUTH_SECRET: REAL_SECRET,
        LEAD_SHEET_WEBHOOK_URL: "not-a-url",
      }),
    ).toThrow(/LEAD_SHEET_WEBHOOK_URL/);
  });

  it("accepts a real Apps Script webhook URL", () => {
    const url = "https://script.google.com/macros/s/AKfycbx_example_id/exec";
    const result = parseServerEnv({
      DATABASE_URL: REAL_DB,
      BETTER_AUTH_SECRET: REAL_SECRET,
      LEAD_SHEET_WEBHOOK_URL: url,
    });
    expect(result.env.LEAD_SHEET_WEBHOOK_URL).toBe(url);
  });
});
