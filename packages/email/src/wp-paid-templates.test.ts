import { describe, expect, it } from "vitest";
import {
  aiCrawlerAlertEmail,
  clientReportDeliveryEmail,
  pluginHealthAlertEmail,
  weeklyReportEmail,
  type WeeklyReportData,
} from "./templates";

const weekly: WeeklyReportData = {
  websiteName: "Aurora Outdoor",
  websiteHost: "aurora-outdoor.com",
  periodLabel: "Jul 3 - Jul 10, 2026",
  scansRun: 7,
  scansFailed: 0,
  totalChanges: 0,
  changesBySeverity: [],
  uptimePercent: 100,
  avgResponseMs: 231,
  sslDaysLeft: 83,
  lighthouse: null,
  allQuiet: true,
  dashboardUrl: "https://mykavo.app/dashboard/websites/w1",
};

describe("WordPress updates in reports", () => {
  it("leaves reports without updates unchanged", () => {
    const plain = weeklyReportEmail(weekly);
    expect(weeklyReportEmail({ ...weekly, wordpressUpdates: null })).toEqual(plain);
    expect(plain.html).not.toContain("WordPress updates");
  });

  it("lists the notes and counts the rest", () => {
    const { html, text } = weeklyReportEmail({
      ...weekly,
      wordpressUpdates: { count: 7, notes: ["Updated WooCommerce 9.3 → 9.4", "Rolled back Forms 2.1 to 2.0"] },
    });
    expect(html).toContain("WordPress updates: 7");
    expect(html).toContain("Rolled back Forms 2.1 to 2.0");
    expect(html).toContain("And 5 more.");
    expect(text).toContain("- Updated WooCommerce 9.3 → 9.4");
  });

  it("escapes notes in the client report", () => {
    const { html, text } = clientReportDeliveryEmail({
      websiteName: "Aurora",
      websiteHost: "aurora.com",
      periodLabel: "Jul 3 - Aug 2, 2026",
      brandName: null,
      scansRun: 3,
      totalChanges: 0,
      uptimePercent: 100,
      avgResponseMs: 200,
      reportUrl: "https://mykavo.app/r/t",
      wordpressUpdates: { count: 1, notes: ["Updated <script>"] },
    });
    expect(html).toContain("Updated &lt;script&gt;");
    expect(text).toContain("WordPress updates: 1");
  });
});

describe("pluginHealthAlertEmail", () => {
  it("names a single closed plugin in the subject", () => {
    const mail = pluginHealthAlertEmail({
      plugins: [{ name: "Old Forms", websiteHost: "shop.com", status: "closed", reason: "Closed on WordPress.org." }],
      dashboardUrl: "https://mykavo.app/dashboard",
    });
    expect(mail.subject).toBe("Plugin Health: Old Forms was closed on shop.com");
    expect(mail.text).toContain("[Closed] Old Forms (shop.com)");
  });

  it("summarises several plugins across sites and escapes names", () => {
    const mail = pluginHealthAlertEmail({
      plugins: [
        { name: "<b>X</b>", websiteHost: "a.com", status: "outdated", reason: "Not updated." },
        { name: "Y", websiteHost: "b.com", status: "outdated", reason: "Not updated." },
      ],
      dashboardUrl: "https://mykavo.app/dashboard",
    });
    expect(mail.subject).toBe("Plugin Health: 2 plugins need a look on 2 sites");
    expect(mail.html).toContain("&lt;b&gt;X&lt;/b&gt;");
  });
});

describe("aiCrawlerAlertEmail", () => {
  it("covers new crawlers and errors", () => {
    const mail = aiCrawlerAlertEmail({
      websiteName: "Shop",
      websiteHost: "shop.com",
      newAgents: [{ agent: "Claude-SearchBot", owner: "Claude search", day: "2026-11-03" }],
      errorDays: [{ day: "2026-11-03", errors: 12 }],
      dashboardUrl: "https://mykavo.app/dashboard/websites/w1",
    });
    expect(mail.subject).toBe(
      "AI crawlers on shop.com: Claude-SearchBot visited for the first time, 12 errors served to AI crawlers",
    );
    expect(mail.html).toContain("Claude-SearchBot (Claude search), first seen 2026-11-03");
    expect(mail.text).toContain("12 on 2026-11-03");
  });
});
