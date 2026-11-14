/**
 * Section tracking for the Black Friday page.
 *
 * Every section has an id (its anchor on the page) and every call to action
 * in it says which section it came from, three ways:
 *
 * 1. `from=black-friday:<section>` on the signup link. AttributionCapture
 *    keeps it for a day and the signup records it (SignupAttribution.cta),
 *    so Users and Tracking show which section an account came from.
 * 2. GA4 events: `bf_section_viewed` the first time a section scrolls into
 *    view, `bf_cta_clicked` on every button, both with `section`.
 * 3. UTM links for posting the page elsewhere (email, social, ads), one per
 *    section, landing on that section's anchor.
 *
 * The page's own buttons deliberately carry NO utm_* parameters: in GA4 a
 * UTM on an internal link starts a new session and overwrites where the
 * visitor really came from (Google, Instagram, an email), which would make
 * every Black Friday signup look like it came from mykavo.app.
 */

export const BF_SECTIONS = [
  "hero",
  "tape",
  "math",
  "inside",
  "code",
  "steps",
  "faq",
  "claim",
] as const;
export type BfSection = (typeof BF_SECTIONS)[number];

export const BF_UTM_CAMPAIGN = "black-friday-2026";

/** The signup link for a call to action in `section`; Billing opens after signup. */
export function bfClaimHref(section: BfSection): string {
  return `/signup?next=${encodeURIComponent("/dashboard/billing")}&from=${encodeURIComponent(`black-friday:${section}`)}`;
}

/**
 * A link to post elsewhere that lands on `section` and tags the visit:
 * utm_source = where it is posted (newsletter, instagram, x...), utm_medium
 * = the kind of channel (email, social, cpc...), utm_content = the section.
 */
export function bfUtmLink(params: {
  section: BfSection;
  source: string;
  medium: string;
  origin?: string;
}): string {
  const clean = (v: string) =>
    v
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "unknown";
  const q = [
    ["utm_source", clean(params.source)],
    ["utm_medium", clean(params.medium)],
    ["utm_campaign", BF_UTM_CAMPAIGN],
    ["utm_content", params.section],
  ]
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `${params.origin ?? "https://mykavo.app"}/black-friday?${q}#${params.section}`;
}

export function isBfSection(
  value: string | null | undefined,
): value is BfSection {
  return (
    typeof value === "string" &&
    (BF_SECTIONS as readonly string[]).includes(value)
  );
}
