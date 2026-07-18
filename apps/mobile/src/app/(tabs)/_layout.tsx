/**
 * Authenticated tab shell: floating island tab bar (auto-hides on scroll),
 * swipe left/right anywhere on a tab screen to move between tabs.
 * Guards the whole group: no session -> /login.
 */

import { Redirect, Tabs, usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { Directions, Gesture, GestureDetector } from "react-native-gesture-handler";

import { FloatingTabBar, TabBarProvider } from "@/components/tab-bar";
import { onUnauthorized } from "@/lib/api";
import { authClient, useSession } from "@/lib/auth";
import { wipeSecureStorage } from "@/lib/secure-storage";
import { useTheme } from "@/lib/theme-context";

/** Tab order for swipe navigation - must match the Tabs.Screen order. */
const TAB_ROUTES = ["/", "/websites", "/changes", "/scans", "/settings"] as const;

export default function TabsLayout() {
  const { palette } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  // Session-expiry recovery: when the backend stops accepting our session
  // (expired/revoked cookie -> 401s), sign out locally and land on /login
  // instead of stranding the user on error screens.
  const handlingExpiryRef = useRef(false);
  useEffect(() => {
    return onUnauthorized(() => {
      if (handlingExpiryRef.current) return;
      handlingExpiryRef.current = true;
      void (async () => {
        try {
          await authClient.signOut();
        } catch {
          await wipeSecureStorage();
        }
        router.replace("/login");
      })();
    });
  }, [router]);

  const tabIndex = TAB_ROUTES.indexOf(pathname as (typeof TAB_ROUTES)[number]);

  const swipeTo = (direction: 1 | -1) => {
    if (tabIndex === -1) return;
    const next = TAB_ROUTES[tabIndex + direction];
    if (next) router.navigate(next);
  };

  // Swipe left -> next tab, swipe right -> previous tab. runOnJS(true) runs
  // the callbacks as plain functions on the JS thread - no worklet machinery
  // involved, so release builds cannot hit UI-thread/worklet crashes here.
  const flingLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .runOnJS(true)
    .onStart(() => {
      swipeTo(1);
    });
  const flingRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .runOnJS(true)
    .onStart(() => {
      swipeTo(-1);
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
