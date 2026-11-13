import { describe, expect, it } from "vitest";
import { pluginSupportsDrafts, safeEditUrl, wpDraftView } from "@/lib/integrations/wp-drafts";
import { articleHtml, faqHtml } from "@/lib/keywords/post-html";

describe("pluginSupportsDrafts", () => {
  it("needs plugin 1.4.0 or newer", () => {
    expect(pluginSupportsDrafts("1.4.0")).toBe(true);
    expect(pluginSupportsDrafts("1.10.2")).toBe(true);
    expect(pluginSupportsDrafts("2.0")).toBe(true);
    expect(pluginSupportsDrafts("1.3.1")).toBe(false);
    expect(pluginSupportsDrafts(null)).toBe(false);
    expect(pluginSupportsDrafts("")).toBe(false);
  });
});

describe("safeEditUrl", () => {
  it("keeps only links back into the same site", () => {
    expect(safeEditUrl("https://shop.example.com/wp-admin/post.php?post=12&action=edit", "https://shop.example.com")).toBe(
      "https://shop.example.com/wp-admin/post.php?post=12&action=edit",
    );
    expect(safeEditUrl("https://example.com/wp-admin/post.php?post=3", "https://www.example.com")).toBe(
      "https://example.com/wp-admin/post.php?post=3",
    );
    expect(safeEditUrl("https://evil.example.net/wp-admin/post.php", "https://shop.example.com")).toBeNull();
    expect(safeEditUrl("javascript:alert(1)", "https://shop.example.com")).toBeNull();
    expect(safeEditUrl(42, "https://shop.example.com")).toBeNull();
  });
});

describe("wpDraftView", () => {
  const row = { status: "delivered", editUrl: "https://a.test/e", error: null, queuedAt: new Date(0), deliveredAt: new Date(1000), postVersion: 3 };
  it("says when the post changed after it was sent", () => {
    expect(wpDraftView(row, 3).outdated).toBe(false);
    expect(wpDraftView(row, 4).outdated).toBe(true);
    expect(wpDraftView({ ...row, status: "queued" }, 4).outdated).toBe(false);
  });
});

describe("post HTML for WordPress", () => {
  it("adds the FAQ as headings and escapes it", () => {
    expect(faqHtml([])).toBe("");
    const html = articleHtml("<p>Body</p>", [{ question: "Is <b> safe?", answer: "A & B" }]);
    expect(html).toContain("<p>Body</p>");
    expect(html).toContain("<h3>Is &lt;b&gt; safe?</h3>");
    expect(html).toContain("<p>A &amp; B</p>");
  });
});
