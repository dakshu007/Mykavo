import { describe, expect, it } from "vitest";
import { securityHeaders, CSP_REPORT_PATH } from "./security-headers";

const byKey = (key: string) =>
  securityHeaders.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;

const csp = byKey("Content-Security-Policy-Report-Only") ?? "";

describe("security headers", () => {
  // The regression this file exists for: next.config returned [] in
  // production, so the live site sent none of these at all.
  it("ships every header the production site was missing", () => {
    for (const key of [
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Content-Security-Policy-Report-Only",
    ]) {
      expect(byKey(key), `${key} is missing`).toBeTruthy();
    }
  });

  it("sets HSTS for two years across subdomains", () => {
    expect(byKey("Strict-Transport-Security")).toContain("max-age=63072000");
    expect(byKey("Strict-Transport-Security")).toContain("includeSubDomains");
  });

  // preload is close to irreversible; it must be a deliberate decision, not a
  // side effect of turning headers on.
  it("does not silently opt into the HSTS preload list", () => {
    expect(byKey("Strict-Transport-Security")).not.toContain("preload");
  });

  it("blocks MIME sniffing and third-party framing", () => {
    expect(byKey("X-Content-Type-Options")).toBe("nosniff");
    expect(byKey("X-Frame-Options")).toBe("SAMEORIGIN");
  });

  it("keeps dashboard URLs out of cross-site Referer headers", () => {
    expect(byKey("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
});

describe("content security policy", () => {
  // Enforcing on the first deploy risks taking the whole site down over one
  // forgotten asset. Report-only first, tighten from real violations.
  it("ships report-only, not enforcing", () => {
    expect(byKey("Content-Security-Policy")).toBeUndefined();
    expect(csp).toContain(`report-uri ${CSP_REPORT_PATH}`);
  });

  it("locks down the directives that work even with 'unsafe-inline' scripts", () => {
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("default-src 'self'");
  });

  it("allows exactly the third parties the app really loads", () => {
    expect(csp).toContain("https://www.googletagmanager.com");
    expect(csp).toContain("https://*.google-analytics.com");
    expect(csp).toContain("https://checkout.dodopayments.com");
  });

  // A bare `https:` scheme source or a `*` host would let an attacker who can
  // inject a <script src> pull code from anywhere. Checked per token, since
  // every allowed origin legitimately contains the substring "https:".
  it("does not allow arbitrary remote scripts", () => {
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
    const sources = scriptSrc.trim().split(/\s+/).slice(1);
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source, `${source} is a wildcard source`).not.toBe("https:");
      expect(source).not.toBe("*");
      expect(source).not.toBe("data:");
      expect(source.startsWith("https://*")).toBe(false);
    }
  });

  it("upgrades any stray http subresource", () => {
    expect(csp).toContain("upgrade-insecure-requests");
  });
});
