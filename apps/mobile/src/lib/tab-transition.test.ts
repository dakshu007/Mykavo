import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { TAB_TRANSITION_MS, tabSceneStyle } from "./tab-transition";

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

const WIDTH = 412;

describe("tabSceneStyle", () => {
  /**
   * THE test. Ghosting on tab switch was opacity on the scene view: two
   * opaque screens both drawn semi-transparent, so each showed through the
   * other. Any future style added here must not reintroduce it.
   */
  it("never animates opacity", () => {
    const style = tabSceneStyle(fakeProgress(), WIDTH);
    expect(Object.keys(style)).toEqual(["transform"]);
    expect(JSON.stringify(style)).not.toContain("opacity");
  });

  it("pushes by exactly one screen width, in the direction of travel", () => {
    const progress = fakeProgress();
    const style = tabSceneStyle(progress, WIDTH);
    // Found by what the style actually uses, not by call order - a test that
    // reads the first interpolation passes for the wrong reason the moment a
    // second one is added.
    expect(progress.configFor(style.transform[0].translateX)).toEqual({
      inputRange: [-1, 0, 1],
      outputRange: [-WIDTH, 0, WIDTH],
    });
  });

  /**
   * Anything less than a full width leaves a sliver of the outgoing scene
   * along one edge - a band of half-cut letters and card corners that reads
   * as a rendering fault rather than as movement. That was the 32dp version.
   */
  it("moves a leaving page entirely off screen", () => {
    const progress = fakeProgress();
    const style = tabSceneStyle(progress, WIDTH);
    const { outputRange } = progress.configFor(style.transform[0].translateX);
    for (const offset of outputRange) {
      expect(Math.abs(offset) === 0 || Math.abs(offset) >= WIDTH).toBe(true);
    }
  });

  it("holds the active page still", () => {
    // progress 0 is the focused tab: it must map to no offset at all, or the
    // page you have landed on sits permanently off-centre.
    const progress = fakeProgress();
    const style = tabSceneStyle(progress, WIDTH);
    const { inputRange, outputRange } = progress.configFor(style.transform[0].translateX);
    expect(outputRange[inputRange.indexOf(0)]).toBe(0);
  });

  it("stays in the range that reads as a page turn rather than a wait", () => {
    expect(TAB_TRANSITION_MS).toBeGreaterThanOrEqual(180);
    expect(TAB_TRANSITION_MS).toBeLessThanOrEqual(320);
  });
});

describe("the tabs layout", () => {
  const source = readFileSync(path.resolve(__dirname, "../app/(tabs)/_layout.tsx"), "utf8");

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

  it("supplies its own scene interpolator, sized to the window", () => {
    expect(code).toContain("sceneStyleInterpolator");
    expect(code).toContain("tabSceneStyle(current.progress, width)");
    expect(code).toContain("useWindowDimensions");
  });
});

describe("the floating tab bar", () => {
  const source = readFileSync(path.resolve(__dirname, "../components/tab-bar.tsx"), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  /**
   * The gold circle and the page have to arrive together. They had drifted
   * onto a spring and a timing curve respectively, so the circle was still
   * travelling after the page had settled - which is what made a switch feel
   * out of step even after the ghosting was fixed. Sharing the constants is
   * the only thing keeping them in step, so it is worth asserting.
   */
  it("moves its indicator on the page's own duration and curve", () => {
    expect(code).toContain("TAB_TRANSITION_MS");
    expect(code).toContain("TAB_EASING");
  });

  it("keeps a spring only for the drag, where a finger sets the pace", () => {
    expect(code).toMatch(/dragging \? "spring" : "timing"/);
  });

  /**
   * The icon under the disc is ink; everything else is dim. Deciding that
   * from the selected INDEX rather than from where the disc actually is made
   * the destination icon ink-on-black - invisible - for the whole
   * transition. The colour has to be derived from the animated position.
   */
  it("derives icon colour from the disc's position, not the selected index", () => {
    expect(code).toContain("indicator.interpolate");
    expect(code).not.toMatch(/color=\{lit \?/);
  });

  /**
   * The press-after-drag suppression must be armed ONLY by a gesture that
   * actually activated. onFinalize runs at the end of every touch, activated
   * or not, so arming it there unconditionally meant every tap armed the
   * suppression a few milliseconds before its own press arrived - and
   * tapping a tab did nothing at all. This shipped.
   */
  it("suppresses a press only after a gesture that really activated", () => {
    expect(code).toContain("activatedRef");
    expect(code).toMatch(/if \(wasDrag\)\s*dragEndedAtRef\.current = Date\.now\(\)/);
    // The unconditional form is the bug, verbatim.
    expect(code).not.toMatch(/\n\s*dragEndedAtRef\.current = Date\.now\(\);/);
  });

  /**
   * Tab screens are lazy, so without preloading the first switch to each one
   * mounts it during the transition and the animation waits on that render.
   */
  it("mounts every tab ahead of the first switch to it", () => {
    // The CALL, not the word: `preloadedRef` contains "preload" too, so a
    // substring check here would pass with the preloading deleted.
    expect(code).toMatch(/\.preload\?\.\(\s*name\s*\)/);
  });
});
