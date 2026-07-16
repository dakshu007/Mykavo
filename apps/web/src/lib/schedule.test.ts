import { describe, expect, it } from "vitest";
import { computeNextScanAt, frequencyIntervalMs, isScanDue } from "@mykavo/shared";

describe("scheduling helpers (spec §40)", () => {
  const base = new Date("2026-07-08T06:00:00.000Z");

  it("weekly interval is 7 days, daily is 1 day", () => {
    expect(frequencyIntervalMs("WEEKLY")).toBe(7 * 24 * 60 * 60 * 1000);
    expect(frequencyIntervalMs("DAILY")).toBe(24 * 60 * 60 * 1000);
  });

  it("computeNextScanAt advances from the given time", () => {
    expect(computeNextScanAt("DAILY", base).toISOString()).toBe("2026-07-09T06:00:00.000Z");
    expect(computeNextScanAt("WEEKLY", base).toISOString()).toBe("2026-07-15T06:00:00.000Z");
  });

  it("isScanDue only for ACTIVE websites past their nextScanAt", () => {
    const now = new Date("2026-07-08T07:00:00.000Z");
    expect(isScanDue({ status: "ACTIVE", nextScanAt: base }, now)).toBe(true);
    // future nextScanAt → not due
    expect(
      isScanDue({ status: "ACTIVE", nextScanAt: new Date("2026-07-09T00:00:00Z") }, now),
    ).toBe(false);
    // paused / error / null → not due
    expect(isScanDue({ status: "PAUSED", nextScanAt: base }, now)).toBe(false);
    expect(isScanDue({ status: "ERROR", nextScanAt: base }, now)).toBe(false);
    expect(isScanDue({ status: "ACTIVE", nextScanAt: null }, now)).toBe(false);
  });
});
