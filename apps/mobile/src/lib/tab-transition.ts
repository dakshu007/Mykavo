/**
 * How tab scenes move when you switch tabs.
 *
 * Two rules, both learned the hard way.
 *
 * NO OPACITY. The built-in `animation: "fade"` and `animation: "shift"`
 * presets animate opacity on the scene view - the same view that carries the
 * scene's background colour. So mid-transition neither screen is opaque and
 * the outgoing page's text shows straight through the incoming one: two pages
 * of headings and figures superimposed, which reads as smearing rather than a
 * transition. Painting an opaque background cannot fix it, because the
 * background fades with everything else.
 *
 * A FULL SCREEN WIDTH, not a nudge. Scenes are stacked absolutely, so a
 * translated incoming scene exposes whatever is beneath it - the outgoing
 * scene. At a 32dp shift that exposure is a narrow band of half-cut letters
 * and card corners down one edge, which looks like a rendering fault. At a
 * full width it is the outgoing page itself, correctly positioned and moving
 * off: the same thing every paged interface does, and the thing our own
 * left/right swipe between tabs implies is happening. Same mechanism either
 * way; only the distance decides whether it reads as motion or as breakage.
 *
 * Kept out of the layout so both rules can be asserted in a test: they are
 * invisible in code review and obvious only on a device.
 */

/**
 * Transition length in ms.
 *
 * A page-width push wants longer than a nudge, and shorter than a stack
 * push - you change tabs far more often than you open a detail screen. The
 * floating tab bar's indicator shares this so the gold circle and the page
 * arrive together; two different durations is what made a switch feel out of
 * step even once it stopped ghosting.
 */
export const TAB_TRANSITION_MS = 260;

/**
 * Progress is -1 for scenes left of the active tab, 0 for the active one, and
 * +1 for scenes to its right, so translating by progress moves the pair in
 * the direction of travel: the page you left exits the way you came from.
 *
 * `width` is the window width - the distance that takes a scene exactly off
 * screen. Passed in rather than read here so this stays a pure function.
 */
export function tabSceneStyle<T>(
  progress: {
    interpolate(config: { inputRange: number[]; outputRange: number[] }): T;
  },
  width: number,
) {
  return {
    transform: [
      {
        translateX: progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-width, 0, width],
        }),
      },
    ],
  };
}
