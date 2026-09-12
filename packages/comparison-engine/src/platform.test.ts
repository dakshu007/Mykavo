import { describe, expect, it } from "vitest";
import { comparePlatform } from "./platform";
import type { PlatformFingerprint, PlatformComponent } from "@mykavo/shared";

function fp(
  components: Array<Partial<PlatformComponent> & { slug: string; version: string }>,
  overrides: Partial<PlatformFingerprint> = {},
): PlatformFingerprint {
  return {
    platform: "wordpress",
    components: components.map((c) => ({
      kind: c.kind ?? "plugin",
      slug: c.slug,
      name: c.name ?? c.slug,
      version: c.version,
    })),
    assetsSeen: components.length,
    assetsVersioned: components.length,
    present: components
      .filter((c) => (c.kind ?? "plugin") !== "core")
      .map((c) => `${c.kind ?? "plugin"}:${c.slug}`)
      .sort(),
    ...overrides,
  };
}

describe("comparePlatform", () => {
  it("reports a version bump as one grouped update", () => {
    const signals = comparePlatform(
      fp([{ slug: "elementor", name: "Elementor", version: "3.18.0" }]),
      fp([{ slug: "elementor", name: "Elementor", version: "3.19.1" }]),
    );
    expect(signals).toEqual([
      {
        kind: "platform_updates",
        components: [
          { name: "Elementor", kind: "plugin", previous: "3.18.0", current: "3.19.1" },
        ],
      },
    ]);
  });

  it("groups several updates into a single event rather than one each", () => {
    const signals = comparePlatform(
      fp([
        { slug: "elementor", version: "3.18.0" },
        { slug: "wordpress-seo", version: "21.4" },
        { slug: "woocommerce", version: "8.4.0" },
      ]),
      fp([
        { slug: "elementor", version: "3.19.1" },
        { slug: "wordpress-seo", version: "21.5" },
        { slug: "woocommerce", version: "8.5.1" },
      ]),
    );
    expect(signals).toHaveLength(1);
    expect(signals[0].kind).toBe("platform_updates");
  });

  it("says nothing when nothing changed", () => {
    const same = fp([{ slug: "elementor", version: "3.19.1" }]);
    expect(comparePlatform(same, same)).toEqual([]);
  });

  // The false positive that would fire on every scan forever.
  it("does not call 1.2 -> 1.2.0 an update", () => {
    expect(
      comparePlatform(fp([{ slug: "x", version: "1.2" }]), fp([{ slug: "x", version: "1.2.0" }])),
    ).toEqual([]);
  });

  it("reports a deactivated plugin", () => {
    const signals = comparePlatform(
      fp([
        { slug: "elementor", version: "3.19.1" },
        { slug: "contact-form-7", name: "Contact Form 7", version: "5.9" },
      ]),
      fp([{ slug: "elementor", version: "3.19.1" }]),
    );
    expect(signals).toEqual([
      {
        kind: "platform_components_removed",
        components: [{ name: "Contact Form 7", kind: "plugin", version: "5.9" }],
      },
    ]);
  });

  it("reports a newly active plugin", () => {
    const signals = comparePlatform(
      fp([{ slug: "elementor", version: "3.19.1" }]),
      fp([
        { slug: "elementor", version: "3.19.1" },
        { slug: "wp-rocket", name: "WP Rocket", version: "3.15" },
      ]),
    );
    expect(signals).toEqual([
      {
        kind: "platform_components_added",
        components: [{ name: "WP Rocket", kind: "plugin", version: "3.15" }],
      },
    ]);
  });

  it("reports one theme out and another in as a switch, not two events", () => {
    const signals = comparePlatform(
      fp([{ kind: "theme", slug: "astra", name: "Astra", version: "4.6.2" }]),
      fp([{ kind: "theme", slug: "kadence", name: "Kadence", version: "1.2.3" }]),
    );
    expect(signals).toEqual([
      { kind: "platform_theme_switched", previous: "Astra 4.6.2", current: "Kadence 1.2.3" },
    ]);
  });

  it("keeps plugin churn alongside a theme switch", () => {
    const signals = comparePlatform(
      fp([
        { kind: "theme", slug: "astra", name: "Astra", version: "4.6.2" },
        { slug: "old-plugin", version: "1.0" },
      ]),
      fp([
        { kind: "theme", slug: "kadence", name: "Kadence", version: "1.2.3" },
        { slug: "new-plugin", version: "2.0" },
      ]),
    );
    const kinds = signals.map((s) => s.kind).sort();
    expect(kinds).toEqual([
      "platform_components_added",
      "platform_components_removed",
      "platform_theme_switched",
    ]);
  });

  // Everything below is the module refusing to claim more than it knows.
  it("says nothing when the baseline was never fingerprinted", () => {
    expect(comparePlatform(null, fp([{ slug: "x", version: "1.0" }]))).toEqual([]);
    expect(comparePlatform(undefined, fp([{ slug: "x", version: "1.0" }]))).toEqual([]);
  });

  it("says nothing when the page is not on a readable platform", () => {
    const none: PlatformFingerprint = {
      platform: null,
      components: [],
      assetsSeen: 0,
      assetsVersioned: 0,
      present: [],
    };
    expect(comparePlatform(none, fp([{ slug: "x", version: "1.0" }]))).toEqual([]);
    expect(comparePlatform(fp([{ slug: "x", version: "1.0" }]), none)).toEqual([]);
  });

  // Switching on WP Rocket or Autoptimize combines assets and hides every
  // version at once. That is our blindness, not twenty deactivated plugins.
  it("does not report mass removal when this scan read no versions at all", () => {
    const blind: PlatformFingerprint = {
      platform: "wordpress",
      components: [],
      assetsSeen: 4,
      assetsVersioned: 0,
      present: [],
    };
    const signals = comparePlatform(
      fp([
        { slug: "a", version: "1.0" },
        { slug: "b", version: "2.0" },
        { slug: "c", version: "3.0" },
      ]),
      blind,
    );
    expect(signals).toEqual([]);
  });
});

