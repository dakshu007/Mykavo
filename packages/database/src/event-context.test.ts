import { describe, expect, it } from "vitest";
import { acquisitionBucket, trialStatusOf } from "./event-context";

describe("acquisitionBucket", () => {
  const at = (referrer: string, landing = "/") => acquisitionBucket({ referrer, landing });

  it("buckets search, AI assistants and stores", () => {
    expect(at("www.google.com")).toBe("google_organic");
    expect(at("google.co.in")).toBe("google_organic");
    expect(at("www.bing.com")).toBe("other_search");
    expect(at("chatgpt.com")).toBe("ai_assistant");
    expect(at("claude.ai")).toBe("ai_assistant");
    expect(at("wordpress.org")).toBe("wordpress");
    expect(at("chromewebstore.google.com")).toBe("chrome_web_store");
    expect(at("www.linkedin.com")).toBe("linkedin");
    expect(at("t.co")).toBe("x");
    expect(at("www.reddit.com")).toBe("social_community");
    expect(at("someblog.dev")).toBe("referral");
  });

  it("treats no referrer as direct, and tools landings separately", () => {
    expect(at("")).toBe("direct");
    expect(at("", "/tools/meta-tag-checker")).toBe("direct_tool");
    expect(at("mykavo.app")).toBe("direct");
    expect(acquisitionBucket(null)).toBe("unknown");
  });
});

describe("trialStatusOf", () => {
  const now = new Date("2026-11-06T00:00:00Z");
  it("paid wins, then a running trial, then a past one", () => {
    expect(trialStatusOf("dodo", { endsAt: new Date("2026-11-10") }, now)).toBe("paid");
    expect(trialStatusOf("shopify", null, now)).toBe("paid");
    expect(trialStatusOf("trial", { endsAt: new Date("2026-11-10") }, now)).toBe("in_trial");
    expect(trialStatusOf(null, { endsAt: new Date("2026-11-01") }, now)).toBe("trial_ended");
    expect(trialStatusOf(null, null, now)).toBe("never_trialed");
  });
});
