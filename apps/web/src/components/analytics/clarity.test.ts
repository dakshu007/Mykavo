import { describe, expect, it } from "vitest";
import { isClarityPath } from "./clarity";

describe("Clarity page scope", () => {
  it("records public marketing pages", () => {
    for (const p of ["/", "/pricing", "/blog", "/blog/wordpress-monitoring", "/tools/meta-tag-checker", "/dashboard-preview-guide", "/preview", "/reports"]) {
      expect(isClarityPath(p), p).toBe(true);
    }
  });

  it("never records the app, personal pages or sign-in", () => {
    for (const p of ["/dashboard", "/dashboard/websites/abc", "/r/tok_123", "/invite/xyz", "/unsubscribe/abc", "/login", "/signup", "/connect", "/shopify-app"]) {
      expect(isClarityPath(p), p).toBe(false);
    }
  });
});
