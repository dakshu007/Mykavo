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

import { indexAtX, itemGeometry, itemOffset, PILL_PADDING } from "@/lib/tab-geometry";
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
    Animated.spring(indicator, {
      toValue: itemOffset(shownIndex, size, gap),
      useNativeDriver: true,
      // Tuned to feel like it is being carried, not thrown: high enough
      // tension to keep up with a finger, enough friction not to wobble.
      tension: 180,
      friction: 18,
    }).start();
  }, [indicator, shownIndex, size, gap]);

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
    (x: number) => {
      setDragging(true);
      const index = indexAtX(x, routes.length, size, gap);
      lastPreviewRef.current = index;
      setPreviewIndex(index);
      tick();
    },
    [routes.length, size, gap],
  );

  const handleDragMove = useCallback(
    (x: number) => {
      const index = indexAtX(x, routes.length, size, gap);
      if (index === lastPreviewRef.current) return;
      lastPreviewRef.current = index;
      setPreviewIndex(index);
      // A tick per boundary crossed, so the bar can be used without looking.
      if (index !== null) tick();
    },
    [routes.length, size, gap],
  );

  const handleDragEnd = useCallback(() => {
    const index = lastPreviewRef.current;
    setDragging(false);
    setPreviewIndex(null);
    lastPreviewRef.current = null;
    // null means the finger left the pill - a deliberate cancel.
    if (index !== null) go(index);
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
        .onStart((event) => handleDragStart(event.x))
        .onUpdate((event) => handleDragMove(event.x))
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
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: index === activeIndex }}
                accessibilityLabel={route.name === "index" ? "Overview" : route.name}
                onPress={() => go(index)}
                style={({ pressed }) => ({
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed && !lit ? 0.7 : 1,
                })}
              >
                <Icon
                  size={Math.round(size * 0.44)}
                  color={lit ? gold.ink : gold.dimOnDark}
                  strokeWidth={2}
                />
              </Pressable>
            );
          })}
        </View>
      </GestureDetector>
    </Animated.View>
  );
}
