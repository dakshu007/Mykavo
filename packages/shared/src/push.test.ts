import { describe, expect, it } from "vitest";

import {
  buildPushMessages,
  chunkTokens,
  classifyTickets,
  failureAlert,
  isExpoPushToken,
  PUSH_BODY_MAX,
  PUSH_CHANNEL_CRITICAL,
  PUSH_CHANNEL_DEFAULT,
  PUSH_CHUNK_LIMIT,
  PUSH_TITLE_MAX,
  pushChannelId,
  pushPriority,
  scanAlert,
  tokensToPrune,
  truncate,
  type ExpoPushTicket,
} from "./push";

const TOKEN_A = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";
const TOKEN_B = "ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]";

describe("isExpoPushToken", () => {
  it("accepts both bracket prefixes", () => {
    expect(isExpoPushToken(TOKEN_A)).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]")).toBe(true);
  });

  it("accepts the bare UUID form", () => {
    expect(isExpoPushToken("F5BC1CA4-9D0A-4B0C-8D3E-7A1B2C3D4E5F")).toBe(true);
  });

  it("rejects an empty bracket body", () => {
    // "ExponentPushToken[]" starts and ends right - only the body check saves us.
    expect(isExpoPushToken("ExponentPushToken[]")).toBe(false);
  });

  it("rejects non-strings and near-misses", () => {
    expect(isExpoPushToken(null)).toBe(false);
    expect(isExpoPushToken(12345)).toBe(false);
    expect(isExpoPushToken("")).toBe(false);
    expect(isExpoPushToken("ExponentPushToken[abc")).toBe(false);
    expect(isExpoPushToken("some-random-string")).toBe(false);
  });
});

describe("chunkTokens", () => {
  it("never exceeds Expo's 100-message request limit", () => {
    const tokens = Array.from({ length: 250 }, (_, i) => `ExponentPushToken[t${i}]`);
    const chunks = chunkTokens(tokens);
    expect(chunks).toHaveLength(3);
    expect(chunks.every((c) => c.length <= PUSH_CHUNK_LIMIT)).toBe(true);
    expect(chunks.flat()).toEqual(tokens);
  });

  it("returns nothing for no tokens", () => {
    expect(chunkTokens([])).toEqual([]);
  });

  it("rejects a nonsense limit rather than looping forever", () => {
    expect(() => chunkTokens([TOKEN_A], 0)).toThrow(RangeError);
  });
});

describe("truncate", () => {
  it("leaves short text alone", () => {
    expect(truncate("Title changed", 100)).toBe("Title changed");
  });

  it("collapses whitespace", () => {
    expect(truncate("a   b\n\nc", 100)).toBe("a b c");
  });

  it("never returns more than max characters", () => {
    const long = "x".repeat(500);
    expect(truncate(long, 20)).toHaveLength(20);
  });

  it("prefers a word boundary when one is near the end", () => {
    const out = truncate("the quick brown fox jumps over", 20);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(20);
    // Cut at a space, so no half-word before the ellipsis.
    expect(out).toBe("the quick brown…");
  });
});

describe("severity routing", () => {
  it("rings through only for HIGH and CRITICAL", () => {
    expect(pushPriority("CRITICAL")).toBe("high");
    expect(pushPriority("HIGH")).toBe("high");
    expect(pushPriority("MEDIUM")).toBe("default");
    expect(pushPriority("LOW")).toBe("default");
    expect(pushPriority("INFO")).toBe("default");
    expect(pushPriority(null)).toBe("default");
  });

  it("routes urgent alerts to the critical Android channel", () => {
    expect(pushChannelId("CRITICAL")).toBe(PUSH_CHANNEL_CRITICAL);
    expect(pushChannelId("HIGH")).toBe(PUSH_CHANNEL_CRITICAL);
    expect(pushChannelId("MEDIUM")).toBe(PUSH_CHANNEL_DEFAULT);
    expect(pushChannelId(null)).toBe(PUSH_CHANNEL_DEFAULT);
  });
});

describe("buildPushMessages", () => {
  it("builds one message per token so tickets map back exactly", () => {
    const messages = buildPushMessages([TOKEN_A, TOKEN_B], {
      title: "Critical changes on example.com",
      body: "Checkout button missing",
      severity: "CRITICAL",
      path: "/website/w1",
      websiteId: "w1",
    });
    expect(messages).toHaveLength(2);
    expect(messages.map((m) => m.to)).toEqual([TOKEN_A, TOKEN_B]);
    expect(messages[0].priority).toBe("high");
    expect(messages[0].channelId).toBe(PUSH_CHANNEL_CRITICAL);
    expect(messages[0].data).toEqual({
      path: "/website/w1",
      websiteId: "w1",
      severity: "CRITICAL",
    });
  });

  it("drops invalid tokens instead of sending garbage to Expo", () => {
    const messages = buildPushMessages([TOKEN_A, "not-a-token", ""], {
      title: "t",
      body: "b",
    });
    expect(messages.map((m) => m.to)).toEqual([TOKEN_A]);
  });

  it("caps title and body so a long change list cannot become MessageTooBig", () => {
    const messages = buildPushMessages([TOKEN_A], {
      title: "T".repeat(400),
      body: "B".repeat(4000),
    });
    expect(messages[0].title.length).toBeLessThanOrEqual(PUSH_TITLE_MAX);
    expect(messages[0].body.length).toBeLessThanOrEqual(PUSH_BODY_MAX);
    // Comfortably inside Expo's 4 KiB per-message budget.
    expect(JSON.stringify(messages[0]).length).toBeLessThan(4096);
  });

  it("omits the data payload entirely when there is nothing to carry", () => {
    const messages = buildPushMessages([TOKEN_A], { title: "t", body: "b" });
    expect(messages[0].data).toBeUndefined();
  });
});

