/**
 * One person's tracking: where they use MyKavo, when, what they did, which
 * pages they open and on which devices - the web Tracking detail page, on the
 * phone. Operator-only.
 */

import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { channelColor, channelTone, Chip, KeyRow } from "@/components/admin";
import { Screen } from "@/components/screen";
import {
  Card,
  CardTitle,
  Divider,
  ErrorState,
  LoadingState,
  Mono,
  Small,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatDateTime, hostOf, timeAgo } from "@/lib/format";
import { useLive } from "@/lib/live";
import { useTheme } from "@/lib/theme-context";
import { TRACKING_CHANNEL_LABEL, TRACKING_CHANNELS } from "@/lib/types";

const TIMELINE_LIMIT = 40;

export default function TrackingUserScreen() {
  const { palette } = useTheme();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data, error, loading, refreshing, refresh, reload } = useLive(
    () => api.trackingUser(String(userId)),
    [userId],
    { interval: 0 },
  );

  const header = <Stack.Screen options={{ title: data?.row.name ?? "Person" }} />;

  if (loading && !data) {
    return (
      <Screen title="Person">
        {header}
        <LoadingState />
      </Screen>
    );
  }
  if (error && !data) {
    return (
      <Screen title="Person">
        {header}
        <ErrorState message={error.message} onRetry={reload} />
      </Screen>
    );
  }
  if (!data) return null;

  const { row } = data;

  return (
    <Screen title={row.name} subtitle={row.email} refreshing={refreshing} onRefresh={refresh}>
      {header}

      <Card style={{ marginBottom: 14 }}>
        <KeyRow label="Plan" value={row.plan} note={row.paid ? "Paying" : null} />
        <Divider />
        <KeyRow label="Signed up" value={timeAgo(row.signedUpAt)} note={formatDateTime(row.signedUpAt)} />
        <Divider />
        <KeyRow
          label="Last active"
          value={row.lastActiveAt ? timeAgo(row.lastActiveAt) : "never"}
          note={row.lastChannel ? TRACKING_CHANNEL_LABEL[row.lastChannel] : null}
        />
        <Divider />
        <KeyRow label="Active days, last 30" value={row.activeDays30} />
        <Divider />
        <KeyRow label="Websites" value={row.websites} note={row.monitoring ? "Monitoring is on" : "Not monitoring yet"} />
        {row.internal ? (
          <>
            <Divider />
            <KeyRow label="Account" value={<Chip label="Team" fg={palette.ink} bg={palette.surface} />} />
          </>
        ) : null}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <CardTitle style={{ marginBottom: 4 }}>Channels</CardTitle>
        {TRACKING_CHANNELS.map((ch, i) => {
          const state = row.channels[ch];
          const tone = channelTone(palette, state.status);
          return (
            <View key={ch}>
              {i > 0 ? <Divider /> : null}
              <KeyRow
                label={TRACKING_CHANNEL_LABEL[ch]}
                note={[state.detail, state.lastAt ? `last ${timeAgo(state.lastAt)}` : null].filter(Boolean).join(" · ") || null}
                value={<Chip label={state.label} fg={tone.fg} bg={tone.bg} />}
              />
            </View>
          );
        })}
      </Card>

      {data.heat.length > 0 ? (
        <Card style={{ marginBottom: 14 }}>
          <CardTitle style={{ marginBottom: 2 }}>Last 30 days</CardTitle>
          <Small color={palette.inkSecondary} style={{ marginBottom: 10 }}>
            One square per day, filled when they used that channel.
          </Small>
          {data.heat.map((line) => (
            <View key={line.channel} style={{ marginBottom: 8, gap: 4 }}>
              <Small color={palette.inkSecondary} style={{ fontSize: 11.5 }}>
                {TRACKING_CHANNEL_LABEL[line.channel]}
              </Small>
              <View style={{ flexDirection: "row", gap: 2 }}>
                {line.days.map((d) => (
                  <View
                    key={d.day}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      maxWidth: 12,
                      borderRadius: 2,
                      backgroundColor: d.pings > 0 ? channelColor(palette, line.channel) : palette.surface,
                    }}
                  />
                ))}
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={{ marginBottom: 14 }}>
        <CardTitle style={{ marginBottom: 4 }}>Timeline</CardTitle>
        {data.timeline.length === 0 ? (
          <Small color={palette.inkSecondary}>Nothing recorded yet.</Small>
        ) : (
          data.timeline.slice(0, TIMELINE_LIMIT).map((item, i) => (
            <View key={`${item.at}-${i}`}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: "row", gap: 10, paddingVertical: 9 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    marginTop: 6,
                    backgroundColor: channelColor(palette, item.channel),
                  }}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Small color={palette.ink}>{item.title}</Small>
                  {item.detail ? (
                    <Small color={palette.inkSecondary} numberOfLines={3}>
                      {item.detail}
                    </Small>
                  ) : null}
                  <Small color={palette.inkFaint} style={{ fontSize: 11.5 }}>
                    {formatDateTime(item.at)}
                  </Small>
                </View>
              </View>
            </View>
          ))
        )}
      </Card>

      {data.pages.length > 0 ? (
        <Card style={{ marginBottom: 14 }}>
          <CardTitle style={{ marginBottom: 4 }}>Pages they use</CardTitle>
          {data.pages.map((p, i) => (
            <View key={p.route}>
              {i > 0 ? <Divider /> : null}
              <KeyRow label={p.label} note={`${p.route} · ${timeAgo(p.lastAt)}`} value={p.views} />
            </View>
          ))}
        </Card>
      ) : null}

      {data.devices.length > 0 ? (
        <Card style={{ marginBottom: 14 }}>
          <CardTitle style={{ marginBottom: 4 }}>Devices</CardTitle>
          {data.devices.map((d, i) => (
            <View key={`${d.label}-${i}`}>
              {i > 0 ? <Divider /> : null}
              <KeyRow
                label={d.label}
                note={`${d.kind === "push" ? "Push notifications" : "Signed in"} · since ${timeAgo(d.firstAt)}`}
                value={timeAgo(d.lastAt)}
              />
            </View>
          ))}
        </Card>
      ) : null}

      {data.workspaces.length > 0 ? (
        <Card style={{ marginBottom: 14 }}>
          <CardTitle style={{ marginBottom: 4 }}>Workspaces</CardTitle>
          {data.workspaces.map((w, i) => (
            <View key={w.id}>
              {i > 0 ? <Divider /> : null}
              <KeyRow label={w.name} note={w.role.toLowerCase()} value={w.plan} />
            </View>
          ))}
        </Card>
      ) : null}

      {data.websites.length > 0 ? (
        <Card>
          <CardTitle style={{ marginBottom: 4 }}>Websites</CardTitle>
          {data.websites.map((w, i) => (
            <View key={w.id}>
              {i > 0 ? <Divider /> : null}
              <View style={{ paddingVertical: 10 }}>
                <Small color={palette.ink}>{w.name}</Small>
                <Mono numberOfLines={1}>{hostOf(w.url)}</Mono>
                <Small color={palette.inkFaint} style={{ fontSize: 11.5 }}>
                  Added {timeAgo(w.createdAt)} · {w.lastScanAt ? `scanned ${timeAgo(w.lastScanAt)}` : "not scanned yet"}
                </Small>
              </View>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
