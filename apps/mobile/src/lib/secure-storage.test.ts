import { beforeEach, describe, expect, it, vi } from "vitest";

// Simulate expo-secure-store, including the Android failure mode where a
// Keystore entry can no longer be decrypted and the native module THROWS.
const store = new Map<string, string>();
let throwOnRead = false;

vi.mock("expo-secure-store", () => ({
  getItem: (key: string) => {
    if (throwOnRead) throw new Error("Could not decrypt value (keystore)");
    return store.get(key) ?? null;
  },
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  getItemAsync: async (key: string) => {
    if (throwOnRead) throw new Error("Could not decrypt value (keystore)");
    return store.get(key) ?? null;
  },
  setItemAsync: async (key: string, value: string) => {
    store.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    store.delete(key);
  },
}));

const { safeSecureStorage, wipeSecureStorage, WORKSPACE_KEY } = await import("./secure-storage");

beforeEach(() => {
  store.clear();
  throwOnRead = false;
});

describe("safeSecureStorage", () => {
  it("round-trips values", () => {
    safeSecureStorage.setItem("k", "v");
    expect(safeSecureStorage.getItem("k")).toBe("v");
  });

  it("NEVER throws when the native store throws - returns null and self-heals", () => {
    safeSecureStorage.setItem("k", "corrupt");
    throwOnRead = true;
    expect(() => safeSecureStorage.getItem("k")).not.toThrow();
    expect(safeSecureStorage.getItem("k")).toBeNull();
  });

  it("async variants are equally safe", async () => {
    throwOnRead = true;
    await expect(safeSecureStorage.getItemAsync("k")).resolves.toBeNull();
    await expect(safeSecureStorage.setItemAsync("k", "v")).resolves.toBeUndefined();
    await expect(safeSecureStorage.deleteItemAsync("k")).resolves.toBeUndefined();
  });
});

describe("wipeSecureStorage", () => {
  it("removes the auth cookie jar, session cache, and workspace selection", async () => {
    store.set("mykavo_cookie", "c");
    store.set("mykavo_session_data", "s");
    store.set(WORKSPACE_KEY, "w");
    await wipeSecureStorage();
    expect(store.size).toBe(0);
  });
});
