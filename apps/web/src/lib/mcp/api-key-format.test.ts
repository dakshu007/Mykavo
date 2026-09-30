import { describe, expect, it } from "vitest";
import { API_KEY_PREFIX, bearerKey, generateApiKey, hashApiKey, looksLikeApiKey } from "./api-key-format";

describe("API keys", () => {
  it("generates unique, prefixed keys and stores only a hash", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.key.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(a.key).not.toBe(b.key);
    expect(a.hash).toBe(hashApiKey(a.key));
    expect(a.hash).not.toContain(a.key);
    expect(a.displayPrefix).toBe(a.key.slice(0, 12));
    expect(looksLikeApiKey(a.key)).toBe(true);
  });

  it("reads only well-formed bearer keys", () => {
    const { key } = generateApiKey();
    expect(bearerKey(`Bearer ${key}`)).toBe(key);
    expect(bearerKey(`bearer ${key}`)).toBe(key);
    expect(bearerKey("Bearer mkv_wp_something")).toBeNull();
    expect(bearerKey(null)).toBeNull();
    expect(bearerKey(`Bearer ${API_KEY_PREFIX}short`)).toBeNull();
  });
});
