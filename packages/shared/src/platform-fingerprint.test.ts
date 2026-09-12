import { describe, expect, it } from "vitest";
import {
  fingerprintPlatform,
  isTrustworthyVersion,
  compareVersions,
  activeTheme,
  parseFingerprint,
} from "./platform-fingerprint";

const asset = (path: string) => `https://example.com${path}`;

describe("isTrustworthyVersion", () => {
  it("accepts release versions", () => {
    for (const v of ["1", "42", "1.2", "3.19.1", "6.4.2", "1.2.3.4"]) {
      expect(isTrustworthyVersion(v), v).toBe(true);
    }
  });

  it("accepts conventional pre-release suffixes", () => {
    for (const v of ["3.19.1-beta2", "2.0.0-rc.1", "1.4.2p3", "5.0.0+1"]) {
      expect(isTrustworthyVersion(v), v).toBe(true);
    }
  });

  // Each of these would fire a "plugin updated" event on every single scan.
  it("rejects cache-busters that merely look like versions", () => {
    for (const v of [
      "1712345678", // unix timestamp
      "20240115", // build date
      "1730000000",
      "6.4.1712345678", // version with a timestamp welded on
      "1.0-a1b2c3d4e5f6", // build hash suffix
      "d41d8cd98f00b204e9800998ecf8427e", // md5
      "", // absent
      "all",
      "latest",
      "master",
    ]) {
      expect(isTrustworthyVersion(v), v).toBe(false);
    }
  });
});

describe("compareVersions", () => {
  it("orders numerically, not lexically", () => {
    expect(compareVersions("3.10.0", "3.9.0")).toBeGreaterThan(0);
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
    expect(compareVersions("2.0.0", "10.0.0")).toBeLessThan(0);
  });
});

