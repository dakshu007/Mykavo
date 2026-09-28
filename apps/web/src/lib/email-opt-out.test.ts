import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const upsert = vi.fn();
vi.mock("@mykavo/database", () => ({
  isMissingTableError: (e: unknown) => e instanceof Error && e.message.includes("P2021"),
  prisma: {
    notification: { findUnique: (...a: unknown[]) => findUnique(...a) },
    emailOptOut: { upsert: (...a: unknown[]) => upsert(...a) },
  },
}));

const { optOutByNotificationId, isUnsubscribableNotification } = await import("./email-opt-out");

const ID = "cm1abcdefghijklmnopqrstu";

describe("lifecycle email opt-out", () => {
  beforeEach(() => {
    findUnique.mockReset();
    upsert.mockReset();
  });

  it("opts out the address a lifecycle email went to, lowercased", async () => {
    findUnique.mockResolvedValue({ recipient: " Ana@Example.com ", subject: "Get your MyKavo alerts on your phone" });
    expect(await optOutByNotificationId(ID, "one_click")).toBe("ok");
    expect(upsert).toHaveBeenCalledWith({
      where: { email: "ana@example.com" },
      create: { email: "ana@example.com", source: "one_click" },
      update: {},
    });
  });

  it("refuses the id of an alert email, so alerts can never be used to opt someone out", async () => {
    findUnique.mockResolvedValue({ recipient: "a@b.com", subject: "Critical changes detected on example.com" });
    expect(await optOutByNotificationId(ID, "unsubscribe_link")).toBe("invalid");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects malformed and unknown ids without touching the database for junk", async () => {
    expect(await optOutByNotificationId("../etc", "unsubscribe_link")).toBe("invalid");
    expect(await optOutByNotificationId(null, "unsubscribe_link")).toBe("invalid");
    expect(findUnique).not.toHaveBeenCalled();
    findUnique.mockResolvedValue(null);
    expect(await optOutByNotificationId(ID, "unsubscribe_link")).toBe("invalid");
  });

  it("reports an error when the table is missing, instead of pretending it worked", async () => {
    findUnique.mockResolvedValue({ recipient: "a@b.com", subject: "15% off MyKavo Pro: $17 a month for 8 websites" });
    upsert.mockRejectedValue(new Error('relation "email_opt_out" does not exist'));
    expect(await optOutByNotificationId(ID, "unsubscribe_link")).toBe("error");
  });

  it("only offers the confirm button for lifecycle emails", async () => {
    findUnique.mockResolvedValue({ subject: "Your first days with MyKavo: 4 scans, 1 change found" });
    expect(await isUnsubscribableNotification(ID)).toBe(true);
    findUnique.mockResolvedValue({ subject: "Welcome to MyKavo - start monitoring your website" });
    expect(await isUnsubscribableNotification(ID)).toBe(false);
  });

  it("trusts the send log over the subject, so edited subjects still unsubscribe", async () => {
    findUnique.mockResolvedValue({ recipient: "a@b.com", subject: "A subject an admin rewrote", automationSend: { automationKey: "day6_android" } });
    expect(await optOutByNotificationId(ID, "one_click")).toBe("ok");
    // A welcome email whose subject was edited to look like a lifecycle one still is not.
    findUnique.mockResolvedValue({ recipient: "a@b.com", subject: "Get your MyKavo alerts on your phone", automationSend: { automationKey: "welcome" } });
    expect(await optOutByNotificationId(ID, "one_click")).toBe("invalid");
  });

  it("falls back to subjects before the send-log table exists", async () => {
    findUnique
      .mockRejectedValueOnce(new Error("P2021 table does not exist"))
      .mockResolvedValueOnce({ recipient: "a@b.com", subject: "Get your MyKavo alerts on your phone" });
    expect(await optOutByNotificationId(ID, "one_click")).toBe("ok");
  });
});