// Found on a real site running WP Rocket, which combines assets and hides
// versions unpredictably. Every case here is a false alarm that would have
// shipped without it.
describe("comparePlatform when a version becomes unreadable", () => {
  const readable: PlatformFingerprint = {
    platform: "wordpress",
    components: [
      { kind: "plugin", slug: "elementor-pro", name: "Elementor Pro", version: "3.21.2" },
    ],
    assetsSeen: 6,
    assetsVersioned: 6,
    present: ["plugin:elementor-pro"],
  };

  // Same plugin, still loading assets, but every version now stripped.
  const unreadable: PlatformFingerprint = {
    platform: "wordpress",
    components: [
      { kind: "plugin", slug: "wp-rocket", name: "WP Rocket", version: "3.15" },
    ],
    assetsSeen: 6,
    assetsVersioned: 1,
    present: ["plugin:elementor-pro", "plugin:wp-rocket"],
  };

  it("does not report a plugin as deactivated when its assets still load", () => {
    const signals = comparePlatform(readable, unreadable);
    expect(signals.some((s) => s.kind === "platform_components_removed")).toBe(false);
  });

  it("does not report a plugin as activated when we merely started reading it", () => {
    const signals = comparePlatform(unreadable, readable);
    expect(signals.some((s) => s.kind === "platform_components_added")).toBe(false);
  });

  it("still reports a plugin whose assets genuinely stopped loading", () => {
    const gone: PlatformFingerprint = {
      ...unreadable,
      present: ["plugin:wp-rocket"], // elementor-pro not loading at all
    };
    const signals = comparePlatform(readable, gone);
    expect(signals).toContainEqual({
      kind: "platform_components_removed",
      components: [{ name: "Elementor Pro", kind: "plugin", version: "3.21.2" }],
    });
  });
});