describe("fingerprintPlatform", () => {
  it("reads plugins, themes and core from a typical WordPress page", () => {
    const fp = fingerprintPlatform({
      assetUrls: [
        asset("/wp-content/plugins/elementor/assets/js/frontend.min.js?ver=3.19.1"),
        asset("/wp-content/plugins/wordpress-seo/js/dist/analysis.js?ver=21.5"),
        asset("/wp-content/themes/astra/assets/css/main.min.css?ver=4.6.2"),
        asset("/wp-includes/css/dist/block-library/style.min.css?ver=6.4.2"),
        "https://cdn.example.net/some/third-party.js",
      ],
    });

    expect(fp.platform).toBe("wordpress");
    expect(fp.components).toEqual([
      { kind: "core", slug: "wordpress", name: "WordPress", version: "6.4.2" },
      { kind: "theme", slug: "astra", name: "Astra", version: "4.6.2" },
      { kind: "plugin", slug: "elementor", name: "Elementor", version: "3.19.1" },
      { kind: "plugin", slug: "wordpress-seo", name: "Yoast SEO", version: "21.5" },
    ]);
  });

  it("does not report jQuery's version as the WordPress core version", () => {
    const fp = fingerprintPlatform({
      assetUrls: [asset("/wp-includes/js/jquery/jquery.min.js?ver=3.7.1")],
    });
    expect(fp.components).toEqual([]);
    // Still recognizably WordPress, and still counted for coverage.
    expect(fp.platform).toBe("wordpress");
    expect(fp.assetsSeen).toBe(1);
  });

  it("trusts the generator tag over anything inferred from asset paths", () => {
    const fp = fingerprintPlatform({
      assetUrls: [asset("/wp-includes/js/wp-emoji-release.min.js?ver=6.3.0")],
      generators: ["WordPress 6.4.2"],
    });
    expect(fp.components).toEqual([
      { kind: "core", slug: "wordpress", name: "WordPress", version: "6.4.2" },
    ]);
  });

  it("finds core from the generator tag when no asset carries a version", () => {
    const fp = fingerprintPlatform({ assetUrls: [], generators: ["WordPress 6.5.2"] });
    expect(fp.platform).toBe("wordpress");
    expect(fp.components).toEqual([
      { kind: "core", slug: "wordpress", name: "WordPress", version: "6.5.2" },
    ]);
  });

  it("reports nothing for a site that is not WordPress", () => {
    const fp = fingerprintPlatform({
      assetUrls: [
        "https://example.com/_next/static/chunks/main-abc123.js",
        "https://cdn.shopify.com/s/files/1/theme.js?v=123456",
      ],
      generators: ["Next.js"],
    });
    expect(fp.platform).toBeNull();
    expect(fp.components).toEqual([]);
  });

  it("counts assets it could not version, so coverage is visible", () => {
    const fp = fingerprintPlatform({
      assetUrls: [
        asset("/wp-content/plugins/elementor/assets/js/frontend.min.js?ver=3.19.1"),
        asset("/wp-content/plugins/wp-rocket/assets/js/lazyload.js"), // no ver
        asset("/wp-content/plugins/autoptimize/cache/js/autoptimize_9f8e.js?ver=1712345678"),
      ],
    });
    expect(fp.assetsSeen).toBe(3);
    expect(fp.assetsVersioned).toBe(1);
    expect(fp.components).toHaveLength(1);
  });

  it("picks the most-seen version when a plugin ships two", () => {
    const fp = fingerprintPlatform({
      assetUrls: [
        asset("/wp-content/plugins/elementor/a.js?ver=3.18.0"),
        asset("/wp-content/plugins/elementor/b.js?ver=3.19.1"),
        asset("/wp-content/plugins/elementor/c.js?ver=3.19.1"),
      ],
    });
    expect(fp.components[0].version).toBe("3.19.1");
  });

  it("breaks a tie on the higher version, not on asset order", () => {
    const forward = fingerprintPlatform({
      assetUrls: [
        asset("/wp-content/plugins/elementor/a.js?ver=3.18.0"),
        asset("/wp-content/plugins/elementor/b.js?ver=3.19.1"),
      ],
    });
    const reversed = fingerprintPlatform({
      assetUrls: [
        asset("/wp-content/plugins/elementor/b.js?ver=3.19.1"),
        asset("/wp-content/plugins/elementor/a.js?ver=3.18.0"),
      ],
    });
    expect(forward.components[0].version).toBe("3.19.1");
    expect(reversed.components[0].version).toBe("3.19.1");
  });

  it("handles must-use plugins", () => {
    const fp = fingerprintPlatform({
      assetUrls: [asset("/wp-content/mu-plugins/vendor-thing/x.js?ver=1.2.3")],
    });
    expect(fp.components).toEqual([
      { kind: "plugin", slug: "vendor-thing", name: "Vendor Thing", version: "1.2.3" },
    ]);
  });

  // Straight from jpfitness.co.in: Elementor Pro reported two versions,
  // 1.2.1 and 4.1.2, tied on asset count. Both are bundled libraries; the
  // plugin itself is 3.x. A tie like that flips whenever one asset drops out
  // of a scan, announcing a plugin update that never happened.
  it("ignores versions of libraries bundled inside a plugin", () => {
    const fp = fingerprintPlatform({
      assetUrls: [
        asset("/wp-content/plugins/elementor-pro/assets/lib/smartmenus/jquery.smartmenus.min.js?ver=1.2.1"),
        asset("/wp-content/plugins/elementor-pro/assets/lib/sticky/jquery.sticky.min.js?ver=4.1.2"),
        asset("/wp-content/plugins/elementor-pro/assets/js/webpack-pro.runtime.min.js?ver=3.21.2"),
      ],
    });
    expect(fp.components).toEqual([
      { kind: "plugin", slug: "elementor-pro", name: "Elementor Pro", version: "3.21.2" },
    ]);
  });

  it("records a plugin as present even when every version is vendored", () => {
    const fp = fingerprintPlatform({
      assetUrls: [
        asset("/wp-content/plugins/elementor-pro/assets/lib/smartmenus/x.js?ver=1.2.1"),
        asset("/wp-content/plugins/wp-rocket/assets/js/lazyload.js"),
      ],
    });
    // No version is readable for either - but both are demonstrably loading,
    // which is what stops a later scan calling them "deactivated".
    expect(fp.components).toEqual([]);
    expect(fp.present).toEqual(["plugin:elementor-pro", "plugin:wp-rocket"]);
    expect(fp.assetsSeen).toBe(2);
    expect(fp.assetsVersioned).toBe(0);
  });

  it("survives malformed URLs without throwing", () => {
    const fp = fingerprintPlatform({ assetUrls: ["not a url", "", "://x"] });
    expect(fp.platform).toBeNull();
  });

  it("exposes the active theme", () => {
    const fp = fingerprintPlatform({
      assetUrls: [asset("/wp-content/themes/kadence/style.css?ver=1.2.3")],
    });
    expect(activeTheme(fp)?.slug).toBe("kadence");
    expect(activeTheme(fingerprintPlatform({ assetUrls: [] }))).toBeNull();
  });
});

describe("compareVersions equality", () => {
  // A plugin reporting 1.2 then 1.2.0 has not been updated, and must not be
  // announced as though it had.
  it("treats a missing trailing segment as zero", () => {
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
    expect(compareVersions("6", "6.0.0.0")).toBe(0);
  });

  it("ranks a release above its own pre-release", () => {
    expect(compareVersions("1.0", "1.0-rc.1")).toBeGreaterThan(0);
    expect(compareVersions("1.0-beta2", "1.0")).toBeLessThan(0);
  });
});

