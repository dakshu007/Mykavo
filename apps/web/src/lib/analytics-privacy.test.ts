import { describe, expect, it } from "vitest";
import {
  analyticsPageLocation,
  analyticsReferrer,
  isPrivateAnalyticsPath,
  redactPrivatePath,
} from "./analytics-privacy";

const ORIGIN = "https://mykavo.app";

describe("isPrivateAnalyticsPath", () => {
  it("flags token pages, the app, sign-in and connect screens", () => {
    for (const p of [
      "/dashboard",
      "/dashboard/websites/abc",
      "/r/tok_123",
      "/status/abc123",
      "/invite/xyz",
      "/unsubscribe",
      "/login",
      "/signup",
      "/connect/wordpress",
      "/shopify-app",
    ]) {
      expect(isPrivateAnalyticsPath(p), p).toBe(true);
    }
  });

  it("leaves public pages alone", () => {
    for (const p of ["/", "/pricing", "/reports", "/statuspage-alternative", "/blog/x"]) {
      expect(isPrivateAnalyticsPath(p), p).toBe(false);
    }
  });
});

describe("redactPrivatePath", () => {
  it("replaces every segment after a token prefix", () => {
    expect(redactPrivatePath("/r/AbC123secret")).toBe("/r/:token");
    expect(redactPrivatePath("/status/my-status-token")).toBe("/status/:token");
    expect(redactPrivatePath("/invite/abc/extra")).toBe("/invite/:token/:token");
  });

  it("replaces id-like segments elsewhere and keeps route names", () => {
    expect(redactPrivatePath("/dashboard/websites/cm9x2k3l40000abcd1234efgh")).toBe(
      "/dashboard/websites/:token",
    );
    expect(redactPrivatePath("/dashboard/support-questions")).toBe("/dashboard/support-questions");
    expect(redactPrivatePath("/connect/wordpress")).toBe("/connect/wordpress");
  });
});

describe("analyticsPageLocation", () => {
  it("strips the query on private pages", () => {
    expect(
      analyticsPageLocation(ORIGIN, "/connect/wordpress", "?state=s3cr3t&challenge=abc"),
    ).toBe(`${ORIGIN}/connect/wordpress`);
    expect(analyticsPageLocation(ORIGIN, "/unsubscribe", "?t=tok")).toBe(`${ORIGIN}/unsubscribe`);
    expect(analyticsPageLocation(ORIGIN, "/r/tok_abc", "")).toBe(`${ORIGIN}/r/:token`);
  });

  it("keeps public pages, query included", () => {
    expect(analyticsPageLocation(ORIGIN, "/pricing", "?utm_source=x")).toBe(
      `${ORIGIN}/pricing?utm_source=x`,
    );
    expect(analyticsPageLocation(ORIGIN, "/", "")).toBe(`${ORIGIN}/`);
  });
});

describe("analyticsReferrer", () => {
  it("redacts a same-site private referrer", () => {
    expect(analyticsReferrer(`${ORIGIN}/r/secret-token-123?x=1`, ORIGIN)).toBe(`${ORIGIN}/r/:token`);
  });

  it("keeps another site's referrer and handles empty or bad values", () => {
    expect(analyticsReferrer("https://www.google.com/", ORIGIN)).toBe("https://www.google.com/");
    expect(analyticsReferrer("", ORIGIN)).toBe("");
    expect(analyticsReferrer("not a url", ORIGIN)).toBe("");
  });
});
