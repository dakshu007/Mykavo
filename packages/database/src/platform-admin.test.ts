import { describe, expect, it } from "vitest";
import { isInternalEmail, isPlatformAdminEmail, platformAdminEmails } from "./platform-admin";

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

describe("isInternalEmail", () => {
  const env = { ADMIN_EMAILS: "daksheshbabu@gmail.com" };

  it("counts the admins and the company domain as the team", () => {
    expect(isInternalEmail("DakSheshBabu@gmail.com", env)).toBe(true);
    expect(isInternalEmail("dakshesh@mykavo.app", env)).toBe(true);
    expect(isInternalEmail("test@mykavo.app", env)).toBe(true);
  });

  it("never counts a customer as internal", () => {
    expect(isInternalEmail("bas@modyn.com", env)).toBe(false);
    expect(isInternalEmail("someone@notmykavo.app", env)).toBe(false);
  });

  it("honours an explicit exclusion list and a custom domain list", () => {
    expect(isInternalEmail("me@gmail.com", { ...env, MARKETING_EXCLUDE_EMAILS: "Me@gmail.com" })).toBe(true);
    expect(isInternalEmail("dakshesh@mykavo.app", { ...env, INTERNAL_EMAIL_DOMAINS: "example.com" })).toBe(false);
  });
});