describe("parseFingerprint", () => {
  it("round-trips a fingerprint through JSON", () => {
    const fp = fingerprintPlatform({
      assetUrls: [
        "https://e.com/wp-content/plugins/elementor/a.js?ver=3.19.1",
        "https://e.com/wp-content/themes/astra/style.css?ver=4.6.2",
      ],
    });
    expect(parseFingerprint(JSON.parse(JSON.stringify(fp)))).toEqual(fp);
  });

  // A malformed row must not be able to take a comparison down with it.
  it("returns null for anything it does not recognise", () => {
    for (const bad of [
      null,
      undefined,
      "wordpress",
      42,
      [],
      {},
      { platform: "drupal", components: [] },
      { platform: "wordpress" },
      { platform: "wordpress", components: [{ kind: "widget", slug: "x", version: "1" }] },
      { platform: "wordpress", components: [{ kind: "plugin", slug: "x" }] },
      { platform: "wordpress", components: [null] },
    ]) {
      expect(parseFingerprint(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("fills in a missing display name rather than rejecting the row", () => {
    const parsed = parseFingerprint({
      platform: "wordpress",
      components: [{ kind: "plugin", slug: "wp-rocket", version: "3.15" }],
    });
    expect(parsed?.components[0].name).toBe("WP Rocket");
  });
});

// Measured on the first real WordPress site in the database: WP Rocket had
// stripped every ?ver=, and asset URLs identified ZERO components. These are
// the signals a caching plugin cannot touch.
describe("declarations in the HTML, not the asset URLs", () => {
  it("reads Elementor and WooCommerce from their own generator tags", () => {
    const fp = fingerprintPlatform({
      assetUrls: [],
      generators: [
        "WordPress 6.4.2",
        "Elementor 3.19.1; features=e_optimized_assets_loading, additional_custom_breakpoints",
        "WooCommerce 8.5.1",
      ],
    });
    expect(fp.components).toEqual([
      { kind: "core", slug: "wordpress", name: "WordPress", version: "6.4.2" },
      { kind: "plugin", slug: "elementor", name: "Elementor", version: "3.19.1" },
      { kind: "plugin", slug: "woocommerce", name: "WooCommerce", version: "8.5.1" },
    ]);
  });

  it("reads Yoast and WP Rocket from their HTML comments", () => {
    const fp = fingerprintPlatform({
      assetUrls: [],
      comments: [
        " This site is optimized with the Yoast SEO plugin v21.5 - https://yoast.com/wordpress/plugins/seo/ ",
        " This website is like a Rocket, literally. It is optimized by WP Rocket v3.15.8 ",
      ],
    });
    expect(fp.components).toEqual([
      { kind: "plugin", slug: "wordpress-seo", name: "Yoast SEO", version: "21.5" },
      { kind: "plugin", slug: "wp-rocket", name: "WP Rocket", version: "3.15.8" },
    ]);
  });

  it("a declaration beats a version guessed from a file path", () => {
    const fp = fingerprintPlatform({
      assetUrls: [asset("/wp-content/plugins/elementor/assets/js/frontend.js?ver=3.18.0")],
      generators: ["Elementor 3.19.1; features=x"],
    });
    expect(fp.components).toEqual([
      { kind: "plugin", slug: "elementor", name: "Elementor", version: "3.19.1" },
    ]);
  });

  it("counts a declared plugin as present, so it is never reported as removed", () => {
    const fp = fingerprintPlatform({ assetUrls: [], generators: ["Elementor 3.19.1"] });
    expect(fp.present).toEqual(["plugin:elementor"]);
  });

  it("ignores a generator tag from something that is not WordPress", () => {
    const fp = fingerprintPlatform({
      assetUrls: [],
      generators: ["Next.js", "Gatsby 5.12.0", "Hugo 0.120.4"],
    });
    expect(fp.platform).toBeNull();
    expect(fp.components).toEqual([]);
  });

  it("rejects a declared version that is really a build stamp", () => {
    const fp = fingerprintPlatform({
      assetUrls: [],
      generators: ["Elementor 20240115", "WooCommerce 1712345678"],
    });
    expect(fp.components).toEqual([]);
  });
});

describe("assetsVersioned counts only assets that produced a component", () => {
  // The bug this replaces reported "10 of 25 assets gave a trusted version"
  // on a site where 0 components were identified, because the discarded
  // jQuery files were counted on the way out.
  it("does not count a jQuery asset it deliberately discards", () => {
    const fp = fingerprintPlatform({
      assetUrls: [
        asset("/wp-includes/js/jquery/jquery.min.js?ver=3.7.1"),
        asset("/wp-includes/js/jquery/jquery-migrate.min.js?ver=3.4.1"),
      ],
    });
    expect(fp.components).toEqual([]);
    expect(fp.assetsSeen).toBe(2);
    expect(fp.assetsVersioned).toBe(0);
  });
});
