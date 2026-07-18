/**
 * Screen scaffold: safe-area padded scroll surface on the fx canvas, with the
 * dashboard's header pattern (Poppins title + 13px secondary subtitle) and
 * built-in pull-to-refresh wiring for useLive.
 *
 * Inside the tab group it also feeds scroll offsets to the floating tab bar
 * (hide on scroll down, return on scroll up) and reserves clearance so
 * content is never trapped behind the pill.
 */

import { type ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_CLEARANCE, useTabBar } from "@/components/tab-bar";
import { Heading, Small } from "@/components/ui";
import { useTheme } from "@/lib/theme-context";

export function Screen({
  title,
  subtitle,
  headerRight,
  refreshing,
  onRefresh,
  children,
  contentStyle,
  scrollable = true,
}: {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBar = useTabBar();

  const bottomPadding = tabBar ? TAB_BAR_CLEARANCE + insets.bottom : 32;

  const handleScroll = tabBar
    ? (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        tabBar.onScroll(event.nativeEvent.contentOffset.y);
      }
    : undefined;

  const header =
    title !== undefined ? (
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Heading>{title}</Heading>
          {subtitle ? <Small>{subtitle}</Small> : null}
        </View>
        {headerRight}
      </View>
    ) : null;

  if (!scrollable) {
    return (
      <View
        style={[
          {
            flex: 1,
            backgroundColor: palette.canvas,
            paddingTop: insets.top + 12,
            paddingHorizontal: 16,
            paddingBottom: bottomPadding,
          },
          contentStyle,
        ]}
      >
        {header}
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.canvas }}
      contentContainerStyle={[
        {
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: bottomPadding,
          gap: 16,
        },
        contentStyle,
      ]}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={palette.inkSecondary}
          />
        ) : undefined
      }
    >
      {header}
      {children}
    </ScrollView>
  );
}
