import { afterEach, describe, expect, it } from "vitest";
import { GB, MB, QUOTAS, usageLabel, usageLevel, type UsageLevel } from "./quotas";

const ENV_KEYS = [
  "QUOTA_DATABASE_MB",
  "QUOTA_DATABASE_CONNECTIONS",
  "QUOTA_R2_GB",
  "QUOTA_RESEND_DAILY",
  "QUOTA_RESEND_MONTHLY",
  "QUOTA_NETLIFY_BANDWIDTH_GB",
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("usageLevel", () => {
  // Boundaries, not midpoints: an off-by-one here shows a meter as "Watch"
  // when it is actually at capacity, which is the whole failure this page
  // exists to prevent.
  it.each<[number, UsageLevel]>([
    [0, "ok"],
    [0.699, "ok"],
    [0.7, "warning"],
    [0.899, "warning"],
    [0.9, "critical"],
    [1, "critical"],
    [4.2, "critical"],
  ])("%s -> %s", (ratio, expected) => {
    expect(usageLevel(ratio)).toBe(expected);
  });

  it("warns before the cap is reached, not when it is", () => {
    // Hitting a hard provider cap is already an outage or a surprise bill,
    // so 90% is the alarm line. A ramp that only goes red at 100% tells you
    // after it stopped mattering.
    expect(usageLevel(0.9)).toBe("critical");
    expect(usageLevel(0.89)).not.toBe("critical");
  });

  it("treats an unmeasurable ratio as ok rather than critical", () => {
    // NaN arrives when a probe failed. Those rows render as "Could not read"
    // and never reach a meter, so shouting "At capacity" would be a false
    // alarm about a number we do not have.
    expect(usageLevel(Number.NaN)).toBe("ok");
    expect(usageLevel(Number.POSITIVE_INFINITY)).toBe("ok");
    expect(usageLevel(-1)).toBe("ok");
  });
});

describe("usageLabel", () => {
  it("gives every level a distinct word, so colour is never the only signal", () => {
    const levels: UsageLevel[] = ["ok", "warning", "critical"];
    const labels = levels.map(usageLabel);
    expect(labels).toEqual(["Healthy", "Getting full", "At capacity"]);
    expect(new Set(labels).size).toBe(levels.length);
  });
});

describe("quota defaults", () => {
  it("matches the documented free tiers", () => {
    expect(QUOTAS.databaseBytes().limit).toBe(500 * MB);
    expect(QUOTAS.storageBytes().limit).toBe(10 * GB);
    expect(QUOTAS.emailsPerDay().limit).toBe(100);
    expect(QUOTAS.emailsPerMonth().limit).toBe(3_000);
    expect(QUOTAS.bandwidthBytes().limit).toBe(100 * GB);
  });

  it("explains where every default came from", () => {
    // The note is what makes a wrong cap auditable instead of mysterious.
    for (const build of Object.values(QUOTAS)) {
      expect(build().note.length).toBeGreaterThan(10);
    }
  });
});

describe("quota env overrides", () => {
  it("scales friendly units into the metric's unit", () => {
    process.env.QUOTA_DATABASE_MB = "8192";
    expect(QUOTAS.databaseBytes().limit).toBe(8192 * MB);

    process.env.QUOTA_R2_GB = "250";
    expect(QUOTAS.storageBytes().limit).toBe(250 * GB);
  });

  it("takes unscaled counts as they are", () => {
    process.env.QUOTA_RESEND_DAILY = "5000";
    expect(QUOTAS.emailsPerDay().limit).toBe(5_000);
  });

  it("says the override is responsible, so a surprising cap is traceable", () => {
    process.env.QUOTA_DATABASE_MB = "2048";
    expect(QUOTAS.databaseBytes().note).toContain("QUOTA_DATABASE_MB");
  });

  it.each(["", "   ", "abc", "0", "-5", "NaN", "Infinity"])(
    "ignores the unusable value %o and keeps the default",
    (raw) => {
      process.env.QUOTA_DATABASE_MB = raw;
      // A cap of NaN compares false against every comparison in usageLevel,
      // so it would paint a full database green. Falling back to the
      // documented default is the safe direction.
      expect(QUOTAS.databaseBytes().limit).toBe(500 * MB);
    },
  );
});
