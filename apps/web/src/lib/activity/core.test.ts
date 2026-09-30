import { describe, expect, it } from "vitest";
import { appClientFrom, describeUserAgent, lastDays, normalizePagePath, pageLabel, routeOf } from "./core";

describe("appClientFrom", () => {
  it("reads the app's own header first", () => {
    expect(appClientFrom("okhttp/4.12.0", "android/1.0.2")).toEqual({ platform: "android", version: "1.0.2" });
  });
  it("recognises older app builds by React Native's HTTP stack", () => {
    expect(appClientFrom("okhttp/4.9.2", null)).toEqual({ platform: "android", version: null });
  });
  it("does not mistake browsers, or a bad header, for the app", () => {
    expect(appClientFrom("Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36", null)).toBeNull();
    expect(appClientFrom("Mozilla/5.0", "android/<script>")).toBeNull();
  });
});

describe("describeUserAgent", () => {
  it("names browsers and systems", () => {
    expect(describeUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15").label).toBe("Safari on macOS");
    expect(describeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0").label).toBe("Edge on Windows");
    expect(describeUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36").label).toBe("Chrome on Android");
    expect(describeUserAgent("okhttp/4.12.0")).toEqual({ label: "Android app", app: true });
    expect(describeUserAgent(null).label).toBe("Unknown device");
  });
});

describe("page paths", () => {
  it("keeps dashboard paths only, without query or trailing slash", () => {
    expect(normalizePagePath("/dashboard/changes?severity=HIGH#x")).toBe("/dashboard/changes");
    expect(normalizePagePath("/dashboard/")).toBe("/dashboard");
    expect(normalizePagePath("/pricing")).toBeNull();
    expect(normalizePagePath("/dashboard/<script>")).toBeNull();
    expect(normalizePagePath(42)).toBeNull();
  });
  it("groups ids and names routes", () => {
    const r = routeOf("/dashboard/websites/cm9x2k4lq0000abcdefghij12/seo");
    expect(r).toBe("/dashboard/websites/[id]/seo");
    expect(pageLabel(r)).toBe("SEO report");
    expect(pageLabel("/dashboard")).toBe("Overview");
    expect(pageLabel("/dashboard/something-new")).toBe("something-new");
  });
});

describe("lastDays", () => {
  it("ends today, oldest first", () => {
    expect(lastDays(3, new Date("2026-10-01T05:00:00Z"))).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
  });
});
