import { describe, expect, it } from "vitest";
import { aiAlertKey, pickAiCrawlerAlerts, shiftDay } from "./ai-crawler-alerts";

const today = "2026-11-04";

describe("pickAiCrawlerAlerts", () => {
  it("alerts on a crawler seen for the first time on a site with history", () => {
    const pick = pickAiCrawlerAlerts({
      firstSeen: { GPTBot: "2026-09-01", "Claude-SearchBot": "2026-11-03" },
      errorsByDay: {},
      alerted: new Set(),
      today,
    });
    expect(pick.newAgents).toEqual([{ agent: "Claude-SearchBot", day: "2026-11-03" }]);
    expect(pick.errorDays).toEqual([]);
  });

  it("does not call every crawler new on a freshly connected site", () => {
    const pick = pickAiCrawlerAlerts({
      firstSeen: { GPTBot: "2026-10-22", PerplexityBot: "2026-11-02" },
      errorsByDay: {},
      alerted: new Set(),
      today,
    });
    expect(pick.newAgents).toEqual([]);
  });

  it("alerts once per crawler", () => {
    const pick = pickAiCrawlerAlerts({
      firstSeen: { GPTBot: "2026-09-01", PerplexityBot: "2026-11-02" },
      errorsByDay: {},
      alerted: new Set([aiAlertKey("new_agent", "PerplexityBot", "2026-11-02")]),
      today,
    });
    expect(pick.newAgents).toEqual([]);
  });

  it("ignores crawlers first seen before the lookback", () => {
    const pick = pickAiCrawlerAlerts({
      firstSeen: { GPTBot: "2026-09-01", PerplexityBot: "2026-10-30" },
      errorsByDay: {},
      alerted: new Set(),
      today,
    });
    expect(pick.newAgents).toEqual([]);
  });

  it("alerts on 5 or more error hits on a recent complete day, once per day", () => {
    const pick = pickAiCrawlerAlerts({
      firstSeen: { GPTBot: "2026-09-01" },
      errorsByDay: { "2026-11-02": 5, "2026-11-03": 4, "2026-11-04": 50 },
      alerted: new Set(),
      today,
    });
    expect(pick.errorDays).toEqual([{ day: "2026-11-02", errors: 5 }]);

    const again = pickAiCrawlerAlerts({
      firstSeen: { GPTBot: "2026-09-01" },
      errorsByDay: { "2026-11-02": 5 },
      alerted: new Set([aiAlertKey("errors", "*", "2026-11-02")]),
      today,
    });
    expect(again.errorDays).toEqual([]);
  });

  it("shifts days across month ends", () => {
    expect(shiftDay("2026-11-01", 1)).toBe("2026-10-31");
  });
});
