/**
 * The MyKavo Chrome extension, as the marketing site describes it. The
 * extension itself lives in apps/extension (see its STORE_LISTING.md).
 */

export const CHROME_EXTENSION_VERSION = "2.0.0";

/** The marketing page. */
export const CHROME_EXTENSION_PAGE_PATH = "/chrome-extension";

/**
 * The Chrome Web Store listing. Null until the extension is published - the
 * page then says "Coming soon to the Chrome Web Store" instead of linking.
 * Paste the listing URL here after the store approves it.
 */
export const CHROME_STORE_URL: string | null = null;

/** Lowest Chrome version the extension supports (manifest minimum_chrome_version). */
export const CHROME_MIN_VERSION = "116";
