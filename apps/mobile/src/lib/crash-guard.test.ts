import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

const store = new Map<string, string>();
let throwOnRead = false;

vi.mock("expo-secure-store", () => ({
  getItem: (key: string) => {
    if (throwOnRead) throw new Error("keystore failure");
    return store.get(key) ?? null;
  },
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  getItemAsync: async (key: string) => store.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    store.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    store.delete(key);
  },
}));

const {
  clearLastCrash,
  installCrashGuard,
  markBootPending,
  markBootStable,
  readLastCrash,
  recordCrash,
  wasLastBootInterrupted,
} = await import("./crash-guard");

beforeEach(() => {
  store.clear();
  throwOnRead = false;
});

describe("crash records", () => {
  it("round-trips an Error with truncation", () => {
    recordCrash(new Error("boom"));
    const crash = readLastCrash();
    expect(crash?.message).toBe("boom");
    expect(crash?.at).toBeTruthy();
  });

  it("handles string errors and clears cleanly", () => {
    recordCrash("string failure");
    expect(readLastCrash()?.message).toBe("string failure");
    clearLastCrash();
    expect(readLastCrash()).toBeNull();
  });

  it("caps oversized stacks under secure-store limits", () => {
    const err = new Error("big");
    err.stack = "x".repeat(10_000);
    recordCrash(err);
    const raw = store.get("mykavo-last-crash") ?? "";
    expect(raw.length).toBeLessThanOrEqual(1600);
    expect(readLastCrash()?.message).toBe("big");
  });

  it("returns null on corrupt stored JSON instead of throwing", () => {
    store.set("mykavo-last-crash", "{not json");
    expect(readLastCrash()).toBeNull();
  });

  it("never throws even when the native store throws", () => {
    throwOnRead = true;
    expect(() => readLastCrash()).not.toThrow();
    expect(readLastCrash()).toBeNull();
  });
});

describe("boot sentinel", () => {
  it("detects an interrupted boot", () => {
    expect(wasLastBootInterrupted()).toBe(false);
    markBootPending();
    expect(wasLastBootInterrupted()).toBe(true);
    markBootStable();
    expect(wasLastBootInterrupted()).toBe(false);
  });
});

describe("installCrashGuard", () => {
  it("records fatal errors and chains the previous handler", () => {
    const calls: unknown[] = [];
    (globalThis as { ErrorUtils?: unknown }).ErrorUtils = {
      getGlobalHandler: () => (error: unknown, isFatal?: boolean) => {
        calls.push([error, isFatal]);
      },
      setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => {
        (globalThis as { __handler?: typeof handler }).__handler = handler;
      },
    };
    installCrashGuard();
    const handler = (globalThis as { __handler?: (e: unknown, f?: boolean) => void }).__handler;
    expect(handler).toBeTruthy();
    handler?.(new Error("fatal boom"), true);
    expect(readLastCrash()?.message).toBe("fatal boom");
    expect(calls.length).toBe(1);
    // Non-fatal errors are passed through without recording.
    clearLastCrash();
    handler?.(new Error("warning"), false);
    expect(readLastCrash()).toBeNull();
    expect(calls.length).toBe(2);
    delete (globalThis as { ErrorUtils?: unknown }).ErrorUtils;
    delete (globalThis as { __handler?: unknown }).__handler;
  });
});
