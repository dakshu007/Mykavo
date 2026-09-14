import { afterEach, describe, expect, it } from "vitest";
import { isPlatformAdmin } from "./platform-admin";

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.BLOG_ADMIN_EMAILS;
});

describe("isPlatformAdmin", () => {
  it("nobody is an admin when no allowlist is set", () => {
    // The safe default. A fresh deployment must not expose total platform
    // load to whoever signs up first.
    expect(isPlatformAdmin("owner@example.com")).toBe(false);
  });

  it("matches an allowlisted email regardless of case or padding", () => {
    process.env.ADMIN_EMAILS = " Owner@Example.com , second@site.dev ";
    expect(isPlatformAdmin("owner@example.com")).toBe(true);
    expect(isPlatformAdmin("OWNER@EXAMPLE.COM")).toBe(true);
    expect(isPlatformAdmin("  second@site.dev ")).toBe(true);
  });

  it("rejects anyone not on the list", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isPlatformAdmin("customer@example.com")).toBe(false);
    expect(isPlatformAdmin("")).toBe(false);
    expect(isPlatformAdmin(null)).toBe(false);
    expect(isPlatformAdmin(undefined)).toBe(false);
  });

  it("is not fooled by a substring of an allowlisted address", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isPlatformAdmin("owner@example.com.attacker.dev")).toBe(false);
    expect(isPlatformAdmin("notowner@example.com")).toBe(false);
  });

  it("falls back to BLOG_ADMIN_EMAILS so an existing deployment keeps access", () => {
    process.env.BLOG_ADMIN_EMAILS = "blogger@example.com";
    expect(isPlatformAdmin("blogger@example.com")).toBe(true);
  });

  it("lets an explicit ADMIN_EMAILS narrow the list, not just widen it", () => {
    // The point of the separate variable: being able to grant blog access
    // WITHOUT granting the infrastructure view.
    process.env.BLOG_ADMIN_EMAILS = "blogger@example.com,owner@example.com";
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isPlatformAdmin("owner@example.com")).toBe(true);
    expect(isPlatformAdmin("blogger@example.com")).toBe(false);
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
      expect(isPlatformAdmin("blogger@example.com")).toBe(false);
    },
  );
});
