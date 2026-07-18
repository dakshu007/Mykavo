import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { GeistMono_400Regular, GeistMono_500Medium } from "@expo-google-fonts/geist-mono";
import { Poppins_500Medium, Poppins_600SemiBold } from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { LogoMark } from "@/components/logo";
import { wipeSecureStorage } from "@/lib/secure-storage";
import { fonts, gold } from "@/lib/theme";
import { ThemeProvider, useTheme } from "@/lib/theme-context";

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden (fast reload) - never fatal.
});

/**
 * Root recovery screen - expo-router renders this instead of crashing the
 * whole app when anything below throws during render. "Reset app data"
 * clears persisted state so a corrupt cache can never cause a permanent
 * crash-on-open loop.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: gold.canvas,
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        gap: 16,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: gold.ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LogoMark size={32} />
      </View>
      <Text
        style={{
          fontFamily: fonts.heading,
          fontSize: 22,
          color: gold.ink,
          textAlign: "center",
        }}
      >
        Something went wrong
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          lineHeight: 19,
          color: gold.dim,
          textAlign: "center",
        }}
        numberOfLines={4}
      >
        {error.message || "An unexpected error occurred."}
      </Text>
      <Pressable
        onPress={() => void retry()}
        style={{
          height: 46,
          paddingHorizontal: 28,
          borderRadius: 999,
          backgroundColor: gold.gold,
          borderWidth: 1,
          borderColor: gold.ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 14, color: gold.ink }}>
          Try again
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void wipeSecureStorage().then(() => retry());
        }}
        style={{ padding: 8 }}
      >
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: gold.dim }}>
          Reset app data and retry
        </Text>
      </Pressable>
    </View>
  );
}

function Root() {
  const { palette, theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.canvas },
        }}
      />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
