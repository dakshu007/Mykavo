import { describe, expect, it } from "vitest";
import {
  buildChangePrefill,
  buildServiceRequestEmail,
  escapeHtml,
  isAcceptableWebsiteUrl,
  isChangeId,
  isServiceKind,
  normalizeWebsiteUrl,
  serviceRequestSchema,
} from "./request";

const VALID = {
  name: "Sam Rivera",
  email: "Sam@Example.COM",
  websiteUrl: "example.com",
  message: "The checkout button stopped working after an update.",
  urgency: "this_week",
};

describe("normalizeWebsiteUrl", () => {
  it("adds https to a bare domain", () => {
    expect(normalizeWebsiteUrl(" example.com/shop ")).toBe("https://example.com/shop");
  });

  it("keeps an explicit scheme as written", () => {
    expect(normalizeWebsiteUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeWebsiteUrl("ftp://example.com")).toBe("ftp://example.com");
  });
});

describe("isAcceptableWebsiteUrl", () => {
  it("accepts http and https sites", () => {
    expect(isAcceptableWebsiteUrl("https://example.com")).toBe(true);
    expect(isAcceptableWebsiteUrl("http://shop.example.co.uk/path?q=1")).toBe(true);
  });

  it("rejects other schemes, credentials and bare words", () => {
    expect(isAcceptableWebsiteUrl("ftp://example.com")).toBe(false);
    expect(isAcceptableWebsiteUrl("javascript:alert(1)")).toBe(false);
    expect(isAcceptableWebsiteUrl("https://user:pass@example.com")).toBe(false);
    expect(isAcceptableWebsiteUrl("https://hello")).toBe(false);
    expect(isAcceptableWebsiteUrl("not a url")).toBe(false);
  });
});

describe("serviceRequestSchema", () => {
  it("accepts a valid request, normalising email and website", () => {
    const result = serviceRequestSchema.parse(VALID);
    expect(result.email).toBe("sam@example.com");
    expect(result.websiteUrl).toBe("https://example.com");
    expect(result.kind).toBe("fix");
    expect(result.platform).toBeUndefined();
  });

  it("accepts every optional field when valid", () => {
    const result = serviceRequestSchema.parse({
      ...VALID,
      kind: "care_plan",
      platform: "shopify",
      changeEventId: "cmabc123def456",
    });
    expect(result.kind).toBe("care_plan");
    expect(result.platform).toBe("shopify");
  });

  it("rejects a javascript: website with a readable message", () => {
    const result = serviceRequestSchema.safeParse({ ...VALID, websiteUrl: "javascript:alert(1)" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toMatch(/website address/i);
  });

  it("rejects a bad email, a short message and an unknown urgency", () => {
    expect(serviceRequestSchema.safeParse({ ...VALID, email: "nope" }).success).toBe(false);
    expect(serviceRequestSchema.safeParse({ ...VALID, message: "broken" }).success).toBe(false);
    expect(serviceRequestSchema.safeParse({ ...VALID, urgency: "yesterday" }).success).toBe(false);
  });

  it("enforces length caps", () => {
    expect(serviceRequestSchema.safeParse({ ...VALID, name: "a".repeat(121) }).success).toBe(false);
    expect(serviceRequestSchema.safeParse({ ...VALID, message: "a".repeat(4001) }).success).toBe(
      false,
    );
    expect(
      serviceRequestSchema.safeParse({ ...VALID, websiteUrl: `https://${"a".repeat(500)}.com` })
        .success,
    ).toBe(false);
  });

  it("rejects an unknown kind or platform and a malformed change id", () => {
    expect(serviceRequestSchema.safeParse({ ...VALID, kind: "build_site" }).success).toBe(false);
    expect(serviceRequestSchema.safeParse({ ...VALID, platform: "joomla" }).success).toBe(false);
    expect(
      serviceRequestSchema.safeParse({ ...VALID, changeEventId: "../../etc/passwd" }).success,
    ).toBe(false);
  });
});

describe("guards", () => {
  it("recognises kinds and change ids", () => {
    expect(isServiceKind("care_plan")).toBe(true);
    expect(isServiceKind("CARE_PLAN")).toBe(false);
    expect(isServiceKind(null)).toBe(false);
    expect(isChangeId("cmabc123def456")).toBe(true);
    expect(isChangeId("short")).toBe(false);
    expect(isChangeId("<script>")).toBe(false);
  });
});

describe("escapeHtml", () => {
  it("escapes every HTML-significant character", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
});

describe("buildServiceRequestEmail", () => {
  it("escapes all user values and never emits raw markup from the request", () => {
    const data = serviceRequestSchema.parse({
      ...VALID,
      name: `<img src=x onerror=alert(1)>`,
      message: `Help <script>alert("x")</script> please`,
    });
    const email = buildServiceRequestEmail(data, { requestId: "req_1" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.text).toContain("Help <script>");
  });

  it("builds a one-line subject with kind, urgency and host", () => {
    const data = serviceRequestSchema.parse({ ...VALID, urgency: "today", kind: "fix" });
    const email = buildServiceRequestEmail(data, { requestId: "req_1" });
    expect(email.subject).toBe("Service request (One-off fix, Today): example.com");
    expect(email.subject).not.toMatch(/[\r\n]/);
  });

  it("includes the change link and workspace when present", () => {
    const data = serviceRequestSchema.parse(VALID);
    const email = buildServiceRequestEmail(data, {
      requestId: "req_1",
      changeUrl: "https://mykavo.app/dashboard/changes/abc12345",
      workspaceName: "Sam's Workspace",
    });
    expect(email.html).toContain("https://mykavo.app/dashboard/changes/abc12345");
    expect(email.html).toContain("Sam&#39;s Workspace");
  });
});

describe("buildChangePrefill", () => {
  it("summarises the change in plain text", () => {
    const prefill = buildChangePrefill({
      id: "chg12345678",
      title: "Checkout button missing\nfrom /cart",
      severity: "CRITICAL",
      detectedAt: new Date("2026-10-10T12:00:00Z"),
      websiteUrl: "https://example.com",
      pageUrl: "https://example.com/cart",
    });
    expect(prefill.changeId).toBe("chg12345678");
    expect(prefill.websiteUrl).toBe("https://example.com");
    expect(prefill.title).toBe("Checkout button missing from /cart");
    expect(prefill.message).toContain("Severity: Critical");
    expect(prefill.message).toContain("Page: https://example.com/cart");
  });
});
