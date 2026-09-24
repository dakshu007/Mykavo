import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WP_PLUGIN_DOWNLOAD_PATH, WP_PLUGIN_REQUIRES, WP_PLUGIN_VERSION } from "./wordpress-plugin";

const repo = resolve(__dirname, "../../../..");
const pluginFile = readFileSync(resolve(repo, "plugins/wordpress/mykavo/mykavo.php"), "utf8");
const readme = readFileSync(resolve(repo, "plugins/wordpress/mykavo/readme.txt"), "utf8");

function header(source: string, name: string): string | undefined {
  return new RegExp(`^[ *]*${name}:\\s*(.+)$`, "m").exec(source)?.[1]?.trim();
}

describe("WordPress plugin facts on the website", () => {
  it("advertises the version the plugin actually has", () => {
    expect(header(pluginFile, "Version")).toBe(WP_PLUGIN_VERSION);
    expect(header(readme, "Stable tag")).toBe(WP_PLUGIN_VERSION);
  });

  it("advertises the plugin's real requirements", () => {
    expect(header(readme, "Requires at least")).toBe(WP_PLUGIN_REQUIRES.wordpress);
    expect(header(readme, "Tested up to")).toBe(WP_PLUGIN_REQUIRES.testedUpTo);
    expect(header(readme, "Requires PHP")).toBe(WP_PLUGIN_REQUIRES.php);
  });

  it("publishes the zip it links to (run plugins/wordpress/build.sh)", () => {
    const zip = resolve(repo, "apps/web/public", WP_PLUGIN_DOWNLOAD_PATH.slice(1));
    expect(existsSync(zip)).toBe(true);
    expect(statSync(zip).size).toBeGreaterThan(10_000);
    // File names are stored uncompressed in a zip.
    expect(readFileSync(zip).includes(Buffer.from("mykavo/mykavo.php"))).toBe(true);
  });
});
