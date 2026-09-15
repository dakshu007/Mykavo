/**
 * The easing curve shared by everything that moves during a tab switch.
 *
 * Separate from tab-transition.ts only because this imports react-native:
 * that pulls Flow-typed source the test runner cannot parse, and the rules in
 * tab-transition.ts are the ones worth unit-testing. One constant, one file,
 * so the screen and the tab bar's indicator cannot drift onto different
 * curves - which is exactly what they had done.
 */

import { Easing } from "react-native";

/**
 * Decelerating. The movement is already initiated by a tap, a fling or a
 * finger leaving the pill, so it should arrive and settle rather than wind up
 * first.
 */
export const TAB_EASING = Easing.out(Easing.cubic);
