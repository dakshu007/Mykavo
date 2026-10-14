import { describe, expect, it } from "vitest";
import { computeNextScanAt, computeRetryAfterFailure, pulledForwardNextScan } from "./schedule";
import { scanFrequencyForTier } from "./plan-tier";

const from = new Date("2026-09-30T10:00:00Z");
const hours = (d: Date) => (d.getTime() - from.getTime()) / 3_600_000;

describe("scan scheduling", () => {
  it("schedules the next scan one interval out", () => {
    expect(hours(computeNextScanAt("DAILY", from))).toBe(24);
    expect(hours(computeNextScanAt("WEEKLY", from))).toBe(24 * 7);
  });

  it("retries a failed weekly site the next day instead of stopping", () => {
    expect(hours(computeRetryAfterFailure("WEEKLY", from))).toBe(24);
  });

  it("retries a failed daily site on its normal schedule", () => {
    expect(hours(computeRetryAfterFailure("DAILY", from))).toBe(24);
  });
});

describe("pulledForwardNextScan", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  it("brings a weekly next scan forward to a day after the last one", () => {
    const last = new Date("2026-10-15T00:00:00Z");
    const next = pulledForwardNextScan({ lastScanAt: last, nextScanAt: new Date("2026-10-22T00:00:00Z") }, now);
    expect(next?.toISOString()).toBe("2026-10-16T00:00:00.000Z");
  });
  it("scans now when the last scan is over a day old", () => {
    const next = pulledForwardNextScan({ lastScanAt: new Date("2026-10-10T00:00:00Z"), nextScanAt: new Date("2026-10-17T00:00:00Z") }, now);
    expect(next?.toISOString()).toBe(now.toISOString());
  });
  it("leaves a scan that is already due sooner", () => {
    expect(pulledForwardNextScan({ lastScanAt: new Date("2026-10-15T00:00:00Z"), nextScanAt: new Date("2026-10-15T18:00:00Z") }, now)).toBeNull();
  });
});

describe("scanFrequencyForTier", () => {
  it("scans Free weekly and paid plans daily", () => {
    expect(scanFrequencyForTier("free")).toBe("WEEKLY");
    expect(scanFrequencyForTier("pro")).toBe("DAILY");
    expect(scanFrequencyForTier("agency")).toBe("DAILY");
  });
});
