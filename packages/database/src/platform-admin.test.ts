import { describe, expect, it } from "vitest";
import { isPlatformAdminEmail, platformAdminEmails } from "./platform-admin";

describe("platform admin allowlist", () => {
  it("reads ADMIN_EMAILS, trimmed and lowercased", () => {
    expect(platformAdminEmails({ ADMIN_EMAILS: " Owner@MyKavo.app , ops@mykavo.app,," })).toEqual([
      "owner@mykavo.app",
      "ops@mykavo.app",
    ]);
  });

  it("falls back to BLOG_ADMIN_EMAILS only when ADMIN_EMAILS is absent", () => {
    expect(platformAdminEmails({ BLOG_ADMIN_EMAILS: "blog@mykavo.app" })).toEqual(["blog@mykavo.app"]);
    expect(platformAdminEmails({ ADMIN_EMAILS: "", BLOG_ADMIN_EMAILS: "blog@mykavo.app" })).toEqual([]);
  });

  it("matches case-insensitively and rejects empty input", () => {
    const env = { ADMIN_EMAILS: "owner@mykavo.app" };
    expect(isPlatformAdminEmail("  OWNER@mykavo.app ", env)).toBe(true);
    expect(isPlatformAdminEmail("someone@else.com", env)).toBe(false);
    expect(isPlatformAdminEmail(null, env)).toBe(false);
    expect(isPlatformAdminEmail("owner@mykavo.app", {})).toBe(false);
  });
});
