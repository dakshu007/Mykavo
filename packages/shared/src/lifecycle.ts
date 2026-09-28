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
}

/** [start, end) in days since signup. */
export const LIFECYCLE_WINDOWS = {
  day3: [3, 7],
  day6: [6, 10],
  day10: [10, 14],
} as const;

/** Oldest signup the series can still reach (the end of the last window). */
export const LIFECYCLE_MAX_AGE_DAYS = LIFECYCLE_WINDOWS.day10[1];
/** Youngest signup the series starts with. */
export const LIFECYCLE_MIN_AGE_DAYS = LIFECYCLE_WINDOWS.day3[0];

const DAY_MS = 24 * 60 * 60 * 1000;
/** Minimum gap between two lifecycle emails to one account. */
export const LIFECYCLE_MIN_GAP_MS = 20 * 60 * 60 * 1000;

export function decideLifecycleStep(f: LifecycleFacts): LifecycleStep | null {
  if (f.optedOut || f.emailOff || f.isPaid) return null;
  if (f.lastLifecycleSentAt && f.now.getTime() - f.lastLifecycleSentAt.getTime() < LIFECYCLE_MIN_GAP_MS) return null;

  const age = (f.now.getTime() - f.signedUpAt.getTime()) / DAY_MS;
  const within = ([a, b]: readonly [number, number]) => age >= a && age < b;

  if (!f.sentDay3 && within(LIFECYCLE_WINDOWS.day3)) return f.hasWebsite ? "DAY3_STATS" : "DAY3_SETUP";
  // Both later steps are about a site being monitored: an app with nothing
  // to alert about, or an upgrade to watch more of nothing, is noise.
  if (!f.sentDay6 && within(LIFECYCLE_WINDOWS.day6) && f.hasWebsite && !f.hasAndroidApp) return "DAY6_ANDROID";
  if (!f.sentDay10 && within(LIFECYCLE_WINDOWS.day10) && f.hasWebsite) return "DAY10_OFFER";
  return null;
}
