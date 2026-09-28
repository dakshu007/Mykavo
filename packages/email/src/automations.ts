/**
 * The automated emails, as the admin Automations page sees them: what each
 * one is, when it goes out, what an operator may change, and one renderer
 * shared by the preview, the "send me a test" button and the worker - so
 * what the preview shows is exactly what customers get.
 */

import {
  AUTOMATION_KEYS,
  DEFAULT_COPY,
  PLACEHOLDERS,
  isAutomationKey,
  type AutomationKey,
  type EmailCopy,
} from "./copy";
import {
  BASELINE_READY_SUBJECT_PREFIX,
  DAY10_OFFER_SUBJECT,
  DAY3_SETUP_SUBJECT,
  DAY3_STATS_SUBJECT_PREFIX,
  DAY6_ANDROID_SUBJECT,
  FIRST_WEBSITE_NUDGE_SUBJECT,
  baselineReadyEmail,
  day10OfferEmail,
  day3SetupEmail,
  day3StatsEmail,
  day6AndroidEmail,
  firstWebsiteNudgeEmail,
  welcomeEmail,
  type BaselineReadyData,
  type Day10OfferData,
  type Day3SetupData,
  type Day3StatsData,
  type Day6AndroidData,
  type FirstWebsiteNudgeData,
  type WelcomeEmailData,
} from "./templates";

export { AUTOMATION_KEYS, DEFAULT_COPY, PLACEHOLDERS, isAutomationKey, type AutomationKey, type EmailCopy };

export interface AutomationMeta {
  key: AutomationKey;
  name: string;
  group: "Onboarding" | "Lifecycle series";
  /** When it goes out, in words. Lifecycle steps leave out the day: it is editable. */
  trigger: string;
  /** Carries an unsubscribe link (optional mail) or not (transactional). */
  unsubscribable: boolean;
  /** Lifecycle steps have an editable send day. */
  timing: { defaultDay: number } | null;
  /** The Pro offer has an editable code and percent. */
  offer: boolean;
  /**
   * How emails sent before the send log existed are recognised - their
   * default subject. Keeps a customised subject from re-sending to people
   * who already got the original.
   */
  legacySubject: { exact: string } | { prefix: string };
}

export const AUTOMATIONS: Record<AutomationKey, AutomationMeta> = {
  welcome: {
    key: "welcome",
    name: "Welcome",
    group: "Onboarding",
    trigger: "Right after an account is created.",
    unsubscribable: false,
    timing: null,
    offer: false,
    legacySubject: { exact: DEFAULT_COPY.welcome.subject },
  },
  first_website: {
    key: "first_website",
    name: "Add your first website",
    group: "Onboarding",
    trigger: "Once, a day or more after signup, if the account has no website.",
    unsubscribable: false,
    timing: null,
    offer: false,
    legacySubject: { exact: FIRST_WEBSITE_NUDGE_SUBJECT },
  },
  baseline_ready: {
    key: "baseline_ready",
    name: "Baseline ready",
    group: "Onboarding",
    trigger: "Once per website, when its first baseline scan finishes.",
    unsubscribable: false,
    timing: null,
    offer: false,
    legacySubject: { prefix: BASELINE_READY_SUBJECT_PREFIX },
  },
  day3_stats: {
    key: "day3_stats",
    name: "Your first days",
    group: "Lifecycle series",
    trigger: "To accounts that have a website: their real scan and change numbers.",
    unsubscribable: true,
    timing: { defaultDay: 3 },
    offer: false,
    legacySubject: { prefix: DAY3_STATS_SUBJECT_PREFIX },
  },
  day3_setup: {
    key: "day3_setup",
    name: "Finish setup",
    group: "Lifecycle series",
    trigger: "Instead of \"Your first days\", to accounts with no website yet.",
    unsubscribable: true,
    timing: null,
    offer: false,
    legacySubject: { exact: DAY3_SETUP_SUBJECT },
  },
  day6_android: {
    key: "day6_android",
    name: "Android app",
    group: "Lifecycle series",
    trigger: "To accounts with a website that have not requested the app.",
    unsubscribable: true,
    timing: { defaultDay: 6 },
    offer: false,
    legacySubject: { exact: DAY6_ANDROID_SUBJECT },
  },
  day10_offer: {
    key: "day10_offer",
    name: "Pro offer",
    group: "Lifecycle series",
    trigger: "To Free accounts with a website.",
    unsubscribable: true,
    timing: { defaultDay: 10 },
    offer: true,
    legacySubject: { exact: DAY10_OFFER_SUBJECT },
  },
};

/** Keys whose emails count against the REMINDER budget and carry unsubscribe. */
export const LIFECYCLE_KEYS: AutomationKey[] = ["day3_stats", "day3_setup", "day6_android", "day10_offer"];

export interface AutomationSettings {
  enabled: boolean;
  copy: EmailCopy;
  /** Lifecycle steps only; day3_setup follows day3_stats. */
  sendOnDay: number | null;
  offerCode: string | null;
  offerPercent: number | null;
}

