import { describe, expect, it } from "vitest";
import {
  AUTOMATION_KEYS,
  AUTOMATIONS,
  defaultSettings,
  lifecycleSendDays,
  matchesLegacySubject,
  renderAutomation,
  sampleAutomationData,
  settingsFromRows,
  validateSettings,
} from "./automations";
import { DAY10_OFFER_SUBJECT, isLifecycleSubject } from "./templates";

const APP = "https://mykavo.app";

describe("automation registry", () => {
  it("renders every automation with sample data, and defaults keep the shipped subjects", () => {
    const s = defaultSettings();
    for (const key of AUTOMATION_KEYS) {
      const mail = renderAutomation(sampleAutomationData(key, APP, "Ana Lopez"), s);
      expect(mail.subject.length).toBeGreaterThan(5);
      expect(mail.html).not.toMatch(/\{[a-zA-Z]+\}/);
      expect(matchesLegacySubject(key, mail.subject)).toBe(true);
      // Optional mail and only optional mail carries an unsubscribe.
      expect(mail.html.includes("Unsubscribe from these emails")).toBe(AUTOMATIONS[key].unsubscribable);
      expect(isLifecycleSubject(mail.subject)).toBe(AUTOMATIONS[key].unsubscribable);
    }
  });

  it("uses saved copy, filling placeholders and escaping HTML", () => {
    const s = defaultSettings();
    s.day6_android.copy = { subject: "Hey {firstName}, alerts <b>on the go</b>", intro: "Line one\n\nLine two" };
    const mail = renderAutomation(sampleAutomationData("day6_android", APP, "Ana Lopez"), s);
    expect(mail.subject).toBe("Hey Ana, alerts <b>on the go</b>");
    expect(mail.html).toContain("Line one");
    expect(mail.html).toContain("Line two");
    expect(mail.html).not.toContain("<b>on the go</b>");
  });

  it("drops an unknown first name cleanly", () => {
    const mail = renderAutomation(sampleAutomationData("day3_setup", APP, ""), defaultSettings());
    expect(mail.text.startsWith("Hi, your account is ready")).toBe(true);
    const welcome = renderAutomation(sampleAutomationData("welcome", APP, ""), defaultSettings());
    expect(welcome.html).toContain("Welcome to MyKavo");
  });

  it("takes the offer code, percent, price and day from settings", () => {
    const s = defaultSettings();
    expect(renderAutomation(sampleAutomationData("day10_offer", APP, "Ana"), s).subject).toBe(DAY10_OFFER_SUBJECT);
    s.day10_offer = { ...s.day10_offer, offerCode: "PRO20", offerPercent: 20, sendOnDay: 12 };
    const mail = renderAutomation(sampleAutomationData("day10_offer", APP, "Ana"), s);
    expect(mail.subject).toBe("20% off MyKavo Pro: $16 a month for 8 websites");
    expect(mail.html).toContain("PRO20");
    expect(mail.text).toContain("12 days");
  });
});

describe("validateSettings", () => {
  it("accepts an edit and stores defaults as empty", () => {
    const r = validateSettings("day10_offer", { enabled: true, subject: "  New subject ", offerCode: "pro17", offerPercent: "15", sendOnDay: "10" }, defaultSettings());
    expect(r).toEqual({
      ok: true,
      settings: { enabled: true, copy: { subject: "New subject", heading: null, intro: null, buttonLabel: null }, sendOnDay: null, offerCode: null, offerPercent: null },
    });
  });

  it("rejects bad lengths, multi-line subjects, codes and percents", () => {
    const r = validateSettings("day10_offer", { subject: "a\nb", intro: "x".repeat(1300), offerCode: "no spaces", offerPercent: 80 }, defaultSettings());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["intro", "offerCode", "offerPercent", "subject"]);
  });

  it("keeps the send days in order", () => {
    const r = validateSettings("day6_android", { sendOnDay: 11 }, defaultSettings());
    expect(r.ok).toBe(false);
    const ok = validateSettings("day6_android", { sendOnDay: 7 }, defaultSettings());
    expect(ok.ok && ok.settings.sendOnDay).toBe(7);
  });

  it("ignores timing and offer fields on emails that have none", () => {
    const r = validateSettings("welcome", { sendOnDay: 99, offerCode: "!!", enabled: false }, defaultSettings());
    expect(r.ok && r.settings).toMatchObject({ enabled: false, sendOnDay: null, offerCode: null });
  });
});

describe("settingsFromRows", () => {
  it("fills defaults and ignores unknown keys", () => {
    const s = settingsFromRows([
      { key: "day6_android", enabled: false, subject: "S", heading: null, intro: null, buttonLabel: null, sendOnDay: 7, offerCode: "X", offerPercent: 9 },
      { key: "gone", enabled: false, subject: null, heading: null, intro: null, buttonLabel: null, sendOnDay: null, offerCode: null, offerPercent: null },
    ]);
    expect(s.day6_android).toMatchObject({ enabled: false, sendOnDay: 7, offerCode: null, offerPercent: null });
    expect(s.welcome.enabled).toBe(true);
    expect(lifecycleSendDays(s)).toEqual({ day3: 3, day6: 7, day10: 10 });
  });
});
