/**
 * Authenticated tab shell: floating island tab bar (auto-hides on scroll),
 * swipe left/right anywhere on a tab screen to move between tabs.
 * Guards the whole group: no session -> /login.
 */

import { Redirect, Tabs, usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";
import { Directions, Gesture, GestureDetector } from "react-native-gesture-handler";

import { FloatingTabBar, TabBarProvider } from "@/components/tab-bar";
import { api, onUnauthorized } from "@/lib/api";
import { useLive } from "@/lib/live";
import { TAB_EASING } from "@/lib/tab-motion";
import { TAB_TRANSITION_MS, tabSceneStyle } from "@/lib/tab-transition";
import { authClient, useSession } from "@/lib/auth";
import { wipeSecureStorage } from "@/lib/secure-storage";
import { useTheme } from "@/lib/theme-context";

/**
 * Tab order for swipe navigation - must match the rendered Tabs.Screen order,
 * INCLUDING the admin-only Usage tab, which is why this is built rather than
 * declared: swiping past a hidden tab would land on a screen with no way back.
 */
function tabRoutes(showUsage: boolean): string[] {
  return [
    "/",
    "/websites",
    "/changes",
    "/scans",
    ...(showUsage ? ["/usage"] : []),
    "/settings",
  ];
}

export default function TabsLayout() {
  const { palette } = useTheme();
  // The push distance: exactly far enough to take a scene off screen.
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  // Whether to show the operator-only Usage tab. Fetched once; while it is
  // unknown the tab stays hidden, so it appears rather than disappears - a
  // control that vanishes after a second reads as a glitch.
  const { data: me } = useLive(api.me, [], { interval: 0 });
  const showUsage = me?.admin?.usage === true;

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

  const routes = tabRoutes(showUsage);
  const tabIndex = routes.indexOf(pathname);

  const swipeTo = (direction: 1 | -1) => {
    if (tabIndex === -1) return;
    const next = routes[tabIndex + direction];
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
        <ActivityIndicator color={palette.accent} />
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
            tabBar={(props) => (
              <FloatingTabBar {...props} hiddenTabs={showUsage ? [] : ["usage"]} />
            )}
            screenOptions={{
              headerShown: false,
              // Opaque, and it must stay opaque: see tabSceneStyle.
              sceneStyle: { backgroundColor: palette.canvas },
              // Every tab is mounted ahead of time (see the tab bar), so
              // without this the five screens you are NOT looking at would
              // re-render along with the one you are - during the transition,
              // on the same thread that has to draw it.
              freezeOnBlur: true,
              // Pages push sideways, one screen width, in the direction of
              // travel. Deliberately NOT one of the named presets: both of
              // them crossfade the scene, which left the outgoing page
              // showing through the incoming one. See tabSceneStyle for why
              // the distance is a full width rather than a nudge.
              sceneStyleInterpolator: ({ current }) => ({
                sceneStyle: tabSceneStyle(current.progress, width),
              }),
              transitionSpec: {
                animation: "timing",
                config: { duration: TAB_TRANSITION_MS, easing: TAB_EASING },
              },
            }}
          >
            <Tabs.Screen name="index" options={{ title: "Overview" }} />
            <Tabs.Screen name="websites" options={{ title: "Websites" }} />
            <Tabs.Screen name="changes" options={{ title: "Changes" }} />
            <Tabs.Screen name="scans" options={{ title: "Scans" }} />
            {/* href: null removes it from the bar without unregistering the
                route - a non-admin who deep-links to /usage still gets the
                screen's own 404 from the API rather than a router crash. */}
            <Tabs.Screen
              name="usage"
              options={{ title: "Usage", href: showUsage ? undefined : null }}
            />
            <Tabs.Screen name="settings" options={{ title: "Settings" }} />
          </Tabs>
        </View>
      </GestureDetector>
    </TabBarProvider>
  );
}
