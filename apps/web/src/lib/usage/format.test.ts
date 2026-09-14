import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatCount,
  formatPercent,
  formatValue,
  meterWidth,
} from "./format";

describe("formatBytes", () => {
  it("uses binary units, matching what the providers report", () => {
    // 1000-based units here would make a 500 MB cap look like it had
    // headroom it does not have.
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(500 * 1024 * 1024)).toBe("500 MB");
    expect(formatBytes(1024 ** 3)).toBe("1.0 GB");
  });

  it("keeps one decimal only where it carries information", () => {
    expect(formatBytes(1.4 * 1024 ** 3)).toBe("1.4 GB");
    expect(formatBytes(420 * 1024 * 1024)).toBe("420 MB");
  });

  it("handles zero and refuses to invent a number", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("-");
    expect(formatBytes(-1)).toBe("-");
  });

  it("does not run off the end of the unit list", () => {
    expect(formatBytes(1024 ** 6)).toContain("TB");
  });
});

describe("formatCount", () => {
  it("separates thousands and compacts millions", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(12_500)).toBe("12,500");
    expect(formatCount(2_400_000)).toBe("2.4M");
  });
});

describe("formatPercent", () => {
  it("never rounds a real value down to nothing", () => {
    // "0%" beside a 400 MB database reads as "nothing stored".
    expect(formatPercent(0.004)).toBe("<1%");
    expect(formatPercent(0)).toBe("0%");
  });

  it("rounds to whole percent in the normal range", () => {
    expect(formatPercent(0.826)).toBe("83%");
    expect(formatPercent(1)).toBe("100%");
  });

  it("caps absurd values instead of printing them", () => {
    expect(formatPercent(42)).toBe(">999%");
    expect(formatPercent(Number.NaN)).toBe("-");
  });
});

describe("meterWidth", () => {
  it("clamps over-quota to the track", () => {
    // The number and the "At capacity" label already say it is over; a fill
    // escaping its track just looks like a rendering bug.
    expect(meterWidth(1.8)).toBe(100);
    expect(meterWidth(1)).toBe(100);
    expect(meterWidth(0.5)).toBe(50);
  });

  it("is zero for nothing and for unmeasurable input", () => {
    expect(meterWidth(0)).toBe(0);
    expect(meterWidth(-2)).toBe(0);
    expect(meterWidth(Number.NaN)).toBe(0);
  });
});

describe("formatValue", () => {
  it("dispatches on the unit", () => {
    expect(formatValue(2048, "bytes")).toBe("2.0 KB");
    expect(formatValue(2048, "count")).toBe("2,048");
  });
});
