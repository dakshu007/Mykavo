/**
 * Floating island tab bar - the mobile cousin of the website's island pill
 * nav. A fixed-ink rounded pill floating above the content with the active
 * tab in a gold circle (brand rule: always ink icons on gold). It slides away
 * when you scroll down and returns the moment you scroll up or near the top.
 *
 * TabBarProvider owns the hide/show animation; Screen feeds it scroll
 * offsets through useTabBar().
 */

import {
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
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
}

export function FloatingTabBar({ state, navigation }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const bar = useTabBar();

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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: gold.ink,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderWidth: theme === "dark" ? 1 : 0,
          borderColor: "rgba(255,255,255,0.10)",
          shadowColor: "#000000",
          shadowOpacity: 0.3,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        }}
      >
        {state.routes.map((route, index) => {
          const Icon = TAB_ICONS[route.name] ?? LayoutDashboard;
          const active = state.index === index;
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!active && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? gold.gold : "transparent",
                opacity: pressed && !active ? 0.7 : 1,
              })}
            >
              <Icon size={21} color={active ? gold.ink : gold.dimOnDark} strokeWidth={2} />
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
