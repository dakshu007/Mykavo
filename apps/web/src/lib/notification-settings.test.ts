import { describe, expect, it, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
vi.mock("@mykavo/database", () => ({
  prisma: { notificationChannel: { findUnique: () => findUnique() } },
}));

const { getEmailSettings } = await import("./notification-settings");

const OWNER = "owner@agency.com";

describe("getEmailSettings", () => {
  beforeEach(() => findUnique.mockReset());

  /**
   * The default, from the dashboard's side. A workspace that has never saved
   * settings is emailed at the owner's address, and the switch must show ON
   * to match what the worker actually sends.
   */
  it("is on, addressed to the owner, for a workspace that never configured alerts", async () => {
    findUnique.mockResolvedValue(null);
    const settings = await getEmailSettings("w1", OWNER);

    expect(settings.enabled).toBe(true);
    expect(settings.configured).toBe(false);
    expect(settings.recipients).toEqual([OWNER]);
    expect(settings.minSeverity).toBe("HIGH");
  });

  it("reports a saved channel exactly as saved", async () => {
    findUnique.mockResolvedValue({
      enabled: true,
      configuration: {
        recipients: ["alerts@agency.com"],
        minSeverity: "CRITICAL",
        failureAlerts: false,
        weeklyReports: false,
      },
    });
    const settings = await getEmailSettings("w1", OWNER);

    expect(settings).toMatchObject({
      enabled: true,
      configured: true,
      recipients: ["alerts@agency.com"],
      minSeverity: "CRITICAL",
      failureAlerts: false,
      weeklyReports: false,
    });
  });

  it("keeps a deliberately switched-off channel switched off", async () => {
    findUnique.mockResolvedValue({
      enabled: false,
      configuration: { recipients: ["alerts@agency.com"], minSeverity: "HIGH" },
    });
    const settings = await getEmailSettings("w1", OWNER);

    expect(settings.enabled).toBe(false);
    // configured stays true: they made a choice, and the form must not treat
    // it as a fresh workspace and quietly re-offer the defaults.
    expect(settings.configured).toBe(true);
  });

  it("falls back to the owner when a saved channel has no recipients left", async () => {
    findUnique.mockResolvedValue({ enabled: true, configuration: { recipients: [] } });
    const settings = await getEmailSettings("w1", OWNER);
    expect(settings.recipients).toEqual([OWNER]);
  });
});