export const DEFAULT_OFFER = { code: "PRO17", percent: 15 } as const;

export function defaultSettings(): Record<AutomationKey, AutomationSettings> {
  return Object.fromEntries(
    AUTOMATION_KEYS.map((k) => [k, { enabled: true, copy: {}, sendOnDay: null, offerCode: null, offerPercent: null }]),
  ) as Record<AutomationKey, AutomationSettings>;
}

/** The send day for a lifecycle step, saved or default. */
export function sendDay(key: "day3_stats" | "day6_android" | "day10_offer", s: AutomationSettings | undefined): number {
  return s?.sendOnDay ?? AUTOMATIONS[key].timing!.defaultDay;
}

/** Discounted Pro price for a percent, rounded to whole dollars. */
export function offerPrice(regularPrice: number, percent: number): number {
  return Math.round(regularPrice * (1 - percent / 100));
}

const LIMITS = { subject: 150, heading: 120, intro: 1200, buttonLabel: 40 };

export type SettingsInput = {
  enabled?: unknown;
  subject?: unknown;
  heading?: unknown;
  intro?: unknown;
  buttonLabel?: unknown;
  sendOnDay?: unknown;
  offerCode?: unknown;
  offerPercent?: unknown;
};

/**
 * Validate an edit for one automation against everyone's current settings
 * (the send days must stay in order: day 3 < day 6 < day 10).
 */
export function validateSettings(
  key: AutomationKey,
  input: SettingsInput,
  current: Record<AutomationKey, AutomationSettings>,
): { ok: true; settings: AutomationSettings } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const meta = AUTOMATIONS[key];
  const text = (field: keyof typeof LIMITS): string | null => {
    const v = input[field];
    if (v === undefined || v === null) return null;
    if (typeof v !== "string") {
      errors[field] = "Must be text.";
      return null;
    }
    const t = v.replace(/\r\n/g, "\n").trim();
    if (t.length > LIMITS[field]) errors[field] = `Keep it under ${LIMITS[field]} characters.`;
    if (field !== "intro" && t.includes("\n")) errors[field] = "One line only.";
    return t || null;
  };
  const copy: EmailCopy = { subject: text("subject"), heading: text("heading"), intro: text("intro"), buttonLabel: text("buttonLabel") };

  let sendOnDay: number | null = null;
  if (meta.timing && input.sendOnDay !== undefined && input.sendOnDay !== null && input.sendOnDay !== "") {
    const n = Number(input.sendOnDay);
    if (!Number.isInteger(n) || n < 1 || n > 30) errors.sendOnDay = "A whole number of days, 1 to 30.";
    else sendOnDay = n === meta.timing.defaultDay ? null : n;
    if (!errors.sendOnDay) {
      const days = {
        day3_stats: sendDay("day3_stats", current.day3_stats),
        day6_android: sendDay("day6_android", current.day6_android),
        day10_offer: sendDay("day10_offer", current.day10_offer),
        [key]: n,
      } as Record<"day3_stats" | "day6_android" | "day10_offer", number>;
      if (!(days.day3_stats < days.day6_android && days.day6_android < days.day10_offer)) {
        errors.sendOnDay = `Keep the order: day 3 email (${days.day3_stats}) before Android (${days.day6_android}) before the offer (${days.day10_offer}).`;
      }
    }
  }

  let offerCode: string | null = null;
  let offerPercent: number | null = null;
  if (meta.offer) {
    if (typeof input.offerCode === "string" && input.offerCode.trim()) {
      const c = input.offerCode.trim().toUpperCase();
      if (!/^[A-Z0-9_-]{3,32}$/.test(c)) errors.offerCode = "3 to 32 letters, digits, - or _.";
      else offerCode = c === DEFAULT_OFFER.code ? null : c;
    }
    if (input.offerPercent !== undefined && input.offerPercent !== null && input.offerPercent !== "") {
      const n = Number(input.offerPercent);
      if (!Number.isInteger(n) || n < 5 || n > 50) errors.offerPercent = "A whole percent, 5 to 50.";
      else offerPercent = n === DEFAULT_OFFER.percent ? null : n;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    settings: {
      enabled: input.enabled === undefined ? current[key].enabled : input.enabled === true,
      copy,
      sendOnDay,
      offerCode,
      offerPercent,
    },
  };
}

export type AutomationData =
  | { key: "welcome"; data: WelcomeEmailData }
  | { key: "first_website"; data: FirstWebsiteNudgeData }
  | { key: "baseline_ready"; data: BaselineReadyData }
  | { key: "day3_stats"; data: Day3StatsData }
  | { key: "day3_setup"; data: Day3SetupData }
  | { key: "day6_android"; data: Day6AndroidData }
  | { key: "day10_offer"; data: Omit<Day10OfferData, "code" | "percent" | "price" | "days"> };

/**
 * Render an automation with its saved settings. The offer's code, percent,
 * price and send day come from settings, never from the caller, so the
 * preview and the real email cannot disagree about the deal.
 */
