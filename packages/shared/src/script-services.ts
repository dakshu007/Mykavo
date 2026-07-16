/**
 * Known third-party script services (spec §21).
 * Single source of truth for mapping a script URL to a recognizable service
 * name - used by the free tools and the comparison engine. Keep the list
 * ordered: more specific patterns (e.g. gtag.js) before broader ones (GTM).
 */

export const SCRIPT_SERVICES: ReadonlyArray<readonly [RegExp, string]> = [
  [/googletagmanager\.com\/gtag\//i, "Google Analytics"],
  [/googletagmanager\.com/i, "Google Tag Manager"],
  [/google-analytics\.com|googleanalytics/i, "Google Analytics"],
  [/connect\.facebook\.net/i, "Meta Pixel"],
  [/js\.stripe\.com/i, "Stripe"],
  [/hotjar\.com/i, "Hotjar"],
  [/intercom(?:cdn)?\.(io|com)/i, "Intercom"],
  [/hs-scripts\.com|hubspot/i, "HubSpot"],
  [/clarity\.ms/i, "Microsoft Clarity"],
  [/plausible\.io/i, "Plausible"],
];

/** Identify a known service from a script URL. Returns null when unknown. */
export function identifyScriptService(src: string): string | null {
  return SCRIPT_SERVICES.find(([re]) => re.test(src))?.[1] ?? null;
}
