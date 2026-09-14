/**
 * Whether the OS asks for reduced motion (spec §53).
 *
 * The web button uses `motion-reduce:active:scale-100` for this; React Native
 * has no media queries, so the preference is read from AccessibilityInfo and
 * kept live - a user can change it while the app is open.
 */

import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => {
        // Preference unavailable - assume motion is fine.
      });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
