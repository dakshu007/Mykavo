/**
 * Ad slots, masked on every screenshot by default.
 *
 * THE PROBLEM
 * An ad slot serves a different creative on every page load. A site running
 * AdSense therefore produces a visually different screenshot on every single
 * scan, forever, through no fault of its own - and a monitoring product that
 * alerts daily about somebody else's ad rotation is one people mute within a
 * week (spec section 4.5: false positives are the biggest threat).
 *
 * Masking already existed as a per-website setting. Nobody configured it,
 * because you only learn you need it after a fortnight of noise. So the
 * common networks are masked automatically, and the per-website list stays
 * for everything these do not catch.
 *
 * WHY THIS LIST IS NARROW
 * Every selector here matches a container that only ever holds an ad. The
 * tempting broad ones are deliberately absent: `[class*="ad"]` also matches
 * "header", "badge", "shadow", "loading" and "download", and masking those
 * would blank out real page content while reporting everything as fine -
 * which is far worse than the noise being fixed. When in doubt, leave it out
 * and let the customer add it.
 *
 * Masked regions are painted a fixed opaque colour by the scanner, so they
 * are byte-identical between scans regardless of what was served.
 */

export const DEFAULT_AD_MASK_SELECTORS: readonly string[] = [
  // Google AdSense / Ad Manager / DFP
  "ins.adsbygoogle",
  "[data-ad-client]",
  "[data-ad-slot]",
  '[id^="div-gpt-ad"]',
  '[id^="google_ads_"]',
  '[id^="gpt-passback"]',
  'iframe[src*="googlesyndication.com"]',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googleadservices.com"]',
  // AMP
  "amp-ad",
  "amp-embed",
  // Amazon
  'iframe[src*="amazon-adsystem.com"]',
  // Xandr / AppNexus
  'iframe[src*="adnxs.com"]',
  // Content recommendation widgets - same rotation problem, same fix
  '[id^="taboola-"]',
  ".taboola",
  '[id^="outbrain_widget"]',
  ".OUTBRAIN",
  // Carbon, common on developer-facing sites
  "#carbonads",
  ".carbonads",
  // Prebid and generic slot wrappers that name themselves unambiguously
  '[id^="ad-slot-"]',
  '[class^="ad-slot"]',
  '[data-ad-unit]',
  // Explicitly labelled for accessibility, so the label is trustworthy
  '[aria-label="Advertisement"]',
  '[aria-label="advertisement"]',
];

/**
 * Website masks plus the defaults, de-duplicated.
 *
 * Order puts the customer's own selectors first: they are the ones a person
 * chose deliberately, and if the list is ever truncated by a cap those should
 * survive rather than the generic ones.
 */
export function withDefaultAdMasks(configured: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const selector of [...configured, ...DEFAULT_AD_MASK_SELECTORS]) {
    const trimmed = selector.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}
