/**
 * Settings - account identity, workspace switching, plan limits, appearance
 * and session controls. Scoped to what makes sense on the phone: billing and
 * member management stay on the web dashboard at mykavo.app.
 */

import Constants from "expo-constants";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { BarChart3, Bell, Check, ChevronRight, PenLine, Scale } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";

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
import {
  locallyRegisteredToken,
  pushUnavailableReason,
  registerForPush,
  unregisterFromPush,
} from "@/lib/push";
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
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 18, color: palette.accent }}>
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

/**
 * Push alerts toggle.
 *
 * Shows the REASON when enabling fails (no EAS project id, permission denied
 * at OS level, offline) rather than silently flipping back. An alerting
 * product that looks switched on but delivers nothing is worse than one that
 * says plainly why it cannot.
 */
function PushAlertsCard() {
  const { palette } = useTheme();
  const [enabled, setEnabled] = useState(() => locallyRegisteredToken() !== null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);

  // Decided synchronously, so a build that cannot do push renders the toggle
  // disabled from the first frame instead of offering a switch that fails.
  const [unavailable] = useState(() => pushUnavailableReason());

  async function toggle(next: boolean) {
    if (busy || unavailable) return;
    setBusy(true);
    setProblem(null);
    setTested(false);
    if (next) {
      const result = await registerForPush({ promptIfUndetermined: true });
      if (result.ok) {
        setEnabled(true);
      } else {
        setEnabled(false);
        // "unavailable" is not the user's problem to solve, so it is never
        // raised as an error here - the disabled state below already says so.
        setProblem(result.kind === "actionable" ? result.reason : null);
      }
    } else {
      const ok = await unregisterFromPush();
      if (ok) {
        setEnabled(false);
      } else {
        setProblem("Could not turn alerts off. Check your connection and try again.");
      }
    }
    setBusy(false);
  }

  async function sendTest() {
    if (testing) return;
    setTesting(true);
    setProblem(null);
    setTested(false);
    try {
      await api.sendTestPush();
      setTested(true);
    } catch (err) {
      setProblem(
        err instanceof Error ? err.message : "Could not send a test alert. Please try again.",
      );
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Bell size={18} color={unavailable ? palette.inkFaint : palette.accent} />
        <CardTitle style={{ flex: 1 }} color={unavailable ? palette.inkSecondary : undefined}>
          Alerts on this phone
        </CardTitle>
        {busy ? (
          <ActivityIndicator size="small" color={palette.accent} />
        ) : (
          <Switch
            value={enabled && !unavailable}
            disabled={Boolean(unavailable)}
            onValueChange={(v) => void toggle(v)}
            trackColor={{ false: palette.line, true: palette.primary }}
            thumbColor={enabled && !unavailable ? palette.primaryContrast : palette.card}
          />
        )}
      </View>
      <Small>
        {unavailable
          ? unavailable
          : enabled
            ? "Critical and high-severity changes are pushed to this device as soon as a scan finds them."
            : "Turn on to get a notification the moment a scan finds something important - no need to open the app."}
      </Small>
      {enabled && !unavailable ? (
        <>
          <Button
            title={testing ? "Sending\u2026" : "Send a test alert"}
            variant="secondary"
            size="sm"
            loading={testing}
            onPress={() => void sendTest()}
            style={{ marginTop: 14, alignSelf: "flex-start" }}
          />
          {tested ? (
            <Small color={palette.successStrong} style={{ marginTop: 10 }}>
              Test alert sent. It should arrive in a few seconds - if nothing
              appears, alerts are not reaching this phone.
            </Small>
          ) : null}
        </>
      ) : null}
      {problem ? (
        <View
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: radius.field,
            backgroundColor: palette.criticalSoft,
          }}
        >
          <Small color={palette.criticalStrong}>{problem}</Small>
        </View>
      ) : null}
    </Card>
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

      <PushAlertsCard />

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
                      backgroundColor: palette.accent,
                    }}
                  />
                  <Small color={palette.accent}>Active</Small>
                </View>
              ) : switching === w.id ? (
                <ActivityIndicator size="small" color={palette.accent} />
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

      <Card style={{ marginBottom: 14 }}>
        <CardTitle style={{ marginBottom: 4 }}>Insights</CardTitle>
        <Pressable
          onPress={() => router.push("/search-console")}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <BarChart3 size={16} color={palette.inkSecondary} />
          <View style={{ flex: 1 }}>
            <Small>Search Console analytics</Small>
            <Small color={palette.inkSecondary}>
              Clicks, impressions and top queries
            </Small>
          </View>
          <ChevronRight size={16} color={palette.inkFaint} />
        </Pressable>
      </Card>

      {/* Operator-only. The server re-checks the same allowlist on every
          blog endpoint, so this is convenience rather than the boundary -
          but showing a row that 404s on tap is its own kind of broken. */}
      {data.admin?.blog ? (
        <Card style={{ marginBottom: 14 }}>
          <CardTitle style={{ marginBottom: 4 }}>Admin</CardTitle>
          <Pressable
            onPress={() => router.push("/blog")}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 12,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <PenLine size={16} color={palette.inkSecondary} />
            <View style={{ flex: 1 }}>
              <Small>Blog</Small>
              <Small color={palette.inkSecondary}>
                Publish and unpublish posts
              </Small>
            </View>
            <ChevronRight size={16} color={palette.inkFaint} />
          </Pressable>
        </Card>
      ) : null}

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
        <Divider />
        <Pressable
          onPress={() => router.push("/licenses")}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Scale size={16} color={palette.inkSecondary} />
          <Small style={{ flex: 1 }}>Open source licences</Small>
          <ChevronRight size={16} color={palette.inkFaint} />
        </Pressable>
        <Divider />
        <Pressable
          onPress={() => void Linking.openURL("https://mykavo.app/privacy")}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Small style={{ flex: 1 }}>Privacy policy</Small>
          <ChevronRight size={16} color={palette.inkFaint} />
        </Pressable>
        <Divider />
        <Pressable
          onPress={() => void Linking.openURL("https://mykavo.app/terms")}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Small style={{ flex: 1 }}>Terms of service</Small>
          <ChevronRight size={16} color={palette.inkFaint} />
        </Pressable>
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