describe("classifyTickets", () => {
  it("pairs tickets with tokens and reads receipt ids", () => {
    const tickets: ExpoPushTicket[] = [
      { status: "ok", id: "receipt-1" },
      { status: "ok", id: "receipt-2" },
    ];
    const outcomes = classifyTickets([TOKEN_A, TOKEN_B], tickets);
    expect(outcomes.map((o) => o.ok)).toEqual([true, true]);
    expect(outcomes.map((o) => o.receiptId)).toEqual(["receipt-1", "receipt-2"]);
    expect(tokensToPrune(outcomes)).toEqual([]);
  });

  it("prunes ONLY DeviceNotRegistered", () => {
    const tickets: ExpoPushTicket[] = [
      {
        status: "error",
        message: "\"ExponentPushToken[...]\" is not a registered push notification recipient",
        details: { error: "DeviceNotRegistered" },
      },
      {
        status: "error",
        message: "Too many requests",
        details: { error: "MessageRateExceeded" },
      },
    ];
    const outcomes = classifyTickets([TOKEN_A, TOKEN_B], tickets);
    expect(tokensToPrune(outcomes)).toEqual([TOKEN_A]);
    // A rate-limited send must stay subscribed - it will work next time.
    expect(outcomes[1].prune).toBe(false);
    expect(outcomes[1].error).toBe("MessageRateExceeded");
  });

  it("prunes nothing when Expo returns a mismatched ticket count", () => {
    // Positional pairing is the only thing linking a ticket to a token. If the
    // counts disagree we cannot know whose failure is whose, and unsubscribing
    // the wrong device would silence real alerts forever.
    const outcomes = classifyTickets([TOKEN_A, TOKEN_B], [{ status: "ok", id: "r1" }]);
    expect(outcomes).toHaveLength(2);
    expect(outcomes.every((o) => o.prune === false)).toBe(true);
    expect(outcomes.every((o) => o.ok === false)).toBe(true);
    expect(outcomes[0].message).toContain("1 tickets for 2 messages");
  });

  it("survives an error ticket with no details", () => {
    const outcomes = classifyTickets([TOKEN_A], [
      { status: "error", message: "something broke" },
    ]);
    expect(outcomes[0].ok).toBe(false);
    expect(outcomes[0].error).toBe("UnknownError");
    expect(outcomes[0].prune).toBe(false);
  });

  it("handles no tokens", () => {
    expect(classifyTickets([], [])).toEqual([]);
  });
});

describe("scanAlert", () => {
  it("leads with the severity word and names the host", () => {
    const alert = scanAlert({
      host: "example.com",
      changeCount: 3,
      highestSeverity: "CRITICAL",
      websiteId: "w1",
      topChange: "Checkout button missing on /pricing",
    });
    expect(alert.title).toBe("Critical changes on example.com");
    expect(alert.body).toBe("Checkout button missing on /pricing · and 2 more");
    expect(alert.severity).toBe("CRITICAL");
    expect(alert.path).toBe("/website/w1");
  });

  it("uses the singular for one change and omits the 'more' tail", () => {
    const alert = scanAlert({
      host: "example.com",
      changeCount: 1,
      highestSeverity: "HIGH",
      websiteId: "w1",
      topChange: "Title changed",
    });
    expect(alert.title).toBe("Important change on example.com");
    expect(alert.body).toBe("Title changed");
  });

  it("still says something useful with no top change", () => {
    const alert = scanAlert({
      host: "example.com",
      changeCount: 2,
      highestSeverity: "MEDIUM",
      websiteId: "w1",
    });
    expect(alert.title).toBe("New changes on example.com");
    expect(alert.body).toBe("2 changes detected.");
  });
});

describe("failureAlert", () => {
  it("distinguishes a failed scan from an incomplete one", () => {
    const failed = failureAlert({
      host: "example.com",
      websiteId: "w1",
      reason: "The site may be down.",
      kind: "failed",
    });
    expect(failed.title).toBe("Scan failed on example.com");
    expect(failed.severity).toBe("CRITICAL");

    const incomplete = failureAlert({
      host: "example.com",
      websiteId: "w1",
      reason: "Changes were not checked.",
      kind: "incomplete",
    });
    expect(incomplete.title).toBe("Scan incomplete on example.com");
    expect(incomplete.severity).toBe("HIGH");
  });
});
