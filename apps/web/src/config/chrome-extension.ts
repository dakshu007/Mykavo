/**
 * The MyKavo Chrome extension, as the marketing site describes it. The
 * extension itself lives in apps/extension (see its STORE_LISTING.md).
 */

export const CHROME_EXTENSION_VERSION = "2.0.0";

/** The marketing page. */
export const CHROME_EXTENSION_PAGE_PATH = "/chrome-extension";

/**
 * The Chrome Web Store listing (live since October 2026). Set to null to
 * show "Coming soon to the Chrome Web Store" instead of linking.
 */
export const CHROME_STORE_URL: string | null =
  "https://chromewebstore.google.com/detail/mykavo-seo-website-monito/mejgmahebmmcbhmjknnbnfkepopbglpg";

/** Lowest Chrome version the extension supports (manifest minimum_chrome_version). */
export const CHROME_MIN_VERSION = "116";
