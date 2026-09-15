/**
 * Floating island tab bar - the mobile cousin of the website's island pill
 * nav. A fixed-ink rounded pill floating above the content with the active
 * tab in a gold circle (brand rule: always ink icons on gold). It slides away
 * when you scroll down and returns the moment you scroll up or near the top.
 *
 * Two gestures:
 *   - Tap a tab, as ever.
 *   - Press and HOLD, then slide across the bar: the gold circle follows your
 *     finger and the tab under it is previewed; lift to go there, or slide
 *     off the pill and lift to cancel. The same idea as holding the globe key
 *     on an iOS keyboard - one continuous gesture instead of aim-and-tap,
 *     which matters on a bar this small.
 *
 * TabBarProvider owns the hide/show animation; Screen feeds it scroll
 * offsets through useTabBar().
 */

import * as Haptics from "expo-haptics";
import {
  Gauge,
  GitCompareArrows,
  Globe,
  History,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, Platform, Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { indexAtPoint, itemGeometry, itemOffset, PILL_PADDING } from "@/lib/tab-geometry";
import { TAB_EASING } from "@/lib/tab-motion";
import { TAB_TRANSITION_MS } from "@/lib/tab-transition";
import { gold } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

/** Height reserved at the bottom of tab screens so content clears the pill. */
export const TAB_BAR_CLEARANCE = 104;

interface TabBarContextValue {
  /** Feed vertical scroll offsets here; drives hide-on-scroll. */
  onScroll: (offsetY: number) => void;
  /** 0 = visible, 1 = hidden. */
  hiddenAnim: Animated.Value;
}

const TabBarContext = createContext<TabBarContextValue | null>(null);

/** Null outside the tab group - detail screens have no floating bar. */
export function useTabBar(): TabBarContextValue | null {
  return useContext(TabBarContext);
}

export function TabBarProvider({ children }: { children: ReactNode }) {
  const [hiddenAnim] = useState(() => new Animated.Value(0));
  const lastYRef = useRef(0);
  const hiddenRef = useRef(false);

  const setHidden = useCallback(
    (hidden: boolean) => {
      if (hiddenRef.current === hidden) return;
      hiddenRef.current = hidden;
      Animated.spring(hiddenAnim, {
        toValue: hidden ? 1 : 0,
        useNativeDriver: true,
        tension: 70,
        friction: 12,
      }).start();
    },
    [hiddenAnim],
  );

  const onScroll = useCallback(
    (offsetY: number) => {
      const delta = offsetY - lastYRef.current;
      if (offsetY < 48) {
        setHidden(false);
      } else if (delta > 6) {
        setHidden(true);
      } else if (delta < -6) {
        setHidden(false);
      }
      lastYRef.current = offsetY;
    },
    [setHidden],
  );

  const value = useMemo(() => ({ onScroll, hiddenAnim }), [onScroll, hiddenAnim]);

  return <TabBarContext.Provider value={value}>{children}</TabBarContext.Provider>;
}

const TAB_ICONS: Record<string, LucideIcon> = {
  index: LayoutDashboard,
  websites: Globe,
  changes: GitCompareArrows,
  scans: History,
  usage: Gauge,
  settings: Settings,
};

/**
 * Structural subset of react-navigation's BottomTabBarProps - expo-router 57
 * vendors react-navigation internally, so the full type is not importable.
 */
interface FloatingTabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
  /**
   * Route names to leave out of the pill (the admin-only Usage tab for
   * everyone else).
   *
   * Passed explicitly rather than inferred from `href: null`, because that
   * option hides a screen from react-navigation's OWN tab bar and leaves the
   * route in `state.routes` - a custom bar that iterates those routes draws
   * it regardless. That is not theoretical: it shipped the Usage tab to every
   * non-admin in testing, each of whom would have tapped it into a 404.
   */
  hiddenTabs?: readonly string[];
}

/** A tick of feedback when the drag crosses into another tab. */
function tick() {
  if (Platform.OS === "web") return;
  void Haptics.selectionAsync().catch(() => {
    // Haptics are a nicety; a device without a motor must not break the bar.
  });
}

