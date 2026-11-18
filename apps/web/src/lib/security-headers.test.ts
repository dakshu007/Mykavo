import { describe, expect, it } from "vitest";
import { cspHeader, securityHeaders, CSP_REPORT_PATH } from "./security-headers";

const byKey = (key: string) =>
  securityHeaders.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;

// Tests run outside production, where the header is report-only; the
// production header is checked through cspHeader("production").
const csp = byKey("Content-Security-Policy-Report-Only") ?? "";
const enforced = cspHeader("production");

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
  // Enforced in production since November 2026, after a report-only period.
  // Development stays report-only: the dev server's tooling uses eval.
  it("enforces in production and only reports in development", () => {
    expect(enforced.key).toBe("Content-Security-Policy");
    expect(enforced.value).toContain(`report-uri ${CSP_REPORT_PATH}`);
    expect(enforced.value).toContain("upgrade-insecure-requests");
    expect(cspHeader("development").key).toBe("Content-Security-Policy-Report-Only");
    expect(byKey("Content-Security-Policy")).toBeUndefined();
  });

  // The analytics hosts real violation reports showed GA4 posting to.
  it("lets Google Analytics send its data", () => {
    for (const host of ["https://analytics.google.com", "https://stats.g.doubleclick.net", "https://*.google-analytics.com"]) {
      expect(enforced.value).toContain(host);
    }
  });

  // Approve forms (WordPress, AI assistant connect) redirect to the
  // customer's own site after posting, and Chrome checks that redirect
  // against form-action: 'self' alone would break every connection.
  it("lets approve forms redirect to the customer's site, but no other scheme", () => {
    const formAction = enforced.value.split(";").find((d) => d.trim().startsWith("form-action")) ?? "";
    expect(formAction.trim().split(/\s+/).slice(1).sort()).toEqual(["'self'", "http:", "https:"]);
  });

  it("locks down the directives that work even with 'unsafe-inline' scripts", () => {
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("default-src 'self'");
  });

  it("lets blog narration play from signed R2 URLs, and only media", () => {
    const mediaSrc = enforced.value.split(";").find((d) => d.trim().startsWith("media-src")) ?? "";
    expect(mediaSrc.trim().split(/\s+/).slice(1).sort()).toEqual([
      "'self'",
      "https://*.r2.cloudflarestorage.com",
    ]);
    const scriptSrc = enforced.value.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
    expect(scriptSrc).not.toContain("r2.cloudflarestorage.com");
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

  it("keeps enforce-only directives out of the report-only policy", () => {
    // Ignored there by browsers, with a console warning on every page load.
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});
