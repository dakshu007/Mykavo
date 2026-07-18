/**
 * Authenticated tab shell - the mobile counterpart of the web dashboard
 * sidebar. Same Lucide icons, fx card surface, ink active state.
 * Guards the whole group: no session -> /login.
 */

import { Redirect, Tabs } from "expo-router";
import { Globe, GitCompareArrows, History, LayoutDashboard, Settings } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";

import { useSession } from "@/lib/auth";
import { useTheme } from "@/lib/theme-context";
import { fonts } from "@/lib/theme";

export default function TabsLayout() {
  const { palette } = useTheme();
  const { data: session, isPending } = useSession();

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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.ink,
        tabBarInactiveTintColor: palette.inkFaint,
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopColor: palette.line,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
        },
        sceneStyle: { backgroundColor: palette.canvas },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Overview",
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="websites"
        options={{
          title: "Websites",
          tabBarIcon: ({ color, size }) => <Globe color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="changes"
        options={{
          title: "Changes",
          tabBarIcon: ({ color, size }) => <GitCompareArrows color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="scans"
        options={{
          title: "Scans",
          tabBarIcon: ({ color, size }) => <History color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
