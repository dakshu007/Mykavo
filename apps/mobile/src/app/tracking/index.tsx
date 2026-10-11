/**
 * Tracking - who uses MyKavo, where, and who is stuck.
 *
 * The phone counterpart of the web dashboard's Tracking page, reading the
 * same overview with the same filters (/api/mobile/tracking), so the two can
 * never disagree. Operator-only and reached from Settings > Admin.
 */

import { Stack, useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Bar, channelColor, channelTone, Chip, KeyRow } from "@/components/admin";
import { FilterSelect, type FilterOption } from "@/components/filter-select";
import { Screen } from "@/components/screen";
import {
  Card,
  CardTitle,
  Divider,
  EmptyState,
  ErrorState,
  LoadingState,
  Mono,
  Pill,
  Small,
  StatTile,
} from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useLive } from "@/lib/live";
import { useTheme } from "@/lib/theme-context";
import {
  TRACKING_CHANNEL_LABEL,
  TRACKING_CHANNELS,
  type TrackingRow,
  type TrackingShow,
} from "@/lib/types";

function UserRow({ row, onPress }: { row: TrackingRow; onPress: () => void }) {
  const { palette } = useTheme();
  const using = TRACKING_CHANNELS.filter((ch) => row.channels[ch].status !== "none");
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 11,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Small color={palette.ink} style={{ fontWeight: "600", flexShrink: 1 }} numberOfLines={1}>
            {row.name}
          </Small>
          {row.paid ? <Chip label={row.plan} fg={palette.successStrong} bg={palette.successSoft} /> : null}
        </View>
        <Mono numberOfLines={1}>{row.email}</Mono>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
          {using.map((ch) => {
            const tone = channelTone(palette, row.channels[ch].status);
            return (
              <Chip
                key={ch}
                label={`${TRACKING_CHANNEL_LABEL[ch].split(" ")[0]} · ${row.channels[ch].label}`}
                fg={tone.fg}
                bg={tone.bg}
              />
            );
          })}
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Small color={palette.inkSecondary}>{row.lastActiveAt ? timeAgo(row.lastActiveAt) : "never"}</Small>
        <Small color={palette.inkFaint} style={{ fontSize: 11.5 }}>
          {row.websites} site{row.websites === 1 ? "" : "s"}
        </Small>
      </View>
      <ChevronRight size={16} color={palette.inkFaint} />
    </Pressable>
  );
}

export default function TrackingScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const [show, setShow] = useState<TrackingShow>("all");
  const [internal, setInternal] = useState(false);
  // No polling: read on open, on filter changes and on pull-to-refresh.
  const { data, error, loading, refreshing, refresh, reload } = useLive(
    () => api.tracking({ show, internal }),
    [show, internal],
    { interval: 0 },
  );

  const header = <Stack.Screen options={{ title: "Tracking" }} />;

  if (loading && !data) {
    return (
      <Screen title="Tracking">
        {header}
        <LoadingState />
      </Screen>
    );
  }
  if (error && !data) {
    return (
      <Screen title="Tracking">
        {header}
        <ErrorState message={error.message} onRetry={reload} />
      </Screen>
    );
  }
  if (!data) return null;

  const { kpis } = data;
  const showOptions: FilterOption<TrackingShow>[] = data.shows.map((s) => ({
    value: s.id,
    label: `${s.label} (${s.count})`,
  }));
  const funnelMax = Math.max(1, ...kpis.funnel.map((f) => f.count));

  return (
    <Screen
      title="Tracking"
      subtitle={`${kpis.users} people · ${kpis.active7d} active this week`}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {header}

      {!data.recording ? (
        <Card style={{ marginBottom: 14 }}>
          <Small color={palette.warningStrong}>
            Activity is not being recorded yet: the user_activity migration has not run on the server.
          </Small>
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        <StatTile label="Users" value={kpis.users} />
        <StatTile label="Active today" value={kpis.activeToday} />
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        <StatTile label="Active 7 days" value={kpis.active7d} />
        <StatTile label="Active 30 days" value={kpis.active30d} />
      </View>

      <Card style={{ marginBottom: 14 }}>
        <CardTitle style={{ marginBottom: 2 }}>Where people use MyKavo</CardTitle>
        <Small color={palette.inkSecondary}>Active means used in the last 7 days.</Small>
        {TRACKING_CHANNELS.map((ch) => {
          const c = kpis.byChannel[ch];
          return (
            <View key={ch}>
              <Divider style={{ marginTop: 8 }} />
              <KeyRow
                label={TRACKING_CHANNEL_LABEL[ch]}
                value={
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: channelColor(palette, ch) }} />
                    <Small color={palette.ink} style={{ fontWeight: "600" }}>
                      {c.adopted} set up · {c.active} active
                    </Small>
                    {c.stuck > 0 ? (
                      <Chip label={`${c.stuck} stuck`} fg={palette.warningStrong} bg={palette.warningSoft} />
                    ) : null}
                  </View>
                }
              />
            </View>
          );
        })}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <CardTitle style={{ marginBottom: 8 }}>How far people get</CardTitle>
        {kpis.funnel.map((step) => (
          <View key={step.label} style={{ paddingVertical: 6, gap: 5 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Small color={palette.ink}>{step.label}</Small>
              <Small color={palette.ink} style={{ fontWeight: "600" }}>
                {step.count}
              </Small>
            </View>
            <Bar value={step.count} max={funnelMax} />
          </View>
        ))}
      </Card>

      {data.extension && data.extension.installs > 0 ? (
        <Card style={{ marginBottom: 14 }}>
          <CardTitle style={{ marginBottom: 8 }}>Chrome extension</CardTitle>
          {data.extension.steps.map((step) => (
            <View key={step.label} style={{ paddingVertical: 6, gap: 5 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Small color={palette.ink}>{step.label}</Small>
                <Small color={palette.ink} style={{ fontWeight: "600" }}>
                  {step.count}
                </Small>
              </View>
              <Bar value={step.count} max={Math.max(1, data.extension?.installs ?? 1)} color={palette.chartGold} />
            </View>
          ))}
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <FilterSelect label="Show" value={show} options={showOptions} onChange={setShow} isDefault={show === "all"} />
        <Pill label={internal ? "Team included" : "Include team"} active={internal} onPress={() => setInternal((v) => !v)} />
      </View>

      {data.rows.length === 0 ? (
        <EmptyState title="Nobody here" message="No one matches this filter right now." />
      ) : (
        <Card>
          <CardTitle style={{ marginBottom: 2 }}>People</CardTitle>
          <Small color={palette.inkSecondary}>
            {data.total > data.rows.length
              ? `The ${data.rows.length} most recently active of ${data.total}`
              : `${data.total} ${data.total === 1 ? "person" : "people"}, most recently active first`}
          </Small>
          {data.rows.map((row) => (
            <View key={row.id}>
              <Divider style={{ marginTop: 8 }} />
              <UserRow row={row} onPress={() => router.push(`/tracking/${row.id}`)} />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
