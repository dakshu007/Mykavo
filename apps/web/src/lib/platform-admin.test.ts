import { afterEach, describe, expect, it } from "vitest";
import { isPlatformAdmin } from "./platform-admin";

/** A signed-in user who has verified the address. */
const v = (email: string) => ({ email, emailVerified: true });

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.BLOG_ADMIN_EMAILS;
});

describe("isPlatformAdmin", () => {
  it("nobody is an admin when no allowlist is set", () => {
    // The safe default. A fresh deployment must not expose total platform
    // load to whoever signs up first.
    expect(isPlatformAdmin(v("owner@example.com"))).toBe(false);
  });

  it("matches an allowlisted email regardless of case or padding", () => {
    process.env.ADMIN_EMAILS = " Owner@Example.com , second@site.dev ";
    expect(isPlatformAdmin(v("owner@example.com"))).toBe(true);
    expect(isPlatformAdmin(v("OWNER@EXAMPLE.COM"))).toBe(true);
    expect(isPlatformAdmin(v("  second@site.dev "))).toBe(true);
  });

  it("rejects anyone not on the list", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isPlatformAdmin(v("customer@example.com"))).toBe(false);
    expect(isPlatformAdmin(v(""))).toBe(false);
    expect(isPlatformAdmin(null)).toBe(false);
    expect(isPlatformAdmin(undefined)).toBe(false);
  });

  it("is not fooled by a substring of an allowlisted address", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isPlatformAdmin(v("owner@example.com.attacker.dev"))).toBe(false);
    expect(isPlatformAdmin(v("notowner@example.com"))).toBe(false);
  });

  it("falls back to BLOG_ADMIN_EMAILS so an existing deployment keeps access", () => {
    process.env.BLOG_ADMIN_EMAILS = "blogger@example.com";
    expect(isPlatformAdmin(v("blogger@example.com"))).toBe(true);
  });

  it("lets an explicit ADMIN_EMAILS narrow the list, not just widen it", () => {
    // The point of the separate variable: being able to grant blog access
    // WITHOUT granting the infrastructure view.
    process.env.BLOG_ADMIN_EMAILS = "blogger@example.com,owner@example.com";
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isPlatformAdmin(v("owner@example.com"))).toBe(true);
    expect(isPlatformAdmin(v("blogger@example.com"))).toBe(false);
  });

  it.each(["", "   ", ","])(
    "an ADMIN_EMAILS of %o turns the page off rather than falling back",
    (raw) => {
      // Setting the variable empty is an operator disabling this page.
      // Honouring BLOG_ADMIN_EMAILS there would quietly re-enable a view of
      // every workspace's totals - so presence of the variable decides, not
      // whether it parsed to any entries.
      process.env.BLOG_ADMIN_EMAILS = "blogger@example.com";
      process.env.ADMIN_EMAILS = raw;
      expect(isPlatformAdmin(v("blogger@example.com"))).toBe(false);
    },
  );

  it("never trusts an unverified email, even one on the list", () => {
    // Signup does not prove ownership of the address. Without this, whoever
    // registers the owner's email first would inherit the admin pages.
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isPlatformAdmin({ email: "owner@example.com", emailVerified: false })).toBe(false);
    expect(isPlatformAdmin({ email: "owner@example.com", emailVerified: null })).toBe(false);
    expect(isPlatformAdmin({ email: "owner@example.com", emailVerified: undefined })).toBe(false);
  });

  it("refuses a bare email string, which carries no proof of ownership", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isPlatformAdmin("owner@example.com")).toBe(false);
  });
});
