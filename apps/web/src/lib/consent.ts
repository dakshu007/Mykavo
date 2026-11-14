/**
 * Cookie consent: the visitor's choice, how Google Analytics and Microsoft
 * Clarity are told about it, and the cookies that go when it is "essential".
 *
 * - "all": analytics cookies (GA4, Clarity) and MyKavo's own attribution
 *   cookies (where a visitor first landed, UTM tags, the button that led to
 *   sign-up) are allowed.
 * - "essential": only what the site needs to work (sign-in). GA runs in
 *   Consent Mode with storage denied (cookieless, no _ga cookies), Clarity
 *   is not loaded, and no attribution cookies are written.
 * - no choice yet: Google Consent Mode defaults to denied in the EEA, the UK
 *   and Switzerland (where consent comes first by law) and to granted
 *   elsewhere; Clarity applies the same rule itself.
 *
 * Advertising storage is always denied: MyKavo runs no ads tags.
 */

export type ConsentChoice = "all" | "essential";

export const CONSENT_COOKIE = "mk_consent";
/** A choice is remembered for a year, then asked again. */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;
/** Dispatched on window when the visitor chooses or reopens the banner. */
export const CONSENT_EVENT = "mk:consent";
export const CONSENT_OPEN_EVENT = "mk:consent-open";

/** Where Google Consent Mode starts at denied until the visitor accepts. */
export const CONSENT_REQUIRED_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV",
  "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
];

/** First-party cookies that exist only to measure; removed on "essential". */
export const MEASUREMENT_COOKIE_PREFIXES = ["_ga", "_gid", "_gat", "_clck", "_clsk", "mk_src", "mk_utm", "mk_cta"];

export function parseConsent(raw: string | null | undefined): ConsentChoice | null {
  return raw === "all" || raw === "essential" ? raw : null;
}

/** The choice stored in a cookie header string (document.cookie). */
export function consentFromCookies(cookieHeader: string): ConsentChoice | null {
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CONSENT_COOKIE) return parseConsent(rest.join("="));
  }
  return null;
}

type Storage = "granted" | "denied";

/** Google Consent Mode v2 state for a choice. */
export function gtagConsentState(choice: ConsentChoice): Record<string, Storage> {
  return {
    analytics_storage: choice === "all" ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  };
}

/**
 * The consent "default" commands, sent before gtag's config. A stored choice
 * applies everywhere; otherwise denied in the regions that require consent
 * first and granted (analytics only) elsewhere.
 */
export function gtagConsentDefaults(choice: ConsentChoice | null): Record<string, unknown>[] {
  if (choice) return [{ ...gtagConsentState(choice) }];
  return [
    { ...gtagConsentState("essential"), region: CONSENT_REQUIRED_REGIONS, wait_for_update: 500 },
    { ...gtagConsentState("all") },
  ];
}

/** Microsoft Clarity consent API (consentv2) state for a choice. */
export function clarityConsentState(choice: ConsentChoice): { ad_Storage: Storage; analytics_Storage: Storage } {
  return { ad_Storage: "denied", analytics_Storage: choice === "all" ? "granted" : "denied" };
}

/** Whether a cookie name is a measurement cookie removed on "essential". */
export function isMeasurementCookie(name: string): boolean {
  return MEASUREMENT_COOKIE_PREFIXES.some((p) => name === p || name.startsWith(`${p}_`) || (p.startsWith("_") && name.startsWith(p)));
}

/* ---------------- browser side ---------------- */

export function readConsent(): ConsentChoice | null {
  if (typeof document === "undefined") return null;
  try {
    return consentFromCookies(document.cookie);
  } catch {
    return null;
  }
}

/** Measurement cookies may be written unless the visitor chose essential only. */
export function measurementAllowed(): boolean {
  return readConsent() !== "essential";
}

type ConsentWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  clarity?: (...args: unknown[]) => void;
};

function deleteMeasurementCookies(): void {
  const host = window.location.hostname;
  const parts = host.split(".");
  const domains = ["", host, `.${host}`];
  if (parts.length > 2) domains.push(`.${parts.slice(-2).join(".")}`);
  else domains.push(`.${host}`);
  for (const part of document.cookie.split(";")) {
    const name = part.trim().split("=")[0];
    if (!name || !isMeasurementCookie(name)) continue;
    for (const d of domains) {
      document.cookie = `${name}=; Path=/; Max-Age=0${d ? `; Domain=${d}` : ""}`;
    }
  }
}

/** Store the visitor's choice and apply it to GA and Clarity right away. */
export function saveConsent(choice: ConsentChoice): void {
  const w = window as ConsentWindow;
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${choice}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
    if (choice === "essential") deleteMeasurementCookies();
  } catch {
    // Cookies blocked: the choice holds for this page view only.
  }
  w.gtag?.("consent", "update", gtagConsentState(choice));
  w.clarity?.("consentv2", clarityConsentState(choice));
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

/** Show the banner again (the "Cookie settings" link). */
export function openConsentSettings(): void {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
