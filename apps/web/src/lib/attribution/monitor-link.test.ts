import { describe, expect, it } from "vitest";
import { addWebsitePath, displayHost, monitorableUrl, signupHref } from "./monitor-link";
import { safeNextPath } from "@/lib/team";

describe("monitor links", () => {
  it("accepts only plain http(s) pages", () => {
    expect(monitorableUrl("https://www.example.com/pricing?x=1#a")).toBe("https://www.example.com/pricing");
    expect(monitorableUrl("https://example.com/")).toBe("https://example.com");
    expect(monitorableUrl("ftp://example.com")).toBeNull();
    expect(monitorableUrl("https://user:pw@example.com")).toBeNull();
    expect(monitorableUrl("nonsense")).toBeNull();
    expect(monitorableUrl(undefined)).toBeNull();
  });

  it("shows a short host", () => {
    expect(displayHost("https://www.example.com/a")).toBe("example.com");
  });

  it("builds a sign-up link whose next path the signup page accepts", () => {
    const href = signupHref({ url: "https://example.com/pricing", from: "tool:meta-tag-checker", google: true });
    const params = new URL(href, "https://mykavo.app").searchParams;
    expect(params.get("provider")).toBe("google");
    expect(params.get("from")).toBe("tool:meta-tag-checker");
    expect(params.get("next")).toBe(addWebsitePath("https://example.com/pricing"));
    expect(safeNextPath(params.get("next"))).toBe(params.get("next"));
    expect(signupHref({ url: null, from: "x", google: false })).toBe("/signup?from=x");
  });
});
