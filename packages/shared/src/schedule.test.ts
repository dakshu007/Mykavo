import { describe, expect, it } from "vitest";
import { computeNextScanAt, computeRetryAfterFailure } from "./schedule";

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
