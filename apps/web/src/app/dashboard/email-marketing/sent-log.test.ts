import { describe, expect, it } from "vitest";
import type { BrevoCampaign, BrevoEmailEvent } from "@mykavo/email";
import { buildSentLog, humanizeTag, kindOf, parseTags } from "./sent-log";

const now = new Date("2026-11-12T16:00:00Z");

function ev(e: Partial<BrevoEmailEvent> & Pick<BrevoEmailEvent, "email" | "event" | "date">): BrevoEmailEvent {
  return { subject: "Hello", tag: "mykavo", ...e };
}

describe("parseTags", () => {
  it("reads a JSON array, a comma list or a single tag", () => {
    expect(parseTags('["mykavo","lifecycle"]')).toEqual(["mykavo", "lifecycle"]);
    expect(parseTags("mykavo, flow")).toEqual(["mykavo", "flow"]);
    expect(parseTags("plugin-review-ask")).toEqual(["plugin-review-ask"]);
    expect(parseTags(undefined)).toEqual([]);
  });
});

describe("kindOf", () => {
  it("knows the automated streams and names one-offs by their own tag", () => {
    expect(kindOf(["mykavo", "lifecycle"]).kind).toBe("lifecycle");
    expect(kindOf(["mykavo", "flow"]).kind).toBe("flow");
    expect(kindOf(["mykavo", "product-update"]).kind).toBe("product-update");
    expect(kindOf(["mykavo"]).kind).toBe("automated");
    expect(kindOf(["plugin-review-ask"])).toEqual({ kind: "direct", label: "plugin-review-ask" });
  });
  it("humanizes a tag", () => {
    expect(humanizeTag("plugin-review-ask")).toBe("Plugin review ask");
    expect(humanizeTag("wp-131-update")).toBe("WP 131 update");
  });
});

describe("buildSentLog", () => {
  it("groups a personalised one-off by its tag and tracks each email", () => {
    const events = [
      ev({ email: "bas@example.com", event: "requests", date: "2026-11-12T15:28:59+00:00", messageId: "a", subject: "Bas, a favour?", tag: "plugin-review-ask" }),
      ev({ email: "bas@example.com", event: "delivered", date: "2026-11-12T15:29:09+00:00", messageId: "a", subject: "Bas, a favour?", tag: "plugin-review-ask" }),
      ev({ email: "bas@example.com", event: "opened", date: "2026-11-12T15:40:00+00:00", messageId: "a", subject: "Bas, a favour?", tag: "plugin-review-ask" }),
      ev({ email: "trevor@example.com", event: "requests", date: "2026-11-12T15:32:09+00:00", messageId: "b", subject: "Trevor, a favour?", tag: "plugin-review-ask" }),
      ev({ email: "trevor@example.com", event: "hardBounces", date: "2026-11-12T15:32:10+00:00", messageId: "b", subject: "Trevor, a favour?", tag: "plugin-review-ask" }),
    ];
    const log = buildSentLog({ events, campaigns: [], days: 30, now });
    expect(log.groups).toHaveLength(1);
    const g = log.groups[0];
    expect(g.kind).toBe("direct");
    expect(g.title).toBe("Plugin review ask");
    expect(g.recipients).toBe(2);
    expect(g.delivered).toBe(1);
    expect(g.opened).toBe(1);
    expect(g.problems).toBe(1);
    expect(g.moreSubjects).toBe(1);
    expect(g.people.map((p) => [p.email, p.state])).toEqual([
      ["trevor@example.com", "bounced"],
      ["bas@example.com", "opened"],
    ]);
    expect(log.totals).toMatchObject({ sent: 2, delivered: 1, opened: 1, clicked: 0, problems: 1 });
  });

  it("groups automated email by subject and keeps campaigns with Brevo's totals", () => {
    const events = [
      ev({ email: "a@example.com", event: "delivered", date: "2026-11-10T10:00:00Z", messageId: "1", subject: "Day 3", tag: '["mykavo","lifecycle"]' }),
      ev({ email: "b@example.com", event: "clicks", date: "2026-11-10T11:00:00Z", messageId: "2", subject: "Day 3", tag: '["mykavo","lifecycle"]' }),
    ];
    const campaigns: BrevoCampaign[] = [
      {
        id: 7,
        name: "Black Friday",
        subject: "Pro at $10",
        status: "sent",
        createdAt: "2026-11-01T00:00:00Z",
        sentDate: "2026-11-02T14:00:00Z",
        stats: { sent: 19, delivered: 19, uniqueViews: 3, uniqueClicks: 1, unsubscriptions: 1, hardBounces: 0, softBounces: 0, complaints: 0 },
      },
      { id: 8, name: "Draft", status: "draft", createdAt: "2026-11-11T00:00:00Z", stats: null },
    ];
    const log = buildSentLog({ events, campaigns, days: 30, now });
    expect(log.groups.map((g) => g.id)).toEqual(["campaign:8", "lifecycle:Day 3", "campaign:7"]);
    const day3 = log.groups[1];
    expect(day3.recipients).toBe(2);
    expect(day3.clicked).toBe(1);
    expect(log.totals).toMatchObject({ sent: 21, delivered: 21, opened: 4, clicked: 2, unsubscribed: 1 });
  });
});
