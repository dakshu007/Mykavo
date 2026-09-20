import { describe, expect, it, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const findWorkspace = vi.fn();
vi.mock("@mykavo/database", () => ({
  prisma: {
    notificationChannel: { findUnique: () => findUnique() },
    workspace: { findUnique: () => findWorkspace() },
  },
}));

const { getEmailSettings } = await import("./notification-settings");

const OWNER = "owner@agency.com";

describe("getEmailSettings", () => {
  beforeEach(() => {
    findUnique.mockReset();
    // Default: a workspace created after the opt-in cutoff, i.e. a new one.
    findWorkspace.mockReset();
    findWorkspace.mockResolvedValue({ createdAt: new Date("2026-10-01T00:00:00Z") });
  });

  /**
   * The opt-in rule, from the dashboard's side. A workspace that has never
   * saved settings must render the switch OFF - if it rendered on, the user
   * would believe they were covered while the worker sent nothing, which is
   * the worst of both behaviours.
   */
  it("is off, not on, for a workspace that never configured alerts", async () => {
    findUnique.mockResolvedValue(null);
    const settings = await getEmailSettings("w1", OWNER);

    expect(settings.enabled).toBe(false);
    expect(settings.configured).toBe(false);
    // The address is still pre-filled so turning it on is one tap.
    expect(settings.recipients).toEqual([OWNER]);
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

  /**
   * The retroactivity guard. Workspaces that predate the opt-in rule were
   * already receiving owner-addressed alerts; going silent on them without
   * being asked is an outage they cannot see. A migration materialises these
   * as real rows, but migrations here are applied by hand - and the code
   * shipped first once already - so the rule has to hold without it.
   */
  it("keeps emailing a workspace that predates the opt-in rule", async () => {
    findUnique.mockResolvedValue(null);
    findWorkspace.mockResolvedValue({ createdAt: new Date("2026-01-15T00:00:00Z") });

    const settings = await getEmailSettings("w1", OWNER);
    expect(settings.enabled).toBe(true);
    expect(settings.configured).toBe(false);
    expect(settings.recipients).toEqual([OWNER]);
  });

  it("does not grandfather a workspace created after the cutoff", async () => {
    findUnique.mockResolvedValue(null);
    findWorkspace.mockResolvedValue({ createdAt: new Date("2026-09-21T00:00:00Z") });

    expect((await getEmailSettings("w1", OWNER)).enabled).toBe(false);
  });

  it("falls back to the owner when a saved channel has no recipients left", async () => {
    findUnique.mockResolvedValue({ enabled: true, configuration: { recipients: [] } });
    const settings = await getEmailSettings("w1", OWNER);
    expect(settings.recipients).toEqual([OWNER]);
  });
});
