/**
 * Editable wording for the automated emails (Admin > Automations).
 *
 * Each automated email has four editable parts - subject, heading, intro and
 * button - with these defaults as the single source of its wording. An
 * operator's saved text replaces a default; anything left empty falls back.
 *
 * Text is plain, never HTML: templates escape it, so an edit can change the
 * words but not inject markup. {placeholders} are filled per email.
 */

export interface EmailCopy {
  subject?: string | null;
  heading?: string | null;
  intro?: string | null;
  buttonLabel?: string | null;
}

export const AUTOMATION_KEYS = [
  "welcome",
  "first_website",
  "baseline_ready",
  "day3_stats",
  "day3_setup",
  "day6_android",
  "day10_offer",
  "plugin_update",
  "app_update",
] as const;
export type AutomationKey = (typeof AUTOMATION_KEYS)[number];

export function isAutomationKey(v: unknown): v is AutomationKey {
  return typeof v === "string" && (AUTOMATION_KEYS as readonly string[]).includes(v);
}

/** Defaults. `buttonLabel: null` means the template picks it (see day3_stats). */
export const DEFAULT_COPY: Record<AutomationKey, { subject: string; heading: string; intro: string; buttonLabel: string | null }> = {
  welcome: {
    subject: "Welcome to MyKavo - start monitoring your website",
    heading: "Welcome, {firstName}",
    intro:
      "Your account is ready. MyKavo watches the websites you care about and tells you when something important changes or breaks - so you hear it from us rather than from a client.",
    buttonLabel: "Add your first website",
  },
  first_website: {
    subject: "Your MyKavo account is ready - add your first website",
    heading: "Add your first website",
    intro:
      "Hi {firstName}, your MyKavo account is set up, but it is not watching anything yet. Adding a website takes about a minute: paste the URL, pick the pages that matter, and MyKavo records a baseline. After that you hear from us only when something important changes, like:",
    buttonLabel: "Add your first website",
  },
  baseline_ready: {
    subject: "Baseline ready for {website} - MyKavo is now watching",
    heading: "{websiteName} has a baseline",
    intro:
      "MyKavo recorded the known-good state of {pages} on {website}. Every scan from now on is compared against it, and you hear from us when something important changes.",
    buttonLabel: "See the baseline",
  },
  day3_stats: {
    subject: "Your first days with MyKavo: {scans}, {changes} found",
    heading: "Here is what MyKavo saw",
    intro: "Hi {firstName}, MyKavo has been watching since you set it up.",
    buttonLabel: null,
  },
  day3_setup: {
    subject: "Your first MyKavo baseline takes 2 minutes",
    heading: "Your first baseline takes 2 minutes",
    intro: "Hi {firstName}, your account is ready, but MyKavo has nothing to watch yet. Here is all it takes:",
    buttonLabel: "Add your website",
  },
  day6_android: {
    subject: "Get your MyKavo alerts on your phone",
    heading: "Your alerts, on your phone",
    intro:
      "Hi {firstName}, a broken checkout at 2 AM should not wait until you open your laptop. The MyKavo Android app brings your monitoring with you:",
    buttonLabel: "Request the Android app",
  },
  day10_offer: {
    subject: "{percent}% off MyKavo Pro: ${price} a month for 8 websites",
    heading: "MyKavo Pro for ${price} a month",
    intro:
      "Hi {firstName}, you have been on MyKavo for {days} days. If one website checked once a week is not enough, Pro watches up to 8 websites every day - and for you it is {percent}% off: ${price} a month instead of ${regularPrice}.",
    buttonLabel: "Upgrade to Pro for ${price}",
  },
  plugin_update: {
    subject: "MyKavo for WordPress {version} is out",
    heading: "MyKavo for WordPress {version} is ready",
    intro:
      "Hi {firstName}, a new version of the MyKavo plugin is out. Updating takes a few seconds: open Plugins in WordPress and click \"Update now\" next to MyKavo. Your connection, settings and history stay as they are.",
    buttonLabel: "Update in WordPress",
  },
  app_update: {
    subject: "MyKavo for Android {version} is ready",
    heading: "A new MyKavo app is ready",
    intro:
      "Hi {firstName}, version {version} of the MyKavo Android app is ready. Download it and install it over the one you have - you stay signed in, and your alerts keep coming.",
    buttonLabel: "Download version {version}",
  },
};

/** The placeholders each email understands, for the editor. */
export const PLACEHOLDERS: Record<AutomationKey, { token: string; meaning: string }[]> = {
  welcome: [{ token: "{firstName}", meaning: "first name (dropped when unknown)" }],
  first_website: [{ token: "{firstName}", meaning: "first name (dropped when unknown)" }],
  baseline_ready: [
    { token: "{website}", meaning: "the website's domain" },
    { token: "{websiteName}", meaning: "the website's name" },
    { token: "{pages}", meaning: 'pages captured, e.g. "5 pages"' },
  ],
  day3_stats: [
    { token: "{firstName}", meaning: "first name (dropped when unknown)" },
    { token: "{scans}", meaning: 'scans so far, e.g. "3 scans"' },
    { token: "{changes}", meaning: 'changes found, e.g. "2 changes"' },
  ],
  day3_setup: [{ token: "{firstName}", meaning: "first name (dropped when unknown)" }],
  day6_android: [{ token: "{firstName}", meaning: "first name (dropped when unknown)" }],
  day10_offer: [
    { token: "{firstName}", meaning: "first name (dropped when unknown)" },
    { token: "{percent}", meaning: "discount, e.g. 15" },
    { token: "{price}", meaning: "discounted monthly price, e.g. 17" },
    { token: "{regularPrice}", meaning: "normal Pro price, e.g. 20" },
    { token: "{code}", meaning: "the discount code" },
    { token: "{days}", meaning: "days since signup when it is sent" },
  ],
  plugin_update: [
    { token: "{firstName}", meaning: "first name (dropped when unknown)" },
    { token: "{version}", meaning: "the new version, e.g. 1.2.0" },
  ],
  app_update: [
    { token: "{firstName}", meaning: "first name (dropped when unknown)" },
    { token: "{version}", meaning: "the new version, e.g. 1.0.2" },
  ],
};

/**
 * Fill {placeholders}. An unknown first name removes the placeholder along
 * with the comma or space before it ("Hi {firstName}," -> "Hi,"), rather
 * than leaving "Hi ," or inventing a name. Unknown tokens are left as typed,
 * so a typo is visible in the preview instead of silently vanishing.
 */
export function fillPlaceholders(text: string, vars: Record<string, string>): string {
  let out = text;
  if (!vars.firstName) out = out.replace(/(,\s*|\s+)?\{firstName\}/g, "");
  return out.replace(/\{([a-zA-Z]+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

/** Resolve one part: the saved override if it has text, else the default. */
export function pick(override: string | null | undefined, fallback: string): string {
  return override && override.trim() ? override.trim() : fallback;
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}
