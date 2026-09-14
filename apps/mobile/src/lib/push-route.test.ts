import { describe, expect, it } from "vitest";

import { routeForNotification } from "./push-route";

/**
 * Tapping an alert must land on the thing the alert was about. Guessing a
 * route from a partial payload would drop the user on the wrong page, which
 * reads as a broken app.
 */
describe("routeForNotification", () => {
  it("prefers an explicit path", () => {
    expect(routeForNotification({ path: "/change/c1", websiteId: "w1" })).toBe("/change/c1");
  });

  it("falls back to a change, then a website", () => {
    expect(routeForNotification({ changeId: "c1", websiteId: "w1" })).toBe("/change/c1");
    expect(routeForNotification({ websiteId: "w1" })).toBe("/website/w1");
  });

  it("refuses a path that is not app-relative", () => {
    // An absolute URL in the payload must never become a router target.
    expect(routeForNotification({ path: "https://evil.example.com" })).toBeNull();
    expect(routeForNotification({ path: "change/c1" })).toBeNull();
    // Protocol-relative still leaves the app.
    expect(routeForNotification({ path: "//evil.example.com" })).toBeNull();
  });

  it("returns null rather than guessing when there is nothing navigable", () => {
    expect(routeForNotification({})).toBeNull();
    expect(routeForNotification({ severity: "CRITICAL" })).toBeNull();
    expect(routeForNotification(null)).toBeNull();
    expect(routeForNotification(undefined)).toBeNull();
    expect(routeForNotification("string")).toBeNull();
    expect(routeForNotification(42)).toBeNull();
  });

  it("ignores non-string ids", () => {
    expect(routeForNotification({ websiteId: 123 })).toBeNull();
  });
});
