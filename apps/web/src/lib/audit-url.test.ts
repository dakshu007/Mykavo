import { describe, expect, it } from "vitest";
import { MAX_AUDIT_PATH_LENGTH, resolveAuditUrl } from "./audit-url";

const SITE = "https://example.com";

describe("resolveAuditUrl", () => {
  describe("homepage (no path)", () => {
    it("returns the website URL unchanged when no path is given", () => {
      expect(resolveAuditUrl(SITE)).toEqual({ ok: true, url: SITE });
      expect(resolveAuditUrl(SITE, undefined)).toEqual({ ok: true, url: SITE });
      expect(resolveAuditUrl(SITE, null)).toEqual({ ok: true, url: SITE });
    });

    it("treats empty and whitespace-only paths as homepage", () => {
      expect(resolveAuditUrl(SITE, "")).toEqual({ ok: true, url: SITE });
      expect(resolveAuditUrl(SITE, "   ")).toEqual({ ok: true, url: SITE });
    });

    it("rejects an invalid website URL", () => {
      expect(resolveAuditUrl("not a url", "/pricing").ok).toBe(false);
    });
  });

  describe("valid paths", () => {
    it("resolves absolute paths against the website origin", () => {
      expect(resolveAuditUrl(SITE, "/pricing")).toEqual({
        ok: true,
        url: "https://example.com/pricing",
      });
    });

    it("keeps query strings", () => {
      expect(resolveAuditUrl(SITE, "/pricing?tab=agency")).toEqual({
        ok: true,
        url: "https://example.com/pricing?tab=agency",
      });
    });

    it("strips hash fragments", () => {
      expect(resolveAuditUrl(SITE, "/pricing#faq")).toEqual({
        ok: true,
        url: "https://example.com/pricing",
      });
      expect(resolveAuditUrl(SITE, "https://example.com/docs?v=2#install")).toEqual({
        ok: true,
        url: "https://example.com/docs?v=2",
      });
    });

    it("accepts full same-origin URLs", () => {
      expect(resolveAuditUrl(SITE, "https://example.com/about")).toEqual({
        ok: true,
        url: "https://example.com/about",
      });
    });

    it("resolves relative paths (no leading slash) against the base", () => {
      expect(resolveAuditUrl(SITE, "pricing")).toEqual({
        ok: true,
        url: "https://example.com/pricing",
      });
    });

    it("resolves paths against the origin even when the website URL has a path", () => {
      expect(resolveAuditUrl("https://example.com/home", "/pricing")).toEqual({
        ok: true,
        url: "https://example.com/pricing",
      });
    });

    it("trims surrounding whitespace before resolving", () => {
      expect(resolveAuditUrl(SITE, "  /pricing  ")).toEqual({
        ok: true,
        url: "https://example.com/pricing",
      });
    });
  });

  describe("cross-origin rejection", () => {
    it("rejects other domains", () => {
      expect(resolveAuditUrl(SITE, "https://evil.com/steal").ok).toBe(false);
    });

    it("rejects subdomains (exact origin match required)", () => {
      expect(resolveAuditUrl(SITE, "https://sub.example.com/").ok).toBe(false);
    });

    it("rejects the same host on a different port", () => {
      expect(resolveAuditUrl(SITE, "https://example.com:8443/x").ok).toBe(false);
    });

    it("rejects protocol downgrades to http", () => {
      expect(resolveAuditUrl(SITE, "http://example.com/x").ok).toBe(false);
    });

    it("rejects protocol-relative URLs pointing elsewhere", () => {
      expect(resolveAuditUrl(SITE, "//evil.com/x").ok).toBe(false);
    });

    it("rejects the backslash variant of protocol-relative URLs", () => {
      // WHATWG parsing treats "\" like "/" — "/\evil.com" is "//evil.com".
      expect(resolveAuditUrl(SITE, "/\\evil.com").ok).toBe(false);
    });

    it("rejects lookalike domains", () => {
      expect(resolveAuditUrl(SITE, "https://example.com.evil.com/").ok).toBe(false);
    });

    it("includes the allowed hostname in the error message", () => {
      const result = resolveAuditUrl(SITE, "https://evil.com/");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("example.com");
    });
  });

  describe("scheme and credential rejection", () => {
    it("rejects javascript: URLs", () => {
      expect(resolveAuditUrl(SITE, "javascript:alert(1)").ok).toBe(false);
    });

    it("rejects data: URLs", () => {
      expect(resolveAuditUrl(SITE, "data:text/html,<h1>hi</h1>").ok).toBe(false);
    });

    it("rejects file: URLs", () => {
      expect(resolveAuditUrl(SITE, "file:///etc/passwd").ok).toBe(false);
    });

    it("rejects same-origin URLs carrying credentials", () => {
      // URL.origin ignores userinfo, so this must be caught explicitly.
      expect(resolveAuditUrl(SITE, "https://user:pass@example.com/").ok).toBe(false);
      expect(resolveAuditUrl(SITE, "https://user@example.com/").ok).toBe(false);
    });
  });

  describe("input limits", () => {
    it("rejects absurdly long paths", () => {
      const long = `/${"a".repeat(MAX_AUDIT_PATH_LENGTH)}`;
      expect(resolveAuditUrl(SITE, long).ok).toBe(false);
    });

    it("accepts paths at the limit", () => {
      const atLimit = `/${"a".repeat(MAX_AUDIT_PATH_LENGTH - 1)}`;
      expect(resolveAuditUrl(SITE, atLimit).ok).toBe(true);
    });
  });
});