export function renderAutomation(
  input: AutomationData,
  settings: Record<AutomationKey, AutomationSettings>,
): { subject: string; html: string; text: string } {
  const copy = settings[input.key]?.copy ?? {};
  switch (input.key) {
    case "welcome":
      return welcomeEmail(input.data, copy);
    case "first_website":
      return firstWebsiteNudgeEmail(input.data, copy);
    case "baseline_ready":
      return baselineReadyEmail(input.data, copy);
    case "day3_stats":
      return day3StatsEmail(input.data, copy);
    case "day3_setup":
      return day3SetupEmail(input.data, copy);
    case "day6_android":
      return day6AndroidEmail(input.data, copy);
    case "day10_offer": {
      const s = settings.day10_offer;
      const percent = s?.offerPercent ?? DEFAULT_OFFER.percent;
      return day10OfferEmail(
        {
          ...input.data,
          code: s?.offerCode ?? DEFAULT_OFFER.code,
          percent,
          price: offerPrice(input.data.regularPrice, percent),
          days: sendDay("day10_offer", s),
        },
        copy,
      );
    }
  }
}

/** Believable sample data for the preview and test sends. */
export function sampleAutomationData(key: AutomationKey, appBase: string, name: string): AutomationData {
  const unsubscribeUrl = `${appBase}/unsubscribe?n=preview`;
  switch (key) {
    case "welcome":
      return { key, data: { name, addWebsiteUrl: `${appBase}/dashboard/websites/new`, alertsUrl: `${appBase}/dashboard/notifications`, docsUrl: `${appBase}/docs` } };
    case "first_website":
      return { key, data: { name, addWebsiteUrl: `${appBase}/dashboard/websites/new`, docsUrl: `${appBase}/docs` } };
    case "baseline_ready":
      return {
        key,
        data: {
          websiteName: "Northstar",
          websiteHost: "northstar.example",
          pagesScanned: 5,
          websiteUrl: `${appBase}/dashboard`,
          nextScan: "Monday, October 5",
          frequency: "Weekly",
          alertRecipients: ["you@example.com"],
          alertsUrl: `${appBase}/dashboard/notifications`,
        },
      };
    case "day3_stats":
      return {
        key,
        data: { name, websitesCount: 1, pagesMonitored: 5, scansCompleted: 3, changesFound: 2, openChanges: 2, urgentChanges: 1, dashboardUrl: `${appBase}/dashboard`, changesUrl: `${appBase}/dashboard/changes`, unsubscribeUrl },
      };
    case "day3_setup":
      return { key, data: { name, addWebsiteUrl: `${appBase}/dashboard/websites/new`, tutorialsUrl: `${appBase}/video-tutorials`, unsubscribeUrl } };
    case "day6_android":
      return { key, data: { name, androidUrl: `${appBase}/android-app`, alertEmail: "you@example.com", notificationsUrl: `${appBase}/dashboard/notifications`, unsubscribeUrl } };
    case "day10_offer":
      return { key, data: { name, regularPrice: 20, upgradeUrl: `${appBase}/dashboard/billing`, unsubscribeUrl } };
  }
}

/** Whether a stored subject is a pre-send-log email of this automation. */
export function matchesLegacySubject(key: AutomationKey, subject: string): boolean {
  const l = AUTOMATIONS[key].legacySubject;
  return "exact" in l ? subject === l.exact : subject.startsWith(l.prefix);
}

/** One saved row of the email_automation table. */
export interface AutomationRow {
  key: string;
  enabled: boolean;
  subject: string | null;
  heading: string | null;
  intro: string | null;
  buttonLabel: string | null;
  sendOnDay: number | null;
  offerCode: string | null;
  offerPercent: number | null;
}

/**
 * Settings for every automation from the saved rows. A key with no row, or
 * a row for a key that no longer exists, falls back to / is ignored for the
 * defaults, so an empty table means "everything as shipped".
 */
export function settingsFromRows(rows: AutomationRow[]): Record<AutomationKey, AutomationSettings> {
  const out = defaultSettings();
  for (const r of rows) {
    if (!isAutomationKey(r.key)) continue;
    out[r.key] = {
      enabled: r.enabled,
      copy: { subject: r.subject, heading: r.heading, intro: r.intro, buttonLabel: r.buttonLabel },
      sendOnDay: AUTOMATIONS[r.key].timing ? r.sendOnDay : null,
      offerCode: AUTOMATIONS[r.key].offer ? r.offerCode : null,
      offerPercent: AUTOMATIONS[r.key].offer ? r.offerPercent : null,
    };
  }
  return out;
}

/** The lifecycle send days, for decideLifecycleStep in @mykavo/shared. */
export function lifecycleSendDays(s: Record<AutomationKey, AutomationSettings>): { day3: number; day6: number; day10: number } {
  return { day3: sendDay("day3_stats", s.day3_stats), day6: sendDay("day6_android", s.day6_android), day10: sendDay("day10_offer", s.day10_offer) };
}
