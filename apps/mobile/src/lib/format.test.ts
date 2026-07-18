import { describe, expect, it } from "vitest";

import {
  formatBytes,
  formatDateTime,
  formatDuration,
  formatMs,
  formatPercent,
  hostOf,
  isInFuture,
  pathOf,
  timeAgo,
} from "./format";

describe("hostOf", () => {
  it("extracts the host", () => {
    expect(hostOf("https://www.anthropic.com/pricing")).toBe("www.anthropic.com");
    expect(hostOf("https://mykavo.app:8443/x")).toBe("mykavo.app:8443");
  });

  it("returns the input unchanged when the URL cannot be parsed", () => {
    expect(hostOf("not a url")).toBe("not a url");
    expect(hostOf("")).toBe("");
  });
});

describe("pathOf", () => {
  it("extracts path plus query", () => {
    expect(pathOf("https://a.com/x/y?z=1")).toBe("/x/y?z=1");
    expect(pathOf("https://a.com/")).toBe("/");
  });

  it("survives garbage input", () => {
    expect(pathOf("::::")).toBe("::::");
  });
});

describe("timeAgo", () => {
  it("handles null and invalid dates", () => {
    expect(timeAgo(null)).toBe("Never");
    expect(timeAgo("not-a-date")).toBe("Never");
  });

  it("buckets recent times", () => {
    expect(timeAgo(new Date(Date.now() - 10_000).toISOString())).toBe("Just now");
    expect(timeAgo(new Date(Date.now() - 5 * 60_000).toISOString())).toBe("5m ago");
    expect(timeAgo(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe("3h ago");
    expect(timeAgo(new Date(Date.now() - 2 * 86_400_000).toISOString())).toBe("2d ago");
  });
});

describe("formatDateTime", () => {
  it("handles null and invalid input without throwing", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime("garbage")).toBe("-");
  });

  it("formats a valid timestamp", () => {
    expect(formatDateTime(new Date().toISOString())).not.toBe("-");
  });
});

describe("formatBytes", () => {
  it("covers all magnitude buckets and bad input", () => {
    expect(formatBytes(null)).toBe("-");
    expect(formatBytes(-5)).toBe("-");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});

describe("formatMs", () => {
  it("covers ms and seconds plus bad input", () => {
    expect(formatMs(null)).toBe("-");
    expect(formatMs(-1)).toBe("-");
    expect(formatMs(250)).toBe("250 ms");
    expect(formatMs(1500)).toBe("1.5 s");
  });
});

describe("formatDuration", () => {
  it("handles missing endpoints and negative spans", () => {
    expect(formatDuration(null, null)).toBe("-");
    expect(formatDuration("2026-01-01T00:00:10Z", "2026-01-01T00:00:00Z")).toBe("-");
  });

  it("formats seconds and minutes", () => {
    expect(formatDuration("2026-01-01T00:00:00Z", "2026-01-01T00:00:42Z")).toBe("42s");
    expect(formatDuration("2026-01-01T00:00:00Z", "2026-01-01T00:02:05Z")).toBe("2m 5s");
  });
});

describe("formatPercent", () => {
  it("handles null and NaN", () => {
    expect(formatPercent(null)).toBe("-");
    expect(formatPercent(Number.NaN)).toBe("-");
    expect(formatPercent(99.94)).toBe("99.9%");
    expect(formatPercent(100, 0)).toBe("100%");
  });
});

describe("isInFuture", () => {
  it("is false for null, invalid, and past values", () => {
    expect(isInFuture(null)).toBe(false);
    expect(isInFuture("garbage")).toBe(false);
    expect(isInFuture(new Date(Date.now() - 1000).toISOString())).toBe(false);
  });

  it("is true for future values", () => {
    expect(isInFuture(new Date(Date.now() + 60_000).toISOString())).toBe(true);
  });
});
