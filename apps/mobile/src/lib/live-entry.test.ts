import { describe, expect, it } from "vitest";

import { decodeEntry, encodeEntry, entryKey, MAX_AGE_MS, MAX_BYTES } from "./live-entry";

describe("live cache entries", () => {
  it("round-trips data", () => {
    const raw = encodeEntry({ a: 1 }, 1000);
    expect(decodeEntry(raw, 2000)).toEqual({ data: { a: 1 }, at: 1000 });
  });

  it("drops entries that are too old, from the future, corrupt or foreign", () => {
    expect(decodeEntry(encodeEntry({ a: 1 }, 0), MAX_AGE_MS + 1)).toBeNull();
    expect(decodeEntry(encodeEntry({ a: 1 }, 10_000_000), 0)).toBeNull();
    expect(decodeEntry("{nope", 0)).toBeNull();
    expect(decodeEntry(JSON.stringify({ v: 2, at: 0, data: 1 }), 0)).toBeNull();
    expect(decodeEntry(null, 0)).toBeNull();
  });

  it("refuses to write very large responses", () => {
    expect(encodeEntry("x".repeat(MAX_BYTES))).toBeNull();
  });

  it("keys by workspace so another workspace's data never shows", () => {
    expect(entryKey("w1", "overview", "")).toBe("mk-live:w1:overview");
    expect(entryKey(null, "changes", "open all")).toBe("mk-live:-:changes:open all");
    expect(entryKey("w1", "overview", "")).not.toBe(entryKey("w2", "overview", ""));
  });
});
