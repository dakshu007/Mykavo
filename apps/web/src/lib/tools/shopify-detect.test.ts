import { describe, expect, it } from "vitest";
import { analyzeShopify, detectShopifyApps, parseBoomrTheme, parseThemeObject, readBalancedObject } from "./shopify-detect";

const STORE = `<meta name="shopify-checkout-api-token" content="abc">
<meta id="shopify-digital-wallet" name="shopify-digital-wallet" content="/123/digital_wallets/dialog">
<script>var Shopify = Shopify || {};
Shopify.shop = "acme-store.myshopify.com";
Shopify.theme = {"name":"Dawn {copy}","id":1234567,"schema_name":"Dawn","schema_version":"15.0.0","theme_store_id":887,"role":"main"};
Shopify.theme.handle = "null";</script>
<link href="//acme.com/cdn/shop/t/3/assets/base.css?v=1" rel="stylesheet">
<link rel="canonical" href="https://acme.com/">
<script src="https://cdn.shopify.com/extensions/0e4c7b6a-1111-2222-3333-444455556666/judgeme-reviews-299/assets/loader.js" defer></script>
<script src="https://cdn.shopify.com/extensions/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/size-chart-pro-12/assets/app.js" defer></script>
<script>(function(){function asyncLoad(){var urls=["https:\\/\\/static.klaviyo.com\\/onsite\\/js\\/klaviyo.js?company_id=X\\u0026shop=acme-store.myshopify.com","https:\\/\\/cdn.shopify.com\\/s\\/files\\/x.js"];}})();</script>
<script src="https://js.afterpay.com/afterpay-1.x.js"></script>
<a href="https://www.yotpo.com/">We are not using Yotpo, just linking</a>
<script>window.BOOMR = window.BOOMR || {}; BOOMR.themeName = "Dawn"; BOOMR.themeVersion = "15.0.0";</script>`;

describe("shopify detection", () => {
  it("reads the Shopify.theme object, including a brace inside the name", () => {
    expect(parseThemeObject(STORE)).toEqual({
      name: "Dawn {copy}",
      schemaName: "Dawn",
      schemaVersion: "15.0.0",
      themeStoreId: 887,
      role: "main",
    });
    expect(readBalancedObject('{"a":"}"}', 0)).toBe('{"a":"}"}');
    expect(readBalancedObject('{"a":1', 0)).toBeNull();
  });

  it("falls back to the BOOMR theme name", () => {
    expect(parseBoomrTheme(`BOOMR.themeName = "Prestige"; BOOMR.themeVersion = "9.1.0";`)).toMatchObject({ name: "Prestige", schemaVersion: "9.1.0" });
  });

  it("reports signals, store address, Theme Store origin and apps", () => {
    const r = analyzeShopify(STORE, "https://acme.com/");
    expect(r.isShopify).toBe(true);
    expect(r.shop).toBe("acme-store.myshopify.com");
    expect(r.signals).toEqual(
      expect.arrayContaining(["Shopify.theme object", "/cdn/shop/ asset paths", "Shopify checkout meta tag", "Shopify digital wallet meta tag"]),
    );
    expect(r.fromThemeStore).toBe(true);
    expect(r.passwordProtected).toBe(false);
    expect(r.apps).toEqual([
      { name: "Afterpay", evidence: "app asset", source: "js.afterpay.com" },
      { name: "Judge.me", evidence: "app extension", source: "judgeme-reviews" },
      { name: "Klaviyo", evidence: "app asset", source: "static.klaviyo.com" },
      { name: "Size Chart Pro", evidence: "app extension", source: "size-chart-pro" },
    ]);
  });

  it("treats a theme without theme_store_id as not from the Theme Store", () => {
    const html = `<script>Shopify.theme = {"name":"Custom build","schema_name":"Acme","schema_version":"1.0","theme_store_id":null,"role":"main"};</script>`;
    expect(analyzeShopify(html, "https://acme.com/").fromThemeStore).toBe(false);
  });

  it("does not count the store's own domain or plain links as apps", () => {
    expect(detectShopifyApps(`<link rel="canonical" href="https://klaviyo-fans.com/">`, "https://klaviyo-fans.com/")).toEqual([]);
  });

  it("says no Shopify for a plain page and spots the password page", () => {
    const plain = analyzeShopify("<html><body>hi</body></html>", "https://example.com/");
    expect(plain.isShopify).toBe(false);
    expect(plain.theme).toBeNull();
    expect(plain.fromThemeStore).toBeNull();
    expect(analyzeShopify(STORE, "https://acme.com/password").passwordProtected).toBe(true);
  });
});
