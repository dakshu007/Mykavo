import { describe, expect, it } from "vitest";
import { dedupePlugins, diffInventory, flaggedPlugins, pluginInventorySchema } from "./wp-plugins";

const plugin = (slug: string, version = "1.0.0", active = true) => ({ slug, name: slug.toUpperCase(), version, active });

describe("pluginInventorySchema", () => {
  it("accepts folder names and lowercases them", () => {
    const parsed = pluginInventorySchema.parse({ plugins: [{ slug: "Contact-Form_7", name: "CF7", version: "5.9", active: false }] });
    expect(parsed.plugins[0]!.slug).toBe("contact-form_7");
  });

  it.each(["../etc", "a b", "", "dot.ted", "x".repeat(101)])("refuses slug %j", (slug) => {
    expect(pluginInventorySchema.safeParse({ plugins: [{ slug, name: "n", version: "1", active: true }] }).success).toBe(false);
  });

  it("caps the list at 300", () => {
    const plugins = Array.from({ length: 301 }, (_, i) => plugin(`p${i}`));
    expect(pluginInventorySchema.safeParse({ plugins }).success).toBe(false);
  });
});

describe("diffInventory", () => {
  it("creates, updates and removes", () => {
    const existing = [plugin("keep"), plugin("bump", "1.0.0"), plugin("gone")];
    const diff = diffInventory(existing, [plugin("keep"), plugin("bump", "1.1.0"), plugin("new")]);
    expect(diff.create.map((p) => p.slug)).toEqual(["new"]);
    expect(diff.update.map((p) => p.slug)).toEqual(["bump"]);
    expect(diff.remove).toEqual(["gone"]);
  });

  it("de-duplicates an upload by slug", () => {
    expect(dedupePlugins([plugin("a", "1"), plugin("a", "2")])).toEqual([plugin("a", "2")]);
  });
});

describe("flaggedPlugins", () => {
  it("lists closed then outdated plugins with dates, and nothing else", () => {
    const rows = [
      { slug: "ok", name: "Fine", wporgStatus: "ok", lastUpdated: null, reason: null },
      { slug: "premium", name: "Premium", wporgStatus: "unknown", lastUpdated: null, reason: null },
      { slug: "old", name: "Old", wporgStatus: "outdated", lastUpdated: new Date("2022-01-05T00:00:00Z"), reason: "Not updated." },
      { slug: "shut", name: "Shut", wporgStatus: "closed", lastUpdated: null, reason: null },
    ];
    expect(flaggedPlugins(rows)).toEqual([
      { slug: "shut", name: "Shut", status: "closed", lastUpdated: null, reason: "Closed on WordPress.org." },
      { slug: "old", name: "Old", status: "outdated", lastUpdated: "2022-01-05", reason: "Not updated." },
    ]);
  });
});