export function FloatingTabBar({
  state,
  navigation,
  hiddenTabs = [],
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const bar = useTabBar();

  const routes = state.routes.filter(
    (route) => route.name in TAB_ICONS && !hiddenTabs.includes(route.name),
  );
  const { size, gap } = itemGeometry(routes.length);

  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(
    0,
    routes.findIndex((route) => route.key === activeKey),
  );

  // The tab the finger is currently over mid-drag. null when not dragging or
  // when the finger has slid off the pill.
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const shownIndex = previewIndex ?? activeIndex;

  // The gold circle is one view that slides, rather than a background that
  // pops on per item - that slide IS the animation the bar is judged by.
  const [indicator] = useState(() => new Animated.Value(itemOffset(activeIndex, size, gap)));
  useEffect(() => {
    const toValue = itemOffset(shownIndex, size, gap);
    Animated[dragging ? "spring" : "timing"](indicator, {
      toValue,
      useNativeDriver: true,
      // Under a finger it should feel carried, so it springs: enough tension
      // to keep up, enough friction not to wobble.
      ...(dragging
        ? { tension: 180, friction: 18 }
        : // On a committed change it must arrive WITH the page, so it borrows
          // the page's own curve and duration. A spring here finished at its
          // own pace and left the circle trailing a screen that had already
          // settled - the switch read as out of step even once it stopped
          // ghosting.
          { duration: TAB_TRANSITION_MS, easing: TAB_EASING }),
    }).start();
  }, [indicator, shownIndex, size, gap, dragging]);

  const go = useCallback(
    (index: number) => {
      const route = routes[index];
      if (!route || index === activeIndex) return;
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) navigation.navigate(route.name);
    },
    [routes, activeIndex, navigation],
  );

  /**
   * Press-and-hold, then slide.
   *
   * `activateAfterLongPress` is what keeps taps and the screen's own
   * left/right fling working: a quick gesture never reaches this handler, so
   * only a deliberate hold turns the bar into a picker. runOnJS matches the
   * rest of this app - no worklets, so no release-build worklet crashes.
   */
  const lastPreviewRef = useRef<number | null>(null);

  // The three handlers live in useCallback rather than inline in the gesture
  // builder below: that builder runs during render, and a ref may not be read
  // there. Here they are ordinary callbacks, which is what they are.
  const handleDragStart = useCallback(
    (x: number, y: number) => {
      setDragging(true);
      const index = indexAtPoint(x, y, routes.length, size, gap);
      lastPreviewRef.current = index;
      setPreviewIndex(index);
      tick();
    },
    [routes.length, size, gap],
  );

  const handleDragMove = useCallback(
    (x: number, y: number) => {
      const index = indexAtPoint(x, y, routes.length, size, gap);
      if (index === lastPreviewRef.current) return;
      lastPreviewRef.current = index;
      setPreviewIndex(index);
      // A tick per boundary crossed, so the bar can be used without looking.
      if (index !== null) tick();
    },
    [routes.length, size, gap],
  );

  /**
   * Clearing the preview is deferred on a commit, not on a cancel.
   *
   * `activeIndex` only catches up once the navigator has committed the new
   * route. Dropping the preview in the same breath as calling go() left a
   * window where the circle's target was still the OLD tab, so it started
   * sliding back before snapping forward - a visible flinch at the end of
   * every drag. Holding the preview until the page has arrived removes it,
   * and the timer (rather than waiting for activeIndex to match) means a
   * navigation that never happens slides the circle back instead of
   * stranding it on a tab you are not on.
   */
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (settleRef.current) clearTimeout(settleRef.current);
  }, []);

  /**
   * When the last drag finished - the thing that stops a drag being undone.
   *
   * Lifting a finger ends the pan gesture AND completes the press on
   * whichever tab the finger first went down on, because Pressable's touch
   * handling and the gesture system are separate. So a drag from Overview to
   * Scans navigated to Scans and was immediately sent back to Overview by
   * the press it started from. That is why hold-and-drag never changed tabs.
   *
   * A timestamp rather than a "swallow the next press" flag: on a platform
   * where the press is cancelled for us the flag would never be consumed and
   * would eat a real tap instead.
   */
  const dragEndedAtRef = useRef(0);
  /** Long enough to cover the press that follows the same finger lifting. */
  const PRESS_AFTER_DRAG_MS = 400;

  const handleDragEnd = useCallback(() => {
    const index = lastPreviewRef.current;
    dragEndedAtRef.current = Date.now();
    setDragging(false);
    lastPreviewRef.current = null;
    // null means the finger left the pill - a deliberate cancel, so the
    // circle returns immediately.
    if (index === null) {
      setPreviewIndex(null);
      return;
    }
    go(index);
    if (settleRef.current) clearTimeout(settleRef.current);
    settleRef.current = setTimeout(() => setPreviewIndex(null), TAB_TRANSITION_MS);
  }, [go]);

  /**
   * Press-and-hold, then slide.
   *
   * `activateAfterLongPress` is what keeps taps and the screen's own
   * left/right fling working: a quick gesture never reaches this handler, so
   * only a deliberate hold turns the bar into a picker. runOnJS matches the
   * rest of this app - no worklets, so no release-build worklet crashes.
   */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(200)
        .runOnJS(true)
        .onStart((event) => handleDragStart(event.x, event.y))
        .onUpdate((event) => handleDragMove(event.x, event.y))
        .onFinalize(() => handleDragEnd()),
    [handleDragStart, handleDragMove, handleDragEnd],
  );

  const translateY = bar
    ? bar.hiddenAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 160] })
    : 0;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: insets.bottom + 14,
        alignItems: "center",
        transform: [{ translateY }],
      }}
    >
      <GestureDetector gesture={pan}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap,
            backgroundColor: gold.ink,
            borderRadius: 999,
            paddingHorizontal: PILL_PADDING,
            paddingVertical: 8,
            borderWidth: theme === "dark" ? 1 : 0,
            borderColor: "rgba(255,255,255,0.10)",
            shadowColor: "#000000",
            shadowOpacity: dragging ? 0.45 : 0.3,
            shadowRadius: dragging ? 22 : 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          {/* The sliding gold circle, behind the icons. */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 8,
              left: 0,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: gold.gold,
              transform: [{ translateX: indicator }],
            }}
          />

          {routes.map((route, index) => {
            const Icon = TAB_ICONS[route.name] ?? LayoutDashboard;
            const lit = index === shownIndex;
            const iconSize = Math.round(size * 0.44);
            const offset = itemOffset(index, size, gap);
            /**
             * An icon is ink only while the gold disc is actually under it.
             *
             * Switching the colour on `lit` flipped it the instant you
             * tapped, while the disc still had the whole transition left to
             * travel - so the tab you were heading for drew ink on the dark
             * pill and simply vanished for a quarter of a second, and the one
             * you left drew dim grey on gold. Deriving it from the disc's
             * position means the colour cannot outrun the circle: the icon is
             * dark BECAUSE there is gold behind it.
             */
            const inkOpacity = indicator.interpolate({
              inputRange: [offset - size, offset, offset + size],
              outputRange: [0, 1, 0],
              extrapolate: "clamp",
            });
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: index === activeIndex }}
                accessibilityLabel={route.name === "index" ? "Overview" : route.name}
                onPress={() => {
                  // The tail of a drag, not a tap: see dragEndedAtRef.
                  if (Date.now() - dragEndedAtRef.current < PRESS_AFTER_DRAG_MS) return;
                  go(index);
                }}
                style={({ pressed }) => ({
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed && !lit ? 0.7 : 1,
                })}
              >
                <Icon size={iconSize} color={gold.dimOnDark} strokeWidth={2} />
                {/* The ink copy, faded in over the dim one as the disc lands.
                    Two stacked icons rather than an animated colour because
                    the icon takes a plain string for `color`. */}
                <Animated.View
                  pointerEvents="none"
                  style={{ position: "absolute", opacity: inkOpacity }}
                >
                  <Icon size={iconSize} color={gold.ink} strokeWidth={2} />
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      </GestureDetector>
    </Animated.View>
  );
}
