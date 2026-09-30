import { describe, expect, it } from "vitest";
import { paymentProblemEmail } from "@mykavo/email";
import { paymentProblemKind } from "./webhook";

describe("paymentProblemKind", () => {
  it("reminds on a declined charge and on a paused plan", () => {
    expect(paymentProblemKind("payment.failed", "failed")).toBe("failed");
    expect(paymentProblemKind("subscription.on_hold", "on_hold")).toBe("on_hold");
    expect(paymentProblemKind("subscription.updated", "on_hold")).toBe("on_hold");
  });

  it("stays quiet for everything else", () => {
    expect(paymentProblemKind("payment.succeeded", "succeeded")).toBeNull();
    expect(paymentProblemKind("subscription.active", "active")).toBeNull();
    expect(paymentProblemKind("subscription.cancelled", "cancelled")).toBeNull();
  });
});

describe("paymentProblemEmail", () => {
  it("names the plan and links to Billing", () => {
    const mail = paymentProblemEmail({ planName: "Pro", kind: "on_hold", billingUrl: "https://mykavo.app/dashboard/billing" });
    expect(mail.subject).toContain("Pro");
    expect(mail.html).toContain("https://mykavo.app/dashboard/billing");
    expect(mail.text).toContain("Billing: https://mykavo.app/dashboard/billing");
  });
});
