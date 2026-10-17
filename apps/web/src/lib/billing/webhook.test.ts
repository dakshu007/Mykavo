import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  verifyDodoWebhook,
  classifyDodoEvent,
  grantPrecheck,
  parseToleranceSeconds,
  resolveGrantedPlan,
  DodoWebhookError,
} from "./webhook";

/** Sign a body the way Dodo (Standard Webhooks) does, for test fixtures. */
function sign(rawBody: string, id: string, ts: number, secret: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const sig = createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`, "utf8").digest("base64");
  return `v1,${sig}`;
}

const SECRET = "whsec_" + Buffer.from("super-secret-signing-key-000000").toString("base64");
const BODY = JSON.stringify({ type: "subscription.active", data: { status: "active" } });

function headers(id: string, ts: number, signature: string) {
  return { webhookId: id, webhookTimestamp: String(ts), webhookSignature: signature };
}

describe("verifyDodoWebhook", () => {
  const now = () => Math.floor(Date.now() / 1000);

  it("accepts a correctly signed, fresh webhook and returns the parsed body", () => {
    const ts = now();
    const sig = sign(BODY, "evt_1", ts, SECRET);
    const result = verifyDodoWebhook(BODY, headers("evt_1", ts, sig), SECRET) as {
      type: string;
    };
    expect(result.type).toBe("subscription.active");
  });

  it("works whether or not the secret carries the whsec_ prefix", () => {
    const ts = now();
    const bare = SECRET.replace(/^whsec_/, "");
    const sig = sign(BODY, "evt_2", ts, bare);
    expect(() => verifyDodoWebhook(BODY, headers("evt_2", ts, sig), bare)).not.toThrow();
  });

  it("rejects a tampered body", () => {
    const ts = now();
    const sig = sign(BODY, "evt_3", ts, SECRET);
    expect(() =>
      verifyDodoWebhook(BODY + " ", headers("evt_3", ts, sig), SECRET),
    ).toThrow(DodoWebhookError);
  });

  it("rejects a wrong signature", () => {
    const ts = now();
    expect(() =>
      verifyDodoWebhook(BODY, headers("evt_4", ts, "v1,not-a-real-signature"), SECRET),
    ).toThrowError(/No matching/);
  });

  it("rejects a stale timestamp (replay protection)", () => {
    const ts = now() - 3600;
    const sig = sign(BODY, "evt_5", ts, SECRET);
    expect(() => verifyDodoWebhook(BODY, headers("evt_5", ts, sig), SECRET)).toThrowError(
      /tolerance/,
    );
  });

  it("rejects a future timestamp beyond tolerance", () => {
    const ts = now() + 3600;
    const sig = sign(BODY, "evt_6", ts, SECRET);
    expect(() => verifyDodoWebhook(BODY, headers("evt_6", ts, sig), SECRET)).toThrow(
      DodoWebhookError,
    );
  });

  it("rejects missing headers", () => {
    expect(() =>
      verifyDodoWebhook(BODY, { webhookId: null, webhookTimestamp: null, webhookSignature: null }, SECRET),
    ).toThrowError(/Missing/);
  });

  it("accepts when one of several space-delimited tokens matches (key rotation)", () => {
    const ts = now();
    const good = sign(BODY, "evt_7", ts, SECRET);
    const combined = `v1,AAAAstalesignature== ${good} v2,ignored`;
    expect(() => verifyDodoWebhook(BODY, headers("evt_7", ts, combined), SECRET)).not.toThrow();
  });

  it("ignores non-v1 versions", () => {
    const ts = now();
    const key = Buffer.from(SECRET.replace(/^whsec_/, ""), "base64");
    const sig = createHmac("sha256", key).update(`evt_8.${ts}.${BODY}`).digest("base64");
    expect(() =>
      verifyDodoWebhook(BODY, headers("evt_8", ts, `v2,${sig}`), SECRET),
    ).toThrowError(/No matching/);
  });
});

describe("classifyDodoEvent", () => {
  it("grants on subscription lifecycle events with active/empty status", () => {
    expect(classifyDodoEvent("subscription.active", "active")).toBe("grant");
    expect(classifyDodoEvent("subscription.active", "")).toBe("grant");
    expect(classifyDodoEvent("subscription.renewed", "active")).toBe("grant");
  });

  it("grants on payment.succeeded regardless of the PAYMENT status field (prod regression)", () => {
    // payment.succeeded carries the payment's own status, not the
    // subscription's - "succeeded" must never read as a revoke.
    expect(classifyDodoEvent("payment.succeeded", "succeeded")).toBe("grant");
    expect(classifyDodoEvent("payment.succeeded", "")).toBe("grant");
  });

  it("ignores non-subscription/payment event families (prod regression)", () => {
    // A license key's "Delivered" status downgraded a paying workspace
    // seconds after checkout - these families must never touch entitlements.
    expect(classifyDodoEvent("license_key.created", "Delivered")).toBe("ignored");
    expect(classifyDodoEvent("entitlement_grant.created", "Delivered")).toBe("ignored");
    expect(classifyDodoEvent("dispute.opened", "open")).toBe("ignored");
    expect(classifyDodoEvent("refund.failed", "failed")).toBe("ignored");
    expect(classifyDodoEvent("", "")).toBe("ignored");
  });

  it("revokes on a completed refund (money returned = access ends)", () => {
    expect(classifyDodoEvent("refund.succeeded", "succeeded")).toBe("revoke");
  });

  it("revokes on explicit revoke events", () => {
    for (const t of [
      "subscription.cancelled",
      "subscription.canceled",
      "subscription.expired",
      "subscription.failed",
      "subscription.on_hold",
    ]) {
      expect(classifyDodoEvent(t, "")).toBe("revoke");
    }
  });

  it("revokes when a subscription event carries a dead status", () => {
    expect(classifyDodoEvent("subscription.updated", "on_hold")).toBe("revoke");
    expect(classifyDodoEvent("subscription.updated", "cancelled")).toBe("revoke");
  });

  it("noops on subscription.updated while active/pending (prod regression: must not burn the checkout token)", () => {
    expect(classifyDodoEvent("subscription.updated", "active")).toBe("noop");
    expect(classifyDodoEvent("subscription.updated", "pending")).toBe("noop");
    expect(classifyDodoEvent("subscription.updated", "")).toBe("noop");
    expect(classifyDodoEvent("payment.failed", "failed")).toBe("noop");
  });
});

describe("plan changes (Pro <-> Agency)", () => {
  it("grants on subscription.plan_changed while active", () => {
    expect(classifyDodoEvent("subscription.plan_changed", "active")).toBe("grant");
  });

  it("still revokes a plan_changed event that carries a dead status", () => {
    expect(classifyDodoEvent("subscription.plan_changed", "on_hold")).toBe("revoke");
  });
});

describe("resolveGrantedPlan", () => {
  it("trusts a recognised product above everything else", () => {
    expect(
      resolveGrantedPlan({ productPlan: "agency", intentKind: "pro", recordedPlan: "pro" }),
    ).toBe("agency");
    // A scheduled downgrade lands as a Pro product on an Agency workspace.
    expect(
      resolveGrantedPlan({ productPlan: "pro", intentKind: null, recordedPlan: "agency" }),
    ).toBe("pro");
  });

  it("falls back to the checkout intent when a subscription event has no product", () => {
    expect(
      resolveGrantedPlan({ productPlan: null, intentKind: "agency", recordedPlan: null }),
    ).toBe("agency");
  });

  it("keeps the recorded plan on a renewal payment, never demoting Agency to Pro", () => {
    expect(
      resolveGrantedPlan({ productPlan: null, intentKind: null, recordedPlan: "agency" }),
    ).toBe("agency");
  });

  it("ignores legacy or unknown intent kinds", () => {
    expect(
      resolveGrantedPlan({ productPlan: null, intentKind: "website_addon", recordedPlan: null }),
    ).toBe("pro");
  });

  it("defaults to Pro, the plan every pre-Agency subscription was on", () => {
    expect(resolveGrantedPlan({ productPlan: null, intentKind: null, recordedPlan: null })).toBe(
      "pro",
    );
  });
});

describe("parseToleranceSeconds", () => {
  it("reads a positive number", () => {
    expect(parseToleranceSeconds("600")).toBe(600);
  });

  it("falls back to 300 for missing, empty, non-numeric or non-positive values", () => {
    expect(parseToleranceSeconds(undefined)).toBe(300);
    expect(parseToleranceSeconds("")).toBe(300);
    expect(parseToleranceSeconds("five minutes")).toBe(300);
    expect(parseToleranceSeconds("-10")).toBe(300);
    expect(parseToleranceSeconds("0")).toBe(300);
  });
});

describe("grant gating (security review)", () => {
  it("refuses an unknown product, whatever the checkout token says", () => {
    expect(
      grantPrecheck({
        eventType: "subscription.active",
        productId: "pdt_cheap_other_product",
        productPlan: null,
        subscriptionId: "sub_1",
      }),
    ).toEqual({ ok: false, reason: "UNKNOWN_PRODUCT" });
    expect(
      resolveGrantedPlan({
        eventType: "subscription.active",
        productId: "pdt_cheap_other_product",
        productPlan: null,
        intentKind: "agency",
        recordedPlan: null,
      }),
    ).toBeNull();
  });

  it("refuses a one-time payment with no subscription_id", () => {
    expect(
      grantPrecheck({
        eventType: "payment.succeeded",
        productId: null,
        productPlan: null,
        subscriptionId: null,
      }),
    ).toEqual({ ok: false, reason: "PAYMENT_WITHOUT_SUBSCRIPTION" });
    expect(
      grantPrecheck({
        eventType: "payment.succeeded",
        productId: "pdt_pro",
        productPlan: "pro",
        subscriptionId: null,
      }),
    ).toEqual({ ok: false, reason: "PAYMENT_WITHOUT_SUBSCRIPTION" });
  });

  it("never lets a product-less payment use the checkout token", () => {
    expect(
      grantPrecheck({
        eventType: "payment.succeeded",
        productId: null,
        productPlan: null,
        subscriptionId: "sub_new",
      }),
    ).toEqual({ ok: true, mayUseCheckoutIntent: false });
    // Even if an intent kind leaks in, an unbound payment does not grant.
    expect(
      resolveGrantedPlan({
        eventType: "payment.succeeded",
        productId: null,
        productPlan: null,
        intentKind: "agency",
        recordedPlan: null,
        boundBySubscription: false,
      }),
    ).toBeNull();
  });

  it("renews an already-bound subscription from a product-less payment, keeping its plan", () => {
    expect(
      resolveGrantedPlan({
        eventType: "payment.succeeded",
        productId: null,
        productPlan: null,
        intentKind: null,
        recordedPlan: "agency",
        boundBySubscription: true,
      }),
    ).toBe("agency");
    expect(
      resolveGrantedPlan({
        eventType: "payment.succeeded",
        productId: null,
        productPlan: null,
        intentKind: null,
        recordedPlan: null,
        boundBySubscription: true,
      }),
    ).toBe("pro");
  });

  it("keeps normal Pro and Agency subscription flows unchanged", () => {
    for (const [plan, intentKind] of [
      ["pro", "pro"],
      ["agency", "agency"],
    ] as const) {
      const precheck = grantPrecheck({
        eventType: "subscription.active",
        productId: `pdt_${plan}`,
        productPlan: plan,
        subscriptionId: "sub_ok",
      });
      expect(precheck).toEqual({ ok: true, mayUseCheckoutIntent: true });
      expect(
        resolveGrantedPlan({
          eventType: "subscription.active",
          productId: `pdt_${plan}`,
          productPlan: plan,
          intentKind,
          recordedPlan: null,
          boundBySubscription: false,
        }),
      ).toBe(plan);
      // Renewal on the bound subscription.
      expect(
        resolveGrantedPlan({
          eventType: "subscription.renewed",
          productId: `pdt_${plan}`,
          productPlan: plan,
          intentKind: null,
          recordedPlan: plan,
          boundBySubscription: true,
        }),
      ).toBe(plan);
    }
  });

  it("grants a payment that names a known product and a subscription", () => {
    expect(
      grantPrecheck({
        eventType: "payment.succeeded",
        productId: "pdt_agency",
        productPlan: "agency",
        subscriptionId: "sub_ok",
      }),
    ).toEqual({ ok: true, mayUseCheckoutIntent: true });
  });
});
