import { describe, expect, it } from "vitest";
import { isPrivatePage } from "./private-pages";

describe("isPrivatePage", () => {
  it("catches admin, sign-in and account pages", () => {
    for (const url of [
      "https://shop.myshopify.com/admin",
      "https://site.test/wp-admin/edit.php",
      "https://site.test/wp-login.php",
      "https://site.test/login",
      "https://site.test/en/sign-in/",
      "https://site.test/my-account/orders",
      "https://site.test/Account",
    ]) {
      expect(isPrivatePage(url), url).toBe(true);
    }
  });

  it("leaves public pages alone, including look-alike words", () => {
    for (const url of [
      "https://site.test/",
      "https://site.test/pricing",
      "https://site.test/blog/how-to-login-to-wordpress",
      "https://site.test/administration-services",
      "https://site.test/checkout",
      "https://site.test/cart",
    ]) {
      expect(isPrivatePage(url), url).toBe(false);
    }
  });
});
