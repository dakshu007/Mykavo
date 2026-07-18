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
import { useEffect, useState } from "react";
import { AppState, Pressable, ScrollView, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { LogoMark } from "@/components/logo";
import {
  clearLastCrash,
  installCrashGuard,
  markBootPending,
  markBootStable,
  readLastCrash,
  wasLastBootInterrupted,
  type CrashRecord,
} from "@/lib/crash-guard";
import { wipeSecureStorage } from "@/lib/secure-storage";
import { fonts, gold } from "@/lib/theme";
import { ThemeProvider, useTheme } from "@/lib/theme-context";

// Record any fatal JS error before the OS kills the process, so the next
// launch can show it instead of crash-looping silently.
installCrashGuard();

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden (fast reload) - never fatal.
});

function GoldButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
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
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 14, color: gold.ink }}>{label}</Text>
    </Pressable>
  );
}

function RecoveryShell({
  title,
  message,
  detail,
  onContinue,
  onReset,
}: {
  title: string;
  message: string;
  detail?: string;
  onContinue: () => void;
  onReset: () => void;
}) {
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
        style={{ fontFamily: fonts.heading, fontSize: 22, color: gold.ink, textAlign: "center" }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          lineHeight: 19,
          color: gold.dim,
          textAlign: "center",
        }}
      >
        {message}
      </Text>
      {detail ? (
        <ScrollView
          style={{
            maxHeight: 180,
            alignSelf: "stretch",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#15151526",
            backgroundColor: gold.paper,
          }}
          contentContainerStyle={{ padding: 12 }}
        >
          <Text style={{ fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, color: gold.ink }}>
            {detail}
          </Text>
        </ScrollView>
      ) : null}
      <GoldButton label="Continue" onPress={onContinue} />
      <Pressable onPress={onReset} style={{ padding: 8 }}>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: gold.dim }}>
          Reset app data and continue
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Root recovery screen - expo-router renders this instead of crashing the
 * whole app when anything below throws during render.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <RecoveryShell
      title="Something went wrong"
      message="The app hit an unexpected error. Screenshot the details below and report them so it can be fixed."
      detail={`${error.message}\n\n${error.stack ?? ""}`.trim()}
      onContinue={() => void retry()}
      onReset={() => {
        void wipeSecureStorage().then(() => retry());
      }}
    />
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

type SafeModeState =
  | { kind: "checking" }
  | { kind: "safe-mode"; crash: CrashRecord | null; interrupted: boolean }
  | { kind: "normal" };

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

  const [safeMode, setSafeMode] = useState<SafeModeState>({ kind: "checking" });

  // Boot-health check: if the previous launch crashed (recorded error) or
  // died before stabilizing (sentinel still pending), show safe mode with
  // the details instead of walking straight back into the same crash.
  useEffect(() => {
    const crash = readLastCrash();
    const interrupted = wasLastBootInterrupted();
    if (crash || interrupted) {
      setSafeMode({ kind: "safe-mode", crash, interrupted });
      return;
    }
    setSafeMode({ kind: "normal" });
    markBootPending();
    // Consider the boot stable after it survives a few seconds in the
    // foreground, or when the user backgrounds the app normally.
    const timer = setTimeout(markBootStable, 6000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") markBootStable();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
      markBootStable();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && safeMode.kind !== "checking") void SplashScreen.hideAsync();
  }, [fontsLoaded, safeMode.kind]);

  if (!fontsLoaded || safeMode.kind === "checking") return null;

  if (safeMode.kind === "safe-mode") {
    const proceed = () => {
      clearLastCrash();
      markBootStable();
      setSafeMode({ kind: "normal" });
      markBootPending();
      setTimeout(markBootStable, 6000);
    };
    return (
      <RecoveryShell
        title={safeMode.crash ? "The app crashed last time" : "The app closed unexpectedly"}
        message={
          safeMode.crash
            ? "Screenshot the details below and report them so this gets fixed for good, then continue."
            : "The last launch did not finish cleanly. Continue to try again, or reset if this keeps happening."
        }
        detail={
          safeMode.crash
            ? `${safeMode.crash.at}\n${safeMode.crash.message}\n\n${safeMode.crash.stack}`.trim()
            : undefined
        }
        onContinue={proceed}
        onReset={() => {
          void wipeSecureStorage().then(proceed);
        }}
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
