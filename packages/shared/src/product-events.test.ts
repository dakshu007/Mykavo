import { describe, expect, it, vi } from "vitest";
import {
  buildMixpanelPayload,
  hoursBetween,
  insertIdFor,
  minutesBetween,
  mixpanelConfig,
  sendProductEvent,
  sendProductEvents,
} from "./product-events";

const ENV = { MIXPANEL_TOKEN: "tok_123" };

describe("mixpanelConfig", () => {
  it("is off without a token", () => {
    expect(mixpanelConfig({})).toBeNull();
    expect(mixpanelConfig({ MIXPANEL_TOKEN: "  " })).toBeNull();
  });
  it("defaults to the US host and accepts the EU host", () => {
    expect(mixpanelConfig(ENV)).toEqual({ token: "tok_123", host: "https://api.mixpanel.com" });
    expect(mixpanelConfig({ ...ENV, MIXPANEL_API_HOST: "https://api-eu.mixpanel.com/" })?.host).toBe(
      "https://api-eu.mixpanel.com",
    );
  });
});

describe("insertIdFor", () => {
  it("is stable, short and Mixpanel-safe", () => {
    const a = insertIdFor("change_viewed", "change_1:user_1");
    expect(a).toBe(insertIdFor("change_viewed", "change_1:user_1"));
    expect(a).toMatch(/^[A-Za-z0-9-]{1,36}$/);
  });
  it("differs by event and by key", () => {
    expect(insertIdFor("change_viewed", "x")).not.toBe(insertIdFor("change_reviewed", "x"));
    expect(insertIdFor("change_viewed", "x")).not.toBe(insertIdFor("change_viewed", "y"));
  });
});

describe("buildMixpanelPayload", () => {
  it("adds token, distinct_id, time and $insert_id, and drops undefined props", () => {
    const time = new Date("2026-11-06T10:00:00Z");
    const p = buildMixpanelPayload(
      { event: "monitoring_activated", distinctId: "u1", dedupeKey: "w1", time, props: { a: 1, b: undefined, c: NaN } },
      "tok",
    );
    expect(p.event).toBe("monitoring_activated");
    expect(p.properties).toMatchObject({ a: 1, c: null, token: "tok", distinct_id: "u1", time: time.getTime() });
    expect("b" in p.properties).toBe(false);
    expect(p.properties.$insert_id).toBe(insertIdFor("monitoring_activated", "w1"));
  });
});

describe("sendProductEvents", () => {
  const input = { event: "trial_ended" as const, distinctId: "u1", dedupeKey: "ws1" };

  it("sends nothing when tracking is off", async () => {
    const fetcher = vi.fn();
    expect(await sendProductEvent(input, { env: {}, fetcher })).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("posts a JSON batch to /track", async () => {
    const fetcher = vi.fn(async () => new Response("1", { status: 200 }));
    expect(await sendProductEvents([input, input], { env: ENV, fetcher })).toBe(true);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.mixpanel.com/track?strict=1");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toHaveLength(2);
  });

  it("never throws: HTTP errors and network errors resolve to false", async () => {
    const onError = vi.fn();
    const bad = vi.fn(async () => new Response("no", { status: 400 }));
    expect(await sendProductEvent(input, { env: ENV, fetcher: bad, onError })).toBe(false);
    const boom = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await sendProductEvent(input, { env: ENV, fetcher: boom, onError })).toBe(false);
    expect(onError).toHaveBeenCalledTimes(2);
  });
});

describe("time helpers", () => {
  const a = new Date("2026-11-06T10:00:00Z");
  const b = new Date("2026-11-06T13:30:00Z");
  it("rounds hours to one decimal and minutes to whole numbers", () => {
    expect(hoursBetween(a, b)).toBe(3.5);
    expect(minutesBetween(a, b)).toBe(210);
  });
  it("returns null for missing dates and never goes negative", () => {
    expect(hoursBetween(null, b)).toBeNull();
    expect(minutesBetween(b, a)).toBe(0);
  });
});
