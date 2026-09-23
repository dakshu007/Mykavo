import { describe, expect, it } from "vitest";
import {
  SlackExchangeError,
  parseSlackAccessResponse,
  signSlackState,
  verifySlackState,
  type SlackStatePayload,
} from "./slack";
import { slackDestination } from "@/lib/notification-channels";

const SECRET = "a".repeat(40);
const NOW = 1_800_000_000_000;

function payload(overrides: Partial<SlackStatePayload> = {}): SlackStatePayload {
  return {
    workspaceId: "ws_1",
    userId: "user_1",
    nonce: "nonce-abcdefghijklmnop",
    exp: NOW + 60_000,
    ...overrides,
  };
}

describe("Slack install state", () => {
  it("round-trips when signature, clock and cookie nonce all agree", () => {
    const state = signSlackState(payload(), SECRET);
    const check = verifySlackState(state, "nonce-abcdefghijklmnop", SECRET, NOW);
    expect(check).toEqual({ ok: true, payload: payload() });
  });

  it("rejects a state finished in another browser (no or wrong cookie)", () => {
    const state = signSlackState(payload(), SECRET);
    expect(verifySlackState(state, undefined, SECRET, NOW)).toEqual({
      ok: false,
      reason: "nonce_mismatch",
    });
    expect(verifySlackState(state, "someone-elses-nonce-xxxx", SECRET, NOW)).toEqual({
      ok: false,
      reason: "nonce_mismatch",
    });
  });

  it("rejects a state whose workspace was edited", () => {
    const state = signSlackState(payload(), SECRET);
    const [, mac] = state.split(".");
    const forged = Buffer.from(JSON.stringify(payload({ workspaceId: "ws_victim" }))).toString(
      "base64url",
    );
    expect(verifySlackState(`${forged}.${mac}`, "nonce-abcdefghijklmnop", SECRET, NOW)).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("rejects a state signed with a different secret", () => {
    const state = signSlackState(payload(), "b".repeat(40));
    expect(verifySlackState(state, "nonce-abcdefghijklmnop", SECRET, NOW).ok).toBe(false);
  });

  it("rejects an expired state", () => {
    const state = signSlackState(payload({ exp: NOW - 1 }), SECRET);
    expect(verifySlackState(state, "nonce-abcdefghijklmnop", SECRET, NOW)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("rejects garbage", () => {
    for (const junk of ["", ".", "abc", "abc.", ".abc"]) {
      expect(verifySlackState(junk, "nonce-abcdefghijklmnop", SECRET, NOW).ok).toBe(false);
    }
  });
});

describe("parseSlackAccessResponse", () => {
  it("reads the webhook, channel and team", () => {
    expect(
      parseSlackAccessResponse({
        ok: true,
        access_token: "xoxb-not-kept",
        team: { id: "T1", name: "Acme" },
        incoming_webhook: {
          url: "https://hooks.slack.com/services/T1/B1/xyz",
          channel: "#alerts",
          channel_id: "C1",
        },
      }),
    ).toEqual({
      webhookUrl: "https://hooks.slack.com/services/T1/B1/xyz",
      channelName: "#alerts",
      teamName: "Acme",
    });
  });

  it("surfaces Slack's own error code", () => {
    expect(() => parseSlackAccessResponse({ ok: false, error: "invalid_code" })).toThrow(
      new SlackExchangeError("invalid_code"),
    );
  });

  it("refuses a success response without a webhook", () => {
    expect(() => parseSlackAccessResponse({ ok: true, team: { id: "T1" } })).toThrow(
      SlackExchangeError,
    );
  });
});

describe("slackDestination", () => {
  it("names the channel and team for Add to Slack channels", () => {
    expect(slackDestination({ channelName: "#alerts", teamName: "Acme" })).toBe("#alerts in Acme");
    expect(slackDestination({ channelName: "alerts" })).toBe("#alerts");
  });

  it("is null for pasted webhooks, which don't say", () => {
    expect(slackDestination({ webhookUrl: "https://hooks.slack.com/x" })).toBeNull();
    expect(slackDestination(null)).toBeNull();
  });
});

describe("buildSlackAuthorizeUrl", () => {
  it("asks only for incoming-webhook and returns to our callback", async () => {
    process.env.SLACK_CLIENT_ID = "123.456";
    process.env.APP_URL = "https://mykavo.app";
    const { buildSlackAuthorizeUrl } = await import("./slack");
    const url = new URL(buildSlackAuthorizeUrl("the-state"));
    expect(url.origin + url.pathname).toBe("https://slack.com/oauth/v2/authorize");
    expect(url.searchParams.get("scope")).toBe("incoming-webhook");
    expect(url.searchParams.get("client_id")).toBe("123.456");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://mykavo.app/api/integrations/slack/callback",
    );
    expect(url.searchParams.get("state")).toBe("the-state");
  });
});
