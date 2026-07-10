import { describe, expect, it } from "vitest";
import { identifyScriptService, SCRIPT_SERVICES } from "@fluxen/shared/script-services";

describe("identifyScriptService", () => {
  const cases: Array<[string, string]> = [
    ["https://www.googletagmanager.com/gtm.js?id=GTM-XYZ", "Google Tag Manager"],
    ["https://www.googletagmanager.com/gtag/js?id=G-12345", "Google Analytics"],
    ["https://www.google-analytics.com/analytics.js", "Google Analytics"],
    ["https://connect.facebook.net/en_US/fbevents.js", "Meta Pixel"],
    ["https://js.stripe.com/v3/", "Stripe"],
    ["https://static.hotjar.com/c/hotjar-123.js", "Hotjar"],
    ["https://widget.intercom.io/widget/abc123", "Intercom"],
    ["https://js.intercomcdn.com/shim.latest.js", "Intercom"],
    ["https://js.hs-scripts.com/1234567.js", "HubSpot"],
    ["https://www.clarity.ms/tag/abcdef", "Microsoft Clarity"],
    ["https://plausible.io/js/script.js", "Plausible"],
  ];

  it.each(cases)("identifies %s as %s", (src, expected) => {
    expect(identifyScriptService(src)).toBe(expected);
  });

  it("returns null for unknown scripts", () => {
    expect(identifyScriptService("https://example.com/js/app.js")).toBeNull();
    expect(identifyScriptService("https://cdn.unknown-vendor.io/sdk.js")).toBeNull();
  });

  it("identifies gtag.js as Google Analytics, not Tag Manager (order matters)", () => {
    const gtagIndex = SCRIPT_SERVICES.findIndex(([re]) => re.test("https://www.googletagmanager.com/gtag/js"));
    const gtmIndex = SCRIPT_SERVICES.findIndex(([, name]) => name === "Google Tag Manager");
    expect(gtagIndex).toBeGreaterThanOrEqual(0);
    expect(gtagIndex).toBeLessThan(gtmIndex);
    expect(identifyScriptService("https://www.googletagmanager.com/gtag/js?id=G-1")).toBe(
      "Google Analytics",
    );
  });
});
