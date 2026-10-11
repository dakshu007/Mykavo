import { describe, expect, it } from "vitest";
import { pickConnectReminders, wordpressPluginUrl, type ConnectAttempt } from "./wordpress-connect";

const NOW = new Date("2026-10-11T12:00:00Z");
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);
const attempt = (over: Partial<ConnectAttempt>): ConnectAttempt => ({
  userId: "u1",
  workspaceId: "w1",
  siteUrl: "https://www.example.com",
  adminUrl: null,
  at: ago(90),
  ...over,
});
const none = { now: NOW, connectedHosts: new Map<string, Set<string>>(), alreadySent: new Set<string>() };

describe("pickConnectReminders", () => {
  it("reminds an attempt over an hour old with no connection", () => {
    expect(pickConnectReminders([attempt({})], none)).toHaveLength(1);
  });

  it("waits while the plugin's connect link may still be in use", () => {
    expect(pickConnectReminders([attempt({ at: ago(30) })], none)).toEqual([]);
    // An older attempt does not count while a newer one is under an hour old.
    expect(pickConnectReminders([attempt({ at: ago(300) }), attempt({ at: ago(10) })], none)).toEqual([]);
  });

  it("skips connected sites, matching www and case", () => {
    const connectedHosts = new Map([["w1", new Set(["example.com"])]]);
    expect(pickConnectReminders([attempt({ siteUrl: "https://WWW.Example.com/" })], { ...none, connectedHosts })).toEqual([]);
  });

  it("sends once per workspace, for the latest stuck site", () => {
    const picked = pickConnectReminders(
      [attempt({ siteUrl: "https://a.com", at: ago(200) }), attempt({ siteUrl: "https://b.com", at: ago(100) })],
      none,
    );
    expect(picked.map((p) => p.siteUrl)).toEqual(["https://b.com"]);
    expect(pickConnectReminders([attempt({})], { ...none, alreadySent: new Set(["w1"]) })).toEqual([]);
  });

  it("ignores attempts older than the lookback", () => {
    expect(pickConnectReminders([attempt({ at: ago(4 * 24 * 60) })], none)).toEqual([]);
  });

  it("puts whoever has waited longest first", () => {
    const picked = pickConnectReminders(
      [attempt({ workspaceId: "w2", at: ago(120) }), attempt({ workspaceId: "w3", at: ago(600) })],
      none,
    );
    expect(picked.map((p) => p.workspaceId)).toEqual(["w3", "w2"]);
  });
});

describe("wordpressPluginUrl", () => {
  it("uses the admin address the plugin sent, keeping a subfolder install", () => {
    expect(
      wordpressPluginUrl("https://example.com/wp", "https://example.com/wp/wp-admin/admin.php?page=mykavo&x=1"),
    ).toBe("https://example.com/wp/wp-admin/admin.php?page=mykavo");
  });

  it("falls back to the standard location, and never trusts another host", () => {
    expect(wordpressPluginUrl("https://example.com/", null)).toBe("https://example.com/wp-admin/admin.php?page=mykavo");
    expect(wordpressPluginUrl("https://example.com", "https://evil.com/wp-admin/admin.php")).toBe(
      "https://example.com/wp-admin/admin.php?page=mykavo",
    );
    expect(wordpressPluginUrl("javascript:alert(1)", null)).toBeNull();
  });
});
