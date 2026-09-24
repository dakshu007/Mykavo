import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildShopifyApp, outDir } from "../../scripts/shopify-app.mjs";

describe("Shopify app screen", () => {
  it("is up to date with the WordPress plugin's (run: node apps/web/scripts/shopify-app.mjs)", () => {
    const { js, css } = buildShopifyApp();
    expect(readFileSync(resolve(outDir, "app.js"), "utf8")).toBe(js);
    expect(readFileSync(resolve(outDir, "app.css"), "utf8")).toBe(css);
  });

  it("carries no WordPress wording", () => {
    const { js } = buildShopifyApp();
    const visible = js.match(/__\(\s*'[^']*'/g) ?? [];
    const leaks = visible.filter((s) => /WordPress|wp-admin|plugin/i.test(s) && !/after this (update|change)/.test(s));
    expect(leaks).toEqual([]);
  });
});
