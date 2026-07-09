import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isBlogAdmin, parseAdminEmails } from "./blog-admin";

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
    expect(isBlogAdmin("owner@example.com")).toBe(true);
  });

  it("is case-insensitive on both sides", () => {
    expect(isBlogAdmin("OWNER@Example.COM")).toBe(true);
    expect(isBlogAdmin("second@site.dev")).toBe(true);
  });

  it("trims the candidate email", () => {
    expect(isBlogAdmin("  owner@example.com  ")).toBe(true);
  });

  it("rejects emails not on the list", () => {
    expect(isBlogAdmin("intruder@example.com")).toBe(false);
  });

  it("rejects null, undefined, and empty emails", () => {
    expect(isBlogAdmin(null)).toBe(false);
    expect(isBlogAdmin(undefined)).toBe(false);
    expect(isBlogAdmin("")).toBe(false);
  });

  it("rejects everyone when the allowlist is unset", () => {
    delete process.env.BLOG_ADMIN_EMAILS;
    expect(isBlogAdmin("owner@example.com")).toBe(false);
  });
});
