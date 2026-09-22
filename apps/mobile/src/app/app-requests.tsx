/**
 * App requests - the Android app approval queue, from the phone.
 *
 * This is the screen that makes the feature usable. Requests arrive at all
 * hours and the decision is one tap; needing to be at a desk to make it is
 * how a waiting list turns into a backlog.
 *
 * Approving here hits the SAME endpoint the web dashboard does, so a decision
 * made on a phone is identical to one made at a desk - including sending the
 * approval email. There is no mobile-specific approval path that could drift.
 *
 * Operator-only, and reached from Settings rather than the tab bar, for the
 * same reason as Users: the floating bar stops fitting a 360dp phone past six
 * tabs, and this is a screen you open when something arrives.
 */

import { Stack } from "expo-router";
import { Check, CircleUser, MailCheck, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";

import { Screen } from "@/components/screen";
import {
  Card,
  CardTitle,
  Divider,
  EmptyState,
  ErrorState,
  LoadingState,
  Mono,
  Small,
} from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useLive } from "@/lib/live";
import { useTheme } from "@/lib/theme-context";
import type { AppRequestRow } from "@/lib/types";

function StatusPill({ status }: { status: AppRequestRow["status"] }) {
  const { palette } = useTheme();
  const tone =
    status === "APPROVED"
      ? { bg: palette.successSoft, fg: palette.successStrong, label: "Approved" }
      : status === "DECLINED"
        ? { bg: palette.surface, fg: palette.inkFaint, label: "Declined" }
        : { bg: palette.infoSoft, fg: palette.inkSecondary, label: "Pending" };
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: tone.bg,
      }}
    >
      <Small color={tone.fg} style={{ fontWeight: "600", fontSize: 11 }}>
        {tone.label}
      </Small>
    </View>
  );
}

function RequestRow({
  row,
  busy,
  onDecide,
}: {
  row: AppRequestRow;
  busy: boolean;
  onDecide: (action: "approve" | "decline") => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={{ paddingVertical: 12, gap: 9 }}>
      <View style={{ gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <CardTitle style={{ flexShrink: 1 }} numberOfLines={1}>
            {row.name}
          </CardTitle>
          <StatusPill status={row.status} />
          {/* Whether they are already a customer changes how much scrutiny
              the request deserves. */}
          {row.hasAccount ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <CircleUser size={12} color={palette.inkFaint} />
              <Small color={palette.inkFaint} style={{ fontSize: 11 }}>
                account
              </Small>
            </View>
          ) : null}
        </View>
        <Mono numberOfLines={1}>{row.email}</Mono>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Small color={palette.inkSecondary}>{timeAgo(row.requestedAt)}</Small>
          {row.downloadCount > 0 ? (
            <Small color={palette.inkFaint} style={{ fontSize: 11.5 }}>
              {row.downloadCount} download{row.downloadCount === 1 ? "" : "s"}
            </Small>
          ) : null}
          {/* Approving is two steps - the decision, then the mail - and they
              are deliberately not one transaction, so "approved but the email
              failed" is a real state the operator has to be able to see. */}
          {row.status === "APPROVED" && !row.emailSent ? (
            <Small color={palette.criticalStrong} style={{ fontWeight: "600", fontSize: 11.5 }}>
              email failed - tap Re-send
            </Small>
          ) : null}
          {row.status === "APPROVED" && row.emailSent ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <MailCheck size={12} color={palette.successStrong} />
              <Small color={palette.successStrong} style={{ fontSize: 11 }}>
                emailed
              </Small>
            </View>
          ) : null}
        </View>
      </View>

      {busy ? (
        <View style={{ paddingVertical: 9, alignItems: "center" }}>
          <ActivityIndicator size="small" color={palette.inkSecondary} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={() => onDecide("approve")}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
              paddingVertical: 9,
              borderRadius: 12,
              backgroundColor:
                row.status === "APPROVED" ? palette.surface : palette.successSoft,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {row.status === "APPROVED" ? (
              <MailCheck size={14} color={palette.inkSecondary} />
            ) : (
              <Check size={14} color={palette.successStrong} />
            )}
            <Small
              color={row.status === "APPROVED" ? palette.inkSecondary : palette.successStrong}
              style={{ fontWeight: "600" }}
            >
              {row.status === "APPROVED" ? "Re-send" : "Approve"}
            </Small>
          </Pressable>

          {row.status !== "DECLINED" ? (
            <Pressable
              onPress={() => onDecide("decline")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 9,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: palette.surface,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <X size={14} color={palette.inkSecondary} />
              <Small color={palette.inkSecondary} style={{ fontWeight: "600" }}>
                Decline
              </Small>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

export default function AppRequestsScreen() {
  const { palette } = useTheme();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, error, loading, refreshing, refresh, reload } = useLive(api.appRequests, [], {
    interval: 0,
  });

  async function decide(row: AppRequestRow, action: "approve" | "decline") {
    // Approving sends somebody an email and hands them the app. Declining
    // takes it away. Neither is a gesture to perform by accident on a phone.
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        action === "approve" ? "Approve this request?" : "Decline this request?",
        action === "approve"
          ? `${row.email} gets an email with the download link, and the app appears in their dashboard.`
          : `${row.email} will not see the download. They are not told they were declined.`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          {
            text: action === "approve" ? "Approve" : "Decline",
            style: action === "approve" ? "default" : "destructive",
            onPress: () => resolve(true),
          },
        ],
      );
    });
    if (!confirmed) return;

    setBusyId(row.id);
    try {
      const result = await api.decideAppRequest(row.id, action);
      if (action === "approve" && result.emailSent === false) {
        Alert.alert(
          "Approved, but the email did not send",
          `${row.email} is approved and will see the download once they sign in, but the notification failed. Tap Re-send to try again.`,
        );
      }
      // Re-read: the server owns decidedAt and whether the mail went out.
      await refresh();
    } catch (err) {
      Alert.alert(
        "Could not save that decision",
        err instanceof ApiError ? err.message : "Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const header = <Stack.Screen options={{ title: "App requests" }} />;

  if (loading && !data) {
    return (
      <Screen title="App requests">
        {header}
        <LoadingState />
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen title="App requests">
        {header}
        <ErrorState message={error.message} onRetry={reload} />
      </Screen>
    );
  }

  if (!data) return null;

  const subtitle =
    data.pending > 0
      ? `${data.pending} waiting · ${data.approved} approved`
      : `${data.approved} approved · nothing waiting`;

  return (
    <Screen
      title="App requests"
      subtitle={subtitle}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {header}

      {data.error ? (
        <ErrorState message={`Could not read the requests: ${data.error}`} onRetry={reload} />
      ) : data.rows.length === 0 ? (
        <EmptyState
          title="No requests yet"
          message="People ask for the app from the Android section of mykavo.app. Their name and email arrive here."
        />
      ) : (
        <>
          <Card>
            {data.rows.map((row, index) => (
              <View key={row.id}>
                {index > 0 ? <Divider /> : null}
                <RequestRow
                  row={row}
                  busy={busyId === row.id}
                  onDecide={(action) => void decide(row, action)}
                />
              </View>
            ))}
          </Card>

          <Small color={palette.inkSecondary} style={{ marginTop: 14 }}>
            Approving emails the download link and reveals the app in that person&apos;s
            dashboard. Access is tied to the email address, so they have to sign in with
            the same one. Pull down to re-read.
          </Small>
        </>
      )}
    </Screen>
  );
}
