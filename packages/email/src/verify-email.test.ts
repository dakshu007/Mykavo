import { describe, expect, it } from "vitest";
import { verifyEmailEmail, VERIFY_EMAIL_SUBJECT } from "./verify-email";

const base = {
  name: "Ada Lovelace",
  verifyUrl: "https://mykavo.app/api/auth/verify-email?token=abc&callbackURL=%2Fdashboard",
  expiresInHours: 1,
  trialDays: 14,
};

describe("verifyEmailEmail", () => {
  it("links to the verification URL in both html and text", () => {
    const email = verifyEmailEmail(base);
    expect(email.subject).toBe(VERIFY_EMAIL_SUBJECT);
    expect(email.html).toContain('href="https://mykavo.app/api/auth/verify-email?token=abc&amp;callbackURL=%2Fdashboard"');
    expect(email.text).toContain(base.verifyUrl);
    expect(email.text).toContain("Hi Ada,");
    expect(email.text).toContain("expires in 1 hour.");
  });

  it("mentions the trial only when one is offered", () => {
    expect(verifyEmailEmail(base).text).toContain("14-day Pro trial");
    expect(verifyEmailEmail({ ...base, trialDays: null }).text).not.toContain("trial");
  });

  it("escapes everything it interpolates", () => {
    const email = verifyEmailEmail({
      ...base,
      name: '<img src=x onerror="alert(1)">',
      verifyUrl: 'https://mykavo.app/x?"><script>alert(1)</script>',
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("falls back to a plain greeting without a name", () => {
    expect(verifyEmailEmail({ ...base, name: "  " }).text.startsWith("Hi,")).toBe(true);
  });

  it("uses no em or en dashes", () => {
    const email = verifyEmailEmail(base);
    expect(`${email.subject}${email.html}${email.text}`).not.toMatch(/[–—]/);
  });
});
