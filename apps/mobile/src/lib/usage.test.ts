import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  formatBytes,
  formatCount,
  formatPercent,
  formatUsageValue,
  meterFraction,
  usageLabel,
  usageLevel,
  type UsageLevel,
} from "./usage";

/**
 * The drift guard.
 *
 * apps/mobile is outside the pnpm workspace, so this logic is copied from the
 * web rather than imported. The dangerous failure is silent: the web moves a
 * threshold, the phone does not, and the two surfaces disagree about the same
 * number - "Healthy" here, "At capacity" there - with no error anywhere.
 *
 * So the web file is read and its thresholds compared against this one's. It
 * does not execute the web module (that would drag in server imports); it
 * reads the literals out of the source, which is enough to catch a moved line.
 */
const WEB_QUOTAS = join(__dirname, "..", "..", "..", "web", "src", "config", "quotas.ts");

describe("thresholds stay in step with the web app", () => {
  const source = readFileSync(WEB_QUOTAS, "utf8");

  it("reads the web usageLevel function", () => {
    // If this fails the file moved or was renamed, and the rest of this
    // block would silently pass against nothing.
    expect(source).toContain("export function usageLevel");
  });

  it("uses the same critical and warning lines", () => {
    const critical = /ratio >= (0\.\d+)\) return "critical"/.exec(source);
    const warning = /ratio >= (0\.\d+)\) return "warning"/.exec(source);
    expect(critical?.[1]).toBe("0.9");
    expect(warning?.[1]).toBe("0.7");

    // And that those literals are what this module actually does.
    expect(usageLevel(0.9)).toBe("critical");
    expect(usageLevel(0.89)).toBe("warning");
    expect(usageLevel(0.7)).toBe("warning");
    expect(usageLevel(0.69)).toBe("ok");
  });

  it("uses the same three level names", () => {
    expect(source).toContain('export type UsageLevel = "ok" | "warning" | "critical"');
  });

  it("uses the same words for each level", () => {
    for (const word of ["At capacity", "Getting full", "Healthy"]) {
      expect(source).toContain(`return "${word}"`);
    }
    const levels: UsageLevel[] = ["ok", "warning", "critical"];
    expect(levels.map(usageLabel)).toEqual(["Healthy", "Getting full", "At capacity"]);
  });
});

describe("usageLevel", () => {
  it("treats an unmeasurable ratio as ok, not as an alarm", () => {
    expect(usageLevel(Number.NaN)).toBe("ok");
    expect(usageLevel(Number.POSITIVE_INFINITY)).toBe("ok");
    expect(usageLevel(-1)).toBe("ok");
  });
});

describe("formatting", () => {
  it("formats bytes in binary units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(500 * 1024 * 1024)).toBe("500 MB");
    expect(formatBytes(1.4 * 1024 ** 3)).toBe("1.4 GB");
    expect(formatBytes(Number.NaN)).toBe("-");
  });

  it("formats counts", () => {
    expect(formatCount(12_500)).toBe("12,500");
    expect(formatCount(2_400_000)).toBe("2.4M");
  });

  it("dispatches on unit", () => {
    expect(formatUsageValue(2048, "bytes")).toBe("2.0 KB");
    expect(formatUsageValue(2048, "count")).toBe("2,048");
  });

  it("never shows a real value as 0%", () => {
    expect(formatPercent(0.004)).toBe("<1%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.826)).toBe("83%");
    expect(formatPercent(42)).toBe(">999%");
  });

  it("clamps the meter fill to its track", () => {
    expect(meterFraction(1.8)).toBe(1);
    expect(meterFraction(0.5)).toBe(0.5);
    expect(meterFraction(-1)).toBe(0);
    expect(meterFraction(Number.NaN)).toBe(0);
  });
});
