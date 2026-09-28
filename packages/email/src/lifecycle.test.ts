import { describe, expect, it } from "vitest";
import {
  DAY10_OFFER_SUBJECT,
  DAY3_SETUP_SUBJECT,
  DAY3_STATS_SUBJECT_PREFIX,
  DAY6_ANDROID_SUBJECT,
  day10OfferEmail,
  day3SetupEmail,
  day3StatsEmail,
  day6AndroidEmail,
  firstWebsiteNudgeEmail,
  isLifecycleSubject,
  lifecycleHeaders,
} from "./templates";

const UNSUB = "https://mykavo.app/unsubscribe?n=cm1abcdefghijklmnopqrstu";

const stats = {
  name: "Ana Lopez",
  websitesCount: 1,
  pagesMonitored: 5,
  scansCompleted: 3,
  changesFound: 2,
  openChanges: 2,
  urgentChanges: 1,
  dashboardUrl: "https://mykavo.app/dashboard",
  changesUrl: "https://mykavo.app/dashboard/changes",
  unsubscribeUrl: UNSUB,
};

const all = [
  day3StatsEmail(stats),
  day3SetupEmail({ name: "Ana", addWebsiteUrl: "https://mykavo.app/dashboard/websites/new", tutorialsUrl: "https://mykavo.app/video-tutorials", unsubscribeUrl: UNSUB }),
  day6AndroidEmail({ name: "Ana", androidUrl: "https://mykavo.app/android-app", alertEmail: "ana@example.com", notificationsUrl: "https://mykavo.app/dashboard/notifications", unsubscribeUrl: UNSUB }),
  day10OfferEmail({ name: "Ana", code: "PRO17", price: 17, regularPrice: 20, upgradeUrl: "https://mykavo.app/dashboard/billing", unsubscribeUrl: UNSUB }),
];

describe("lifecycle emails", () => {
  it("every one carries a visible unsubscribe link in both html and text", () => {
    for (const mail of all) {
      expect(mail.html).toContain("Unsubscribe from these emails");
      expect(mail.html).toContain(UNSUB);
      expect(mail.text).toContain(UNSUB);
      expect(mail.html).toContain("Website alerts are separate");
    }
  });

  it("every subject is recognised as lifecycle mail, and alerts are not", () => {
    for (const mail of all) expect(isLifecycleSubject(mail.subject)).toBe(true);
    expect(isLifecycleSubject("Critical changes detected on example.com")).toBe(false);
    expect(isLifecycleSubject("Welcome to MyKavo - start monitoring your website")).toBe(false);
  });

  it("uses hyphens, never em dashes", () => {
    for (const mail of all) {
      expect(mail.html).not.toContain("—");
      expect(mail.text).not.toContain("—");
    }
  });

  it("builds RFC 8058 one-click headers", () => {
    expect(lifecycleHeaders(UNSUB)).toEqual({
      "List-Unsubscribe": `<${UNSUB}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});

describe("day 3 stats", () => {
  it("puts the real numbers in the subject and sends open changes to review", () => {
    const mail = day3StatsEmail(stats);
    expect(mail.subject).toBe(`${DAY3_STATS_SUBJECT_PREFIX}: 3 scans, 2 changes found`);
    expect(mail.html).toContain("Review changes");
    expect(mail.text).toContain("1 of them rated High or Critical");
  });

  it("says a quiet site is a healthy one when nothing is open", () => {
    const mail = day3StatsEmail({ ...stats, scansCompleted: 1, changesFound: 0, openChanges: 0, urgentChanges: 0 });
    expect(mail.subject).toBe(`${DAY3_STATS_SUBJECT_PREFIX}: 1 scan, 0 changes found`);
    expect(mail.html).toContain("Open your dashboard");
    expect(mail.text).toContain("Nothing important has changed");
  });
});

describe("the other steps", () => {
  it("day 3 setup links the video walkthroughs", () => {
    expect(all[1].subject).toBe(DAY3_SETUP_SUBJECT);
    expect(all[1].html).toContain("https://mykavo.app/video-tutorials");
  });

  it("day 6 names the address alerts already go to", () => {
    expect(all[2].subject).toBe(DAY6_ANDROID_SUBJECT);
    expect(all[2].html).toContain("ana@example.com");
  });

  it("day 10 shows the code and the real prices, with no deadline it cannot enforce", () => {
    const mail = all[3];
    expect(mail.subject).toBe(DAY10_OFFER_SUBJECT);
    expect(mail.html).toContain("PRO17");
    expect(mail.text).toContain("$17 a month instead of $20");
    expect(mail.text.toLowerCase()).not.toMatch(/expires|last chance|hours left|ends (today|tonight)/);
  });
});

describe("first-website nudge", () => {
  it("no longer promises to be the only reminder, now that Day 3 follows it", () => {
    const mail = firstWebsiteNudgeEmail({ name: "Ana", addWebsiteUrl: "https://x", docsUrl: "https://y" });
    expect(mail.text).not.toContain("only reminder");
  });
});
