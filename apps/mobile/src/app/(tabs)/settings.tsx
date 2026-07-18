/**
 * Settings - account identity, workspace switching, plan limits, appearance
 * and session controls. Scoped to what makes sense on the phone: billing and
 * member management stay on the web dashboard at mykavo.app.
 */

import Constants from "expo-constants";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import {
  Button,
  Card,
  CardTitle,
  Divider,
  ErrorState,
  LoadingState,
  Mono,
  Pill,
  Small,
} from "@/components/ui";
import { api, authedImageSource } from "@/lib/api";
import { API_BASE, authClient } from "@/lib/auth";
import { useLive } from "@/lib/live";
import { fonts, radius } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import type { WorkspaceRole } from "@/lib/types";

const roleLabels: Record<WorkspaceRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

/** 44px round avatar: user image when present, initial on primary-soft otherwise. */
function Avatar({ name, image }: { name: string; image: string | null }) {
  const { palette } = useTheme();
  if (image) {
    const source = image.startsWith("http") ? { uri: image } : authedImageSource(image);
    return (
      <Image
        source={source}
        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: palette.surface }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: palette.primarySoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 18, color: palette.primary }}>
        {name.trim().charAt(0).toUpperCase() || "?"}
      </Text>
    </View>
  );
}

function TwoFactorChip({ enabled }: { enabled: boolean }) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        borderRadius: radius.pill,
        backgroundColor: enabled ? palette.successSoft : palette.infoSoft,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodySemiBold,
          fontSize: 12,
          color: enabled ? palette.successStrong : palette.info,
        }}
      >
        {enabled ? "2FA enabled" : "2FA off"}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { palette, preference, setPreference } = useTheme();

  const { data, error, loading, refreshing, refresh, reload } = useLive(api.me, [], {
    interval: 0,
  });

  const [switching, setSwitching] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSwitchWorkspace(id: string) {
    if (switching) return;
    setSwitching(id);
    try {
      await api.switchWorkspace(id);
    } catch (err) {
      Alert.alert(err instanceof Error ? err.message : "Something went wrong");
      setSwitching(null);
      return;
    }
    await reload();
    setSwitching(null);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      router.replace("/login");
    } catch (err) {
      Alert.alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSigningOut(false);
    }
  }

  if (loading && !data) {
    return (
      <Screen title="Settings">
        <LoadingState />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen title="Settings" refreshing={refreshing} onRefresh={() => void refresh()}>
        <ErrorState
          message={error?.message ?? "Could not load your account."}
          onRetry={() => void reload()}
        />
      </Screen>
    );
  }

  const { user, workspaces, plan } = data;
  const limitRows = [
    `Up to ${plan.limits.websites} website${plan.limits.websites === 1 ? "" : "s"}`,
    `${plan.limits.pagesPerSite} pages per site`,
    plan.limits.scanFrequency === "DAILY" ? "Daily scans" : "Weekly scans",
    `${plan.limits.seats} seat${plan.limits.seats === 1 ? "" : "s"}`,
  ];

  return (
    <Screen title="Settings" refreshing={refreshing} onRefresh={() => void refresh()}>
      <Card>
        <CardTitle style={{ marginBottom: 14 }}>Account</CardTitle>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar name={user.name} image={user.image} />
          <View style={{ flex: 1, gap: 2 }}>
            <CardTitle numberOfLines={1}>{user.name}</CardTitle>
            <Small numberOfLines={1}>{user.email}</Small>
          </View>
          <TwoFactorChip enabled={user.twoFactorEnabled} />
        </View>
      </Card>

      <Card>
        <CardTitle style={{ marginBottom: 4 }}>Workspace</CardTitle>
        {workspaces.map((w, i) => (
          <View key={w.id}>
            {i > 0 ? <Divider /> : null}
            <Pressable
              disabled={w.isActive || switching !== null}
              onPress={() => void handleSwitchWorkspace(w.id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <CardTitle numberOfLines={1}>{w.name}</CardTitle>
                <Small>{roleLabels[w.role]}</Small>
              </View>
              {w.isActive ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: palette.primary,
                    }}
                  />
                  <Small color={palette.primary}>Active</Small>
                </View>
              ) : switching === w.id ? (
                <ActivityIndicator size="small" color={palette.primary} />
              ) : (
                <Small color={palette.inkFaint}>Switch</Small>
              )}
            </Pressable>
          </View>
        ))}
      </Card>

      <Card>
        <CardTitle style={{ marginBottom: 12 }}>{plan.name}</CardTitle>
        <View style={{ gap: 8 }}>
          {limitRows.map((row) => (
            <View key={row} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Check size={16} color={palette.success} />
              <Small color={palette.ink}>{row}</Small>
            </View>
          ))}
        </View>
        <Button
          title="Manage billing on mykavo.app"
          variant="secondary"
          onPress={() => void Linking.openURL("https://mykavo.app/dashboard/billing")}
          style={{ marginTop: 16 }}
        />
      </Card>

      <Card>
        <CardTitle style={{ marginBottom: 12 }}>Appearance</CardTitle>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pill
            label="System"
            active={preference === "system"}
            onPress={() => setPreference("system")}
          />
          <Pill label="Light" active={preference === "light"} onPress={() => setPreference("light")} />
          <Pill label="Dark" active={preference === "dark"} onPress={() => setPreference("dark")} />
        </View>
      </Card>

      <Card>
        <CardTitle style={{ marginBottom: 4 }}>About</CardTitle>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingVertical: 12,
          }}
        >
          <Small>Backend</Small>
          <Mono numberOfLines={1} style={{ flexShrink: 1 }}>
            {API_BASE}
          </Mono>
        </View>
        <Divider />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingVertical: 12,
          }}
        >
          <Small>Version</Small>
          <Mono>{Constants.expoConfig?.version ?? "unknown"}</Mono>
        </View>
      </Card>

      <Button
        title="Sign out"
        variant="danger"
        loading={signingOut}
        onPress={() => void handleSignOut()}
      />
    </Screen>
  );
}
