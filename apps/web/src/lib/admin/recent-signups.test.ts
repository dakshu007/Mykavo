import { describe, expect, it } from "vitest";
import { isActivated, joinedAgo } from "./recent-signups";

const NOW = new Date("2026-09-21T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("isActivated", () => {
  /**
   * The distinction the whole card exists for. A signup that never added a
   * website is not a customer yet, and counting it as one turns "we got ten
   * users" into a number that means nothing.
   */
  it("is true only once the account has added a website", () => {
    expect(isActivated(0)).toBe(false);
    expect(isActivated(1)).toBe(true);
    expect(isActivated(9)).toBe(true);
  });
});

describe("joinedAgo", () => {
  it("reads naturally at every scale", () => {
    expect(joinedAgo(ago(10_000), NOW)).toBe("just now");
    expect(joinedAgo(ago(5 * MIN), NOW)).toBe("5m ago");
    expect(joinedAgo(ago(3 * HOUR), NOW)).toBe("3h ago");
    expect(joinedAgo(ago(4 * DAY), NOW)).toBe("4d ago");
    expect(joinedAgo(ago(60 * DAY), NOW)).toBe("2mo ago");
    expect(joinedAgo(ago(400 * DAY), NOW)).toBe("1y ago");
  });

  it("never reports a negative age when clocks disagree", () => {
    // Server and database clocks drift; a row stamped slightly in the future
    // must not render as "-2m ago".
    const future = new Date(NOW.getTime() + 5 * MIN).toISOString();
    expect(joinedAgo(future, NOW)).toBe("just now");
  });

  it("says so rather than guessing when the timestamp is unusable", () => {
    expect(joinedAgo("not a date", NOW)).toBe("unknown");
    expect(joinedAgo("", NOW)).toBe("unknown");
  });
});
