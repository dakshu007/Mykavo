/**
 * Small pure helpers for the first-run page (app/welcome). The dashboard
 * checklist for later steps lives in lib/onboarding.ts.
 */

/**
 * The host name in what someone has typed so far, once it looks like a real
 * one ("example.com", "https://shop.example.co.uk/path"), else null. Only
 * for the live preview: the server still validates the address fully.
 */
export function hostFromInput(input: string): string | null {
  const raw = input.trim().replace(/^https?:\/\//i, "").split(/[/?#]/)[0] ?? "";
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(raw) ? raw.toLowerCase() : null;
}

/**
 * A readable default name for a site from its host:
 * "www.northwind-roasters.co.uk" becomes "Northwind Roasters".
 */
export function siteNameFromHost(host: string): string {
  const first = host.toLowerCase().replace(/^www\./, "").split(".")[0] ?? "";
  return first
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
