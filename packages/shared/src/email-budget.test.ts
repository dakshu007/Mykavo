import { describe, expect, it } from "vitest";
import { DEFAULT_EMAIL_LIMITS, emailAllowance, emailLimitsFromEnv } from "./email-budget";

const fresh = { sentToday: 0, sentThisMonth: 0, remindersToday: 0 };

describe("email budget", () => {
  it("lets reminders use at most the daily cap on a quiet day", () => {
    expect(emailAllowance("REMINDER", DEFAULT_EMAIL_LIMITS, fresh)).toBe(20);
  });

  it("keeps half the day free for alerts", () => {
    // 45 sent today: reminders may only take the day to 50.
    expect(emailAllowance("REMINDER", DEFAULT_EMAIL_LIMITS, { ...fresh, sentToday: 45 })).toBe(5);
    expect(emailAllowance("REMINDER", DEFAULT_EMAIL_LIMITS, { ...fresh, sentToday: 60 })).toBe(0);
    // Activation mail may go further, to 80.
    expect(emailAllowance("ACTIVATION", DEFAULT_EMAIL_LIMITS, { ...fresh, sentToday: 60 })).toBe(20);
  });

  it("stops reminders well before the monthly cap", () => {
    const late = { ...fresh, sentThisMonth: 1795 };
    expect(emailAllowance("REMINDER", DEFAULT_EMAIL_LIMITS, late)).toBe(5);
    expect(emailAllowance("REMINDER", DEFAULT_EMAIL_LIMITS, { ...late, sentThisMonth: 1800 })).toBe(0);
  });

  it("counts reminders already sent today against the daily cap", () => {
    expect(emailAllowance("REMINDER", DEFAULT_EMAIL_LIMITS, { ...fresh, remindersToday: 20 })).toBe(0);
  });

  it("never goes negative", () => {
    expect(emailAllowance("ACTIVATION", DEFAULT_EMAIL_LIMITS, { ...fresh, sentToday: 500 })).toBe(0);
  });

  it("reads the plan from the environment, ignoring junk", () => {
    expect(emailLimitsFromEnv({ EMAIL_DAILY_LIMIT: "500", EMAIL_MONTHLY_LIMIT: "3000" })).toEqual({
      daily: 500,
      monthly: 3000,
      reminderDailyCap: 20,
    });
    expect(emailLimitsFromEnv({ EMAIL_DAILY_LIMIT: "lots" }).daily).toBe(100);
  });
});
