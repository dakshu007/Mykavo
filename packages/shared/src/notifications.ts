/**
 * Email alerts are ON by default.
 *
 * A workspace that has never saved notification settings is emailed at its
 * owner's address, with the default severity floor (HIGH). A monitoring
 * product nobody hears from is one people forget they have: the alert is
 * the product, so it reaches the person who signed up unless they say
 * otherwise.
 *
 * Saying otherwise is always honoured. A workspace that saved its settings
 * with email switched off stays off - this default only fills the gap where
 * nobody has made a choice yet. Every alert email links back to the
 * Notifications page, where it is one switch.
 *
 * (From 2026-09-20 to 2026-09-25 new workspaces were opt-in instead; the
 * workspaces created in that window had never chosen "off", so they are
 * covered by this default like everybody else.)
 *
 * Shared so the worker (who sends) and the dashboard (which shows the
 * switch) cannot disagree about what an unconfigured workspace receives.
 */
export const EMAIL_ALERTS_ON_BY_DEFAULT = true;
