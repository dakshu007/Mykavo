import { describe, expect, it } from "vitest";
import {
  appUpdateRecipients,
  eligibleForUpdateEmail,
  highestVersion,
  isOlderVersion,
  parseWpOrgPluginInfo,
  pluginUpdateRecipients,
  type PluginInstall,
} from "./product-updates";

describe("versions", () => {
  it("compares, treating unknown as older", () => {
    expect(isOlderVersion("1.0.0", "1.2.0")).toBe(true);
    expect(isOlderVersion("1.2.0", "1.2.0")).toBe(false);
    expect(isOlderVersion("1.10.0", "1.2.0")).toBe(false);
    expect(isOlderVersion(null, "1.2.0")).toBe(true);
    expect(highestVersion(["1.0.0", "1.10.0", "1.2.0", "junk"])).toBe("1.10.0");
  });
});

describe("parseWpOrgPluginInfo", () => {
  it("reads the version and its changelog entry", () => {
    const info = parseWpOrgPluginInfo({
      version: "1.2.0",
      sections: {
        changelog:
          "<h4>1.2.0</h4>\n<ul>\n<li>Redesigned MyKavo screen &amp; status panel.</li>\n<li><strong>New:</strong> jump to changes by severity.</li>\n</ul>\n<h4>1.1.0</h4>\n<ul>\n<li>AI crawlers.</li>\n</ul>",
      },
    });
    expect(info).toEqual({ version: "1.2.0", notes: ["Redesigned MyKavo screen & status panel.", "New: jump to changes by severity."] });
  });

  it("is null when the plugin is not listed", () => {
    expect(parseWpOrgPluginInfo({ error: "Plugin not found." })).toBeNull();
    expect(parseWpOrgPluginInfo(null)).toBeNull();
  });
});

describe("recipients", () => {
  const install = (userId: string, siteUrl: string, pluginVersion: string | null): PluginInstall => ({
    userId,
    email: `${userId}@example.com`,
    name: userId,
    workspaceId: "w-" + userId,
    siteUrl,
    siteName: null,
    pluginVersion,
  });

  it("groups a person's outdated sites and skips up-to-date ones", () => {
    const r = pluginUpdateRecipients(
      [install("bas", "https://modyn.com/", "1.0.0"), install("bas", "https://shop.modyn.com", "1.1.0"), install("ana", "https://ana.dev", "1.2.0")],
      "1.2.0",
    );
    expect(r).toHaveLength(1);
    expect(r[0].sites).toEqual([
      { label: "modyn.com", currentVersion: "1.0.0", pluginsUrl: "https://modyn.com/wp-admin/plugins.php" },
      { label: "shop.modyn.com", currentVersion: "1.1.0", pluginsUrl: "https://shop.modyn.com/wp-admin/plugins.php" },
    ]);
  });

  it("app users on an older or unknown version", () => {
    const users = [
      { userId: "a", email: "a@x.com", name: "A", workspaceId: "w", version: "1.0.1" },
      { userId: "b", email: "b@x.com", name: "B", workspaceId: "w", version: "1.0.2" },
      { userId: "c", email: "c@x.com", name: "C", workspaceId: "w", version: null },
    ];
    expect(appUpdateRecipients(users, "1.0.2").map((u) => u.userId)).toEqual(["a", "c"]);
  });

  it("never emails twice, too often, or after an unsubscribe", () => {
    const people = ["a", "b", "c", "d"].map((id) => ({ userId: id, email: `${id.toUpperCase()}@x.com` }));
    const ok = eligibleForUpdateEmail(people, {
      notified: new Set(["a"]),
      recentlyNotified: new Set(["b"]),
      optedOut: new Set(["c@x.com"]),
    });
    expect(ok.map((p) => p.userId)).toEqual(["d"]);
  });
});
