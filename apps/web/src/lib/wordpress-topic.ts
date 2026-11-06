/**
 * Is the reader on WordPress? Used to show the WordPress plugin pitch
 * instead of the generic sign-up box. Plain functions (no "use client"), so
 * server pages can call them while rendering.
 */

/** True when a post or page is about WordPress, so it gets the plugin pitch. */
export function isWordpressTopic(...texts: Array<string | null | undefined | readonly string[]>): boolean {
  return texts
    .flat()
    .some((t) => typeof t === "string" && /wordpress|woocommerce|\bwp\b/i.test(t));
}

/** True when script URLs show the page runs WordPress. */
export function looksLikeWordpress(scriptUrls: readonly string[]): boolean {
  return scriptUrls.some((u) => /\/wp-(content|includes)\//i.test(u));
}
