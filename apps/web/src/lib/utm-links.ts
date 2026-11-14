/**
 * UTM links for any page or blog post (the admin UTM link builder).
 *
 * A link carries utm_source (where it is posted), utm_medium (the kind of
 * channel), utm_campaign, and optionally utm_content and utm_term, and can
 * land on one section of the page (#section). GA4 reads the tags for the
 * visit; the site also keeps them until signup (lib/attribution), so each
 * account records the campaign that brought it.
 *
 * Only for links posted OUTSIDE mykavo.app: a UTM on an internal link starts
 * a new GA4 session and overwrites where the visitor really came from.
 */

import { cleanUtmValue } from "@/lib/attribution/core";

export interface UtmPreset {
  id: string;
  label: string;
  source: string;
  medium: string;
}

/** The channels most links go to, with the source/medium pair GA4 groups correctly. */
export const UTM_PRESETS: readonly UtmPreset[] = [
  { id: "instagram", label: "Instagram", source: "instagram", medium: "social" },
  { id: "facebook", label: "Facebook", source: "facebook", medium: "social" },
  { id: "linkedin", label: "LinkedIn", source: "linkedin", medium: "social" },
  { id: "x", label: "X (Twitter)", source: "x", medium: "social" },
  { id: "youtube", label: "YouTube", source: "youtube", medium: "video" },
  { id: "reddit", label: "Reddit", source: "reddit", medium: "social" },
  { id: "whatsapp", label: "WhatsApp", source: "whatsapp", medium: "social" },
  { id: "newsletter", label: "Newsletter", source: "newsletter", medium: "email" },
  { id: "brevo", label: "Brevo campaign", source: "brevo", medium: "email" },
  { id: "google-ads", label: "Google Ads", source: "google", medium: "cpc" },
  { id: "producthunt", label: "Product Hunt", source: "producthunt", medium: "referral" },
  { id: "partner", label: "Partner or guest post", source: "partner", medium: "referral" },
];

/** A UTM value for a URL: lowercase words joined by dashes. */
export function utmToken(value: string): string {
  return (cleanUtmValue(value) ?? "").replace(/[\s/@+:.]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export interface UtmLinkInput {
  /** Site path, "/" or "/blog/post". A full mykavo.app URL is accepted too. */
  path: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
  /** Section anchor to land on, without "#". */
  section?: string;
  origin?: string;
}

/** The tagged link, or null when source, medium or campaign is missing. */
export function buildUtmUrl(input: UtmLinkInput): string | null {
  const origin = (input.origin ?? "https://mykavo.app").replace(/\/+$/, "");
  let path = input.path.trim() || "/";
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch {
    return null;
  }
  if (!path.startsWith("/")) path = `/${path}`;
  const tags: [string, string][] = [
    ["utm_source", utmToken(input.source)],
    ["utm_medium", utmToken(input.medium)],
    ["utm_campaign", utmToken(input.campaign)],
    ["utm_content", utmToken(input.content ?? "")],
    ["utm_term", utmToken(input.term ?? "")],
  ];
  if (!tags[0][1] || !tags[1][1] || !tags[2][1]) return null;
  const query = tags
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  const section = (input.section ?? "").trim().replace(/^#/, "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return `${origin}${path}?${query}${section ? `#${section}` : ""}`;
}
