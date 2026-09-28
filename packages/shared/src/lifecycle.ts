/**
 * Which lifecycle email (the Day 3 / 6 / 10 retention series) an account is
 * due, if any. Pure, so every rule is tested without a database; the worker's
 * activation sweep gathers the facts and sends.
 *
 * Each step has a WINDOW, not just a start day: an account only gets the Day
 * 3 email between day 3 and day 7. That is what stops the series from
 * back-filling every old account the day it ships, and a sweep outage of a
 * day or two still catches up inside the window.
 *
 * Stop rules come first: unsubscribed, email switched off for the workspace,
 * or already paying. At most one lifecycle email per account per ~day.
 */

export type LifecycleStep = "DAY3_STATS" | "DAY3_SETUP" | "DAY6_ANDROID" | "DAY10_OFFER";

export interface LifecycleFacts {
  signedUpAt: Date;
  now: Date;
  hasWebsite: boolean;
  isPaid: boolean;
  optedOut: boolean;
  /** The workspace switched email off in Notifications. */
  emailOff: boolean;
  /** Requested or installed the Android app already (request row or push device). */
  hasAndroidApp: boolean;
  sentDay3: boolean;
  sentDay6: boolean;
  sentDay10: boolean;
  lastLifecycleSentAt: Date | null;
  /** Send days chosen in Admin > Automations; defaults to 3 / 6 / 10. */
  sendDays?: LifecycleSendDays;
  /** Steps switched off in Admin > Automations are skipped, not marked sent. */
  enabled?: Partial<Record<LifecycleStep, boolean>>;
}

export interface LifecycleSendDays {
  day3: number;
  day6: number;
  day10: number;
}

/** How long each step stays catchable after its send day. */
export const LIFECYCLE_WINDOW_DAYS = 4;

export const DEFAULT_LIFECYCLE_SEND_DAYS: LifecycleSendDays = { day3: 3, day6: 6, day10: 10 };

/** [start, end) in days since signup, for each step. */
export function lifecycleWindows(days: LifecycleSendDays = DEFAULT_LIFECYCLE_SEND_DAYS) {
  const w = (d: number) => [d, d + LIFECYCLE_WINDOW_DAYS] as const;
  return { day3: w(days.day3), day6: w(days.day6), day10: w(days.day10) };
}

/** The default windows: day 3 [3, 7), day 6 [6, 10), day 10 [10, 14). */
export const LIFECYCLE_WINDOWS = lifecycleWindows();

/** Oldest signup the series can still reach (the end of the last window). */
export function lifecycleMaxAgeDays(days: LifecycleSendDays = DEFAULT_LIFECYCLE_SEND_DAYS): number {
  return lifecycleWindows(days).day10[1];
}
/** Youngest signup the series starts with. */
export function lifecycleMinAgeDays(days: LifecycleSendDays = DEFAULT_LIFECYCLE_SEND_DAYS): number {
  return days.day3;
}
export const LIFECYCLE_MAX_AGE_DAYS = lifecycleMaxAgeDays();
export const LIFECYCLE_MIN_AGE_DAYS = lifecycleMinAgeDays();

const DAY_MS = 24 * 60 * 60 * 1000;
/** Minimum gap between two lifecycle emails to one account. */
export const LIFECYCLE_MIN_GAP_MS = 20 * 60 * 60 * 1000;

export function decideLifecycleStep(f: LifecycleFacts): LifecycleStep | null {
  if (f.optedOut || f.emailOff || f.isPaid) return null;
  if (f.lastLifecycleSentAt && f.now.getTime() - f.lastLifecycleSentAt.getTime() < LIFECYCLE_MIN_GAP_MS) return null;

  const age = (f.now.getTime() - f.signedUpAt.getTime()) / DAY_MS;
  const within = ([a, b]: readonly [number, number]) => age >= a && age < b;
  const on = (step: LifecycleStep) => f.enabled?.[step] !== false;
  const windows = lifecycleWindows(f.sendDays);

  if (!f.sentDay3 && within(windows.day3)) {
    const step = f.hasWebsite ? "DAY3_STATS" : "DAY3_SETUP";
    if (on(step)) return step;
  }
  // Both later steps are about a site being monitored: an app with nothing
  // to alert about, or an upgrade to watch more of nothing, is noise.
  if (!f.sentDay6 && within(windows.day6) && f.hasWebsite && !f.hasAndroidApp && on("DAY6_ANDROID")) return "DAY6_ANDROID";
  if (!f.sentDay10 && within(windows.day10) && f.hasWebsite && on("DAY10_OFFER")) return "DAY10_OFFER";
  return null;
}
