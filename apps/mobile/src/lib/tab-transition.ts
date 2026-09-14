/**
 * How tab scenes move when you switch tabs.
 *
 * The built-in `animation: "fade"` and `animation: "shift"` presets both
 * animate OPACITY on the scene view - the same view that carries the scene's
 * background colour. So mid-transition neither screen is opaque, and the
 * outgoing page's text shows straight through the incoming one: two pages of
 * headings and figures superimposed, which reads as smearing or a stuck
 * afterimage rather than a transition. Painting an opaque background cannot
 * fix it, because the background fades with everything else.
 *
 * So this interpolator translates and does NOT touch opacity. Every scene
 * stays fully opaque, the incoming one sits above the outgoing one (the
 * navigator gives the focused scene the higher zIndex), and switching tabs
 * looks like one surface pushing the other aside. Nothing is ever composited
 * over anything, so there is nothing to ghost.
 *
 * Kept out of the layout so the no-opacity rule can be asserted in a test:
 * the regression is invisible in code review and obvious only on a device.
 */

/**
 * How far a scene slides, in dp.
 *
 * Both scenes move together, so at the halfway point a strip this wide shows
 * the outgoing screen at the leading edge. Small enough to read as motion
 * rather than as a second screen, large enough to give the eye a direction.
 */
export const TAB_SHIFT_DISTANCE = 32;

/**
 * Transition length in ms. The library default is 150; the spring this
 * replaced settled over roughly twice that, which is what made the overlap
 * long enough to notice in the first place. Slides want to be quick.
 */
export const TAB_TRANSITION_MS = 200;

/**
 * Progress is -1 for scenes left of the active tab, 0 for the active one, and
 * +1 for scenes to its right - so translating by progress moves the whole set
 * in the direction of travel.
 */
export function tabSceneStyle<T>(progress: {
  interpolate(config: { inputRange: number[]; outputRange: number[] }): T;
}) {
  return {
    transform: [
      {
        translateX: progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-TAB_SHIFT_DISTANCE, 0, TAB_SHIFT_DISTANCE],
        }),
      },
    ],
  };
}
