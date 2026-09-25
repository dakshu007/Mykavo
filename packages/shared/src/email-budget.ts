/**
 * How much of the email plan the optional mail may spend.
 *
 * MyKavo sends through a provider plan with a hard daily and monthly cap
 * (Resend's free plan: 100 a day, 3,000 a month - set EMAIL_DAILY_LIMIT and
 * EMAIL_MONTHLY_LIMIT to match the plan actually in use). Hitting the cap
 * does not just stop the mail that caused it: every email after it fails,
 * including a CRITICAL alert about a customer's site going down. That alert
 * is the product; a reminder is not.
 *
 * So mail is tiered, and each tier may only spend up to a share of the cap,
 * leaving the rest untouched for the tiers above it:
 *
 *   ALERTS     - never budgeted here; they always send.
 *   ACTIVATION - "baseline ready": up to 80% of the day, 85% of the month.
 *   REMINDER   - "add your first website": up to 50% of the day, 60% of the
 *                month, and never more than `reminderDailyCap` in one day.
 *
 * Pure, so the arithmetic is tested without a database.
 */

export interface EmailLimits {
  daily: number;
  monthly: number;
  /** Hard ceiling on reminders per day, whatever the budget says. */
  reminderDailyCap: number;
}

export interface EmailUsage {
  sentToday: number;
  sentThisMonth: number;
  remindersToday: number;
}

export type BudgetTier = "ACTIVATION" | "REMINDER";

const SHARE: Record<BudgetTier, { day: number; month: number }> = {
  ACTIVATION: { day: 0.8, month: 0.85 },
  REMINDER: { day: 0.5, month: 0.6 },
};

export const DEFAULT_EMAIL_LIMITS: EmailLimits = {
  daily: 100,
  monthly: 3000,
  reminderDailyCap: 20,
};

/** How many more emails of this tier may go out right now (never negative). */
export function emailAllowance(tier: BudgetTier, limits: EmailLimits, usage: EmailUsage): number {
  const share = SHARE[tier];
  const byDay = Math.floor(limits.daily * share.day) - usage.sentToday;
  const byMonth = Math.floor(limits.monthly * share.month) - usage.sentThisMonth;
  let allowed = Math.min(byDay, byMonth);
  if (tier === "REMINDER") allowed = Math.min(allowed, limits.reminderDailyCap - usage.remindersToday);
  return Math.max(0, allowed);
}

/** Limits from the environment, falling back to the free plan. */
export function emailLimitsFromEnv(env: Record<string, string | undefined>): EmailLimits {
  const num = (v: string | undefined, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  };
  return {
    daily: num(env.EMAIL_DAILY_LIMIT, DEFAULT_EMAIL_LIMITS.daily),
    monthly: num(env.EMAIL_MONTHLY_LIMIT, DEFAULT_EMAIL_LIMITS.monthly),
    reminderDailyCap: num(env.ACTIVATION_REMINDERS_PER_DAY, DEFAULT_EMAIL_LIMITS.reminderDailyCap),
  };
}
