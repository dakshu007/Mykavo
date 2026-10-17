import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isBlogAdmin, parseAdminEmails, verifiedAdminEmail } from "./blog-admin";

/** A signed-in user who has verified the address. */
const v = (email: string) => ({ email, emailVerified: true });

describe("parseAdminEmails", () => {
  it("splits, trims, and lowercases entries", () => {
    expect(parseAdminEmails(" Owner@Example.com ,  second@site.dev ")).toEqual([
      "owner@example.com",
      "second@site.dev",
    ]);
  });

  it("drops empty entries", () => {
    expect(parseAdminEmails("a@b.com,,  ,c@d.com,")).toEqual(["a@b.com", "c@d.com"]);
  });

  it("returns an empty list for undefined or empty input", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
  });
});

describe("isBlogAdmin", () => {
  const original = process.env.BLOG_ADMIN_EMAILS;

  beforeEach(() => {
    process.env.BLOG_ADMIN_EMAILS = "owner@example.com, Second@Site.dev";
  });

  afterEach(() => {
    if (original === undefined) delete process.env.BLOG_ADMIN_EMAILS;
    else process.env.BLOG_ADMIN_EMAILS = original;
  });

  it("accepts allowlisted emails", () => {
    expect(isBlogAdmin(v("owner@example.com"))).toBe(true);
  });

  it("is case-insensitive on both sides", () => {
    expect(isBlogAdmin(v("OWNER@Example.COM"))).toBe(true);
    expect(isBlogAdmin(v("second@site.dev"))).toBe(true);
  });

  it("trims the candidate email", () => {
    expect(isBlogAdmin(v("  owner@example.com  "))).toBe(true);
  });

  it("rejects emails not on the list", () => {
    expect(isBlogAdmin(v("intruder@example.com"))).toBe(false);
  });

  it("rejects null, undefined, and empty emails", () => {
    expect(isBlogAdmin(null)).toBe(false);
    expect(isBlogAdmin(undefined)).toBe(false);
    expect(isBlogAdmin(v(""))).toBe(false);
  });

  it("rejects everyone when the allowlist is unset", () => {
    delete process.env.BLOG_ADMIN_EMAILS;
    expect(isBlogAdmin(v("owner@example.com"))).toBe(false);
  });

  it("never trusts an unverified email, even one on the list", () => {
    expect(isBlogAdmin({ email: "owner@example.com", emailVerified: false })).toBe(false);
    expect(isBlogAdmin({ email: "owner@example.com", emailVerified: null })).toBe(false);
  });

  it("refuses a bare email string, which carries no proof of ownership", () => {
    expect(isBlogAdmin("owner@example.com")).toBe(false);
  });
});

describe("verifiedAdminEmail", () => {
  it("returns the normalized address only when verified", () => {
    expect(verifiedAdminEmail({ email: "  Owner@Example.com ", emailVerified: true })).toBe("owner@example.com");
    expect(verifiedAdminEmail({ email: "owner@example.com", emailVerified: false })).toBeNull();
    expect(verifiedAdminEmail({ email: "", emailVerified: true })).toBeNull();
    expect(verifiedAdminEmail({ email: null, emailVerified: true })).toBeNull();
    expect(verifiedAdminEmail("owner@example.com")).toBeNull();
    expect(verifiedAdminEmail(null)).toBeNull();
  });
});
