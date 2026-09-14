import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { TAB_SHIFT_DISTANCE, TAB_TRANSITION_MS, tabSceneStyle } from "./tab-transition";

interface Range {
  inputRange: number[];
  outputRange: number[];
}

/**
 * Stand-in for Animated.Value. Every interpolation gets a unique token back,
 * so a test can ask "which interpolation ended up in this style property?"
 * rather than guessing from the order the calls happened in.
 */
function fakeProgress() {
  const configs = new Map<string, Range>();
  return {
    interpolate(config: Range) {
      const token = `interpolation#${configs.size}`;
      configs.set(token, config);
      return token;
    },
    configFor(token: string): Range {
      const config = configs.get(token);
      if (!config) throw new Error(`no interpolation produced ${token}`);
      return config;
    },
  };
}

describe("tabSceneStyle", () => {
  /**
   * THE test. Ghosting on tab switch was opacity on the scene view: two
   * opaque screens both drawn semi-transparent, so each showed through the
   * other. Any future style added here must not reintroduce it.
   */
  it("never animates opacity", () => {
    const style = tabSceneStyle(fakeProgress());
    expect(Object.keys(style)).toEqual(["transform"]);
    expect(JSON.stringify(style)).not.toContain("opacity");
  });

  it("slides symmetrically around the active tab", () => {
    const progress = fakeProgress();
    const style = tabSceneStyle(progress);
    // Found by what the style actually uses, not by call order - a test that
    // reads calls[0] passes for the wrong reason the moment a second
    // interpolation is added.
    const config = progress.configFor(style.transform[0].translateX);
    expect(config).toEqual({
      inputRange: [-1, 0, 1],
      outputRange: [-TAB_SHIFT_DISTANCE, 0, TAB_SHIFT_DISTANCE],
    });
  });

  it("holds the active scene still", () => {
    // progress 0 is the focused tab: it must map to no offset at all, or the
    // screen you have landed on sits permanently off-centre.
    const progress = fakeProgress();
    const style = tabSceneStyle(progress);
    const { inputRange, outputRange } = progress.configFor(style.transform[0].translateX);
    expect(outputRange[inputRange.indexOf(0)]).toBe(0);
  });

  it("stays quick enough that any overlap is brief", () => {
    expect(TAB_TRANSITION_MS).toBeLessThanOrEqual(250);
    expect(TAB_SHIFT_DISTANCE).toBeLessThanOrEqual(64);
  });
});

describe("the tabs layout", () => {
  const source = readFileSync(
    path.resolve(__dirname, "../app/(tabs)/_layout.tsx"),
    "utf8",
  );

  /**
   * Comments are stripped first: that file explains in prose why it does not
   * use `animation: "shift"`, and a guard that trips over its own explanation
   * teaches people to delete the comment rather than keep the rule.
   */
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  /**
   * Source guard, because the failure is only visible on a device: both
   * built-in presets crossfade the scene, which is exactly the bug.
   */
  it("does not use the crossfading built-in tab animations", () => {
    expect(code).not.toMatch(/animation:\s*["'](fade|shift)["']/);
  });

  it("supplies its own scene interpolator", () => {
    expect(code).toContain("sceneStyleInterpolator");
    expect(code).toContain("tabSceneStyle");
  });
});
