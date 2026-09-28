import { describe, expect, it } from "vitest";
import { decideLifecycleStep, type LifecycleFacts } from "./lifecycle";

const NOW = new Date("2026-09-28T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000);

const base = (over: Partial<LifecycleFacts> = {}): LifecycleFacts => ({
  signedUpAt: daysAgo(3.2),
  now: NOW,
  hasWebsite: true,
  isPaid: false,
  optedOut: false,
  emailOff: false,
  hasAndroidApp: false,
  sentDay3: false,
  sentDay6: false,
  sentDay10: false,
  lastLifecycleSentAt: null,
  ...over,
});

describe("lifecycle series", () => {
  it("sends day 3 stats to an account with a website, setup help to one without", () => {
    expect(decideLifecycleStep(base())).toBe("DAY3_STATS");
    expect(decideLifecycleStep(base({ hasWebsite: false }))).toBe("DAY3_SETUP");
  });

  it("sends nothing before day 3", () => {
    expect(decideLifecycleStep(base({ signedUpAt: daysAgo(2.9) }))).toBeNull();
  });

  it("walks through day 6 and day 10 once the earlier steps are sent", () => {
    expect(decideLifecycleStep(base({ signedUpAt: daysAgo(6.1), sentDay3: true }))).toBe("DAY6_ANDROID");
    expect(decideLifecycleStep(base({ signedUpAt: daysAgo(10.1), sentDay3: true, sentDay6: true }))).toBe("DAY10_OFFER");
    expect(decideLifecycleStep(base({ signedUpAt: daysAgo(10.1), sentDay3: true, sentDay6: true, sentDay10: true }))).toBeNull();
  });

  it("never back-fills old accounts: after day 14 the series is over", () => {
    expect(decideLifecycleStep(base({ signedUpAt: daysAgo(14.5) }))).toBeNull();
    expect(decideLifecycleStep(base({ signedUpAt: daysAgo(90) }))).toBeNull();
  });

  it("skips the app and the offer for an account that never added a website", () => {
    expect(decideLifecycleStep(base({ signedUpAt: daysAgo(6.5), sentDay3: true, hasWebsite: false }))).toBeNull();
    expect(decideLifecycleStep(base({ signedUpAt: daysAgo(11), sentDay3: true, sentDay6: true, hasWebsite: false }))).toBeNull();
  });

  it("skips the Android email for someone who already has or requested the app", () => {
    expect(decideLifecycleStep(base({ signedUpAt: daysAgo(6.5), sentDay3: true, hasAndroidApp: true }))).toBeNull();
  });

  it("stops completely for unsubscribed, email-off and paying accounts", () => {
    expect(decideLifecycleStep(base({ optedOut: true }))).toBeNull();
    expect(decideLifecycleStep(base({ emailOff: true }))).toBeNull();
    expect(decideLifecycleStep(base({ isPaid: true }))).toBeNull();
    expect(decideLifecycleStep(base({ signedUpAt: daysAgo(10.5), sentDay3: true, sentDay6: true, isPaid: true }))).toBeNull();
  });

  it("never sends two lifecycle emails within a day, even when catching up", () => {
    const catchUp = base({ signedUpAt: daysAgo(6.5), lastLifecycleSentAt: new Date(NOW.getTime() - 60 * 60 * 1000) });
    expect(decideLifecycleStep(catchUp)).toBeNull();
    expect(decideLifecycleStep({ ...catchUp, lastLifecycleSentAt: daysAgo(1) })).toBe("DAY3_STATS");
  });

  it("sends a missed day 3 before moving on, while its window is still open", () => {
    expect(decideLifecycleStep(base({ signedUpAt: daysAgo(6.5) }))).toBe("DAY3_STATS");
  });
});
