/**
 * Authenticated tab shell: floating island tab bar (auto-hides on scroll),
 * swipe left/right anywhere on a tab screen to move between tabs.
 * Guards the whole group: no session -> /login.
 */

import { Redirect, Tabs, usePathname, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Directions, Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { FloatingTabBar, TabBarProvider } from "@/components/tab-bar";
import { useSession } from "@/lib/auth";
import { useTheme } from "@/lib/theme-context";

/** Tab order for swipe navigation - must match the Tabs.Screen order. */
const TAB_ROUTES = ["/", "/websites", "/changes", "/scans", "/settings"] as const;

export default function TabsLayout() {
  const { palette } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  const tabIndex = TAB_ROUTES.indexOf(pathname as (typeof TAB_ROUTES)[number]);

  const swipeTo = (direction: 1 | -1) => {
    if (tabIndex === -1) return;
    const next = TAB_ROUTES[tabIndex + direction];
    if (next) router.navigate(next);
  };

  // Swipe left -> next tab, swipe right -> previous tab.
  const flingLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .onStart(() => {
      runOnJS(swipeTo)(1);
    });
  const flingRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onStart(() => {
      runOnJS(swipeTo)(-1);
    });
  const swipeGesture = Gesture.Race(flingLeft, flingRight);

  if (isPending) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: palette.canvas,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <TabBarProvider>
      <GestureDetector gesture={swipeGesture}>
        <View style={{ flex: 1 }}>
          <Tabs
            tabBar={(props) => <FloatingTabBar {...props} />}
            screenOptions={{
              headerShown: false,
              animation: "shift",
              sceneStyle: { backgroundColor: palette.canvas },
            }}
          >
            <Tabs.Screen name="index" options={{ title: "Overview" }} />
            <Tabs.Screen name="websites" options={{ title: "Websites" }} />
            <Tabs.Screen name="changes" options={{ title: "Changes" }} />
            <Tabs.Screen name="scans" options={{ title: "Scans" }} />
            <Tabs.Screen name="settings" options={{ title: "Settings" }} />
          </Tabs>
        </View>
      </GestureDetector>
    </TabBarProvider>
  );
}
