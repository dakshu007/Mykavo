import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyDodoWebhook, DodoWebhookError } from "./webhook";

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
