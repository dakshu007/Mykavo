import { describe, expect, it } from "vitest";
import { buildTrackingRows, groupVisits, summarizeRows, topPages, type TrackingInput } from "./tracking-core";

const now = new Date("2026-10-01T12:00:00Z");
const h = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

function input(over: Partial<TrackingInput> = {}): TrackingInput {
  return {
    users: [
      { id: "u1", name: "Asha", email: "asha@example.com", createdAt: h(24 * 20) },
      { id: "u2", name: "Ben", email: "ben@example.com", createdAt: h(24 * 3) },
      { id: "me", name: "Admin", email: "admin@mykavo.app", createdAt: h(24 * 90) },
    ],
    workspaces: [
      {
        id: "w1",
        name: "Asha's",
        ownerId: "u1",
        memberIds: ["u1"],
        planId: "pro",
        subscriptionStatus: "active",
        websites: [{ id: "s1", name: "Shop", url: "https://shop.example", createdAt: h(24 * 19), lastScanAt: h(2) }],
      },
      { id: "w2", name: "Ben's", ownerId: "u2", memberIds: ["u2"], planId: "free", subscriptionStatus: null, websites: [] },
    ],
    sessions: [
      { userId: "u1", userAgent: "Mozilla/5.0 (Macintosh) Chrome/130 Safari/537.36", createdAt: h(48), updatedAt: h(3) },
      { userId: "u1", userAgent: "okhttp/4.12.0", createdAt: h(24 * 5), updatedAt: h(24 * 5) },
    ],
    pushDevices: [{ userId: "u1", platform: "android", deviceName: "Pixel 8", enabled: true, createdAt: h(24 * 5), lastSeenAt: h(5) }],
    appRequests: [
      { email: "Ben@example.com", status: "APPROVED", requestedAt: h(60), decidedAt: h(50), firstDownloadAt: null, downloadCount: 0 },
    ],
    connections: [
      {
        workspaceId: "w1",
        createdByUserId: "u1",
        platform: "wordpress",
        siteUrl: "https://shop.example",
        siteName: "Shop",
        createdAt: h(24 * 10),
        connectedAt: h(24 * 10),
        lastUsedAt: h(30),
        pluginVersion: "1.1.0",
        revokedAt: null,
      },
    ],
    apiKeys: [],
    activityDays: [
      { userId: "u1", day: new Date("2026-10-01T00:00:00Z"), channel: "web", pings: 3, lastAt: h(1) },
      { userId: "u1", day: new Date("2026-09-30T00:00:00Z"), channel: "android", pings: 1, lastAt: h(20) },
    ],
    events: [
      { userId: "u2", channel: "wordpress", type: "wordpress_connect_started", path: null, label: "ben.blog", meta: null, createdAt: h(10) },
      { userId: "u1", channel: "android", type: "app_open", path: null, label: null, meta: { version: "1.0.2" }, createdAt: h(20) },
    ],
    isInternal: (e) => e.endsWith("@mykavo.app"),
    now,
    ...over,
  };
}

describe("buildTrackingRows", () => {
  const rows = buildTrackingRows(input());
  const asha = rows.find((r) => r.id === "u1")!;
  const ben = rows.find((r) => r.id === "u2")!;

  it("sees an active Android user, with app version and device", () => {
    expect(asha.channels.android.status).toBe("active");
    expect(asha.channels.android.detail).toContain("v1.0.2");
    expect(asha.channels.android.detail).toContain("1 device");
  });

  it("sees a connected WordPress plugin with its version", () => {
    expect(asha.channels.wordpress).toMatchObject({ status: "active", label: "Connected, in use" });
    expect(asha.channels.wordpress.detail).toContain("plugin 1.1.0");
  });

  it("flags where a user got stuck", () => {
    expect(ben.channels.android).toMatchObject({ status: "pending", label: "Approved, not downloaded" });
    expect(ben.channels.wordpress).toMatchObject({ status: "started", label: "Opened Connect, didn't approve" });
    expect(ben.channels.web.status).toBe("none");
  });

  it("knows plan, websites, last activity and internal accounts", () => {
    expect(asha).toMatchObject({ paid: true, plan: "pro", websites: 1, monitoring: true, lastChannel: "web", activeDays30: 2 });
    expect(asha.spark.at(-1)).toEqual(["web"]);
    expect(asha.spark.at(-2)).toEqual(["android"]);
    expect(rows.find((r) => r.id === "me")!.internal).toBe(true);
  });

  it("counts adoption and the funnel", () => {
    const k = summarizeRows(rows.filter((r) => !r.internal), now);
    expect(k.users).toBe(2);
    expect(k.activeToday).toBe(1);
    expect(k.byChannel.android).toEqual({ adopted: 1, active: 1, stuck: 1 });
    expect(k.byChannel.wordpress).toEqual({ adopted: 1, active: 1, stuck: 1 });
    expect(k.funnel.find((f) => f.label === "Paid")!.count).toBe(1);
  });
});

describe("visits", () => {
  const ev = (mins: number, path: string | null, channel = "web", type = "page_view", label: string | null = null) => ({
    userId: "u1",
    channel,
    type,
    path,
    label,
    meta: channel === "android" ? { version: "1.0.2" } : null,
    createdAt: new Date(now.getTime() - mins * 60_000),
  });

  it("groups page views less than 30 minutes apart, newest visit first", () => {
    const visits = groupVisits([
      ev(200, "/dashboard"),
      ev(195, "/dashboard/changes"),
      ev(190, "/dashboard/changes/cm9x2k4lq0000abcdefghij12"),
      ev(10, null, "android", "app_open"),
      ev(9, null, "android", "screen_view", "Changes"),
    ]);
    expect(visits).toHaveLength(2);
    expect(visits[0]).toMatchObject({ channel: "android", title: "Opened the Android app (v1.0.2)", detail: "Changes" });
    expect(visits[1].title).toBe("Visited the dashboard - 3 pages");
    expect(visits[1].detail).toBe("Overview, Changes, Change detail · about 10 min");
  });

  it("ranks pages by views", () => {
    const pages = topPages([ev(3, "/dashboard/changes"), ev(2, "/dashboard/changes"), ev(1, "/dashboard")]);
    expect(pages.map((p) => [p.label, p.views])).toEqual([["Changes", 2], ["Overview", 1]]);
  });
});
