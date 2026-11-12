import { describe, expect, it } from "vitest";
import { isOlderVersion, relativeTime } from "./wp-format";

describe("isOlderVersion", () => {
  it("compares dotted versions numerically", () => {
    expect(isOlderVersion("1.2.0", "1.3.1")).toBe(true);
    expect(isOlderVersion("1.3.1", "1.3.1")).toBe(false);
    expect(isOlderVersion("1.10.0", "1.9.9")).toBe(false);
    expect(isOlderVersion("1.3", "1.3.1")).toBe(true);
    expect(isOlderVersion("2.0", "1.3.1")).toBe(false);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-11-12T12:00:00Z");
  it("rounds down to the largest unit", () => {
    expect(relativeTime("2026-11-12T11:59:40Z", now)).toBe("just now");
    expect(relativeTime("2026-11-12T11:55:00Z", now)).toBe("5m ago");
    expect(relativeTime("2026-11-12T06:00:00Z", now)).toBe("6h ago");
    expect(relativeTime("2026-11-09T12:00:00Z", now)).toBe("3d ago");
    expect(relativeTime("2026-08-12T12:00:00Z", now)).toBe("3mo ago");
  });
  it("never goes negative", () => {
    expect(relativeTime("2026-11-12T12:05:00Z", now)).toBe("just now");
  });
});
