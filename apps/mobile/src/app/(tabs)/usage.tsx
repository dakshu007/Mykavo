/**
 * Usage tab - what every service MyKavo runs on is costing, as a share of its
 * cap. The phone counterpart of the web dashboard's All Usage page, reading
 * the same report from the same collector, so the two can never disagree.
 *
 * Operator-only. The tab is hidden for everyone else and /api/mobile/usage
 * answers 404 independently, so hiding it is convenience, not the boundary.
 *
 * Only the QUOTAS are meters here. The web page also lists volumes and table
 * sizes; on a phone that is a scrolling wall, and the question you open your
 * phone to ask is "is anything about to run out?" - so volumes are collapsed
 * behind a toggle and the meters carry the screen.
 */

import { ChevronDown, ChevronUp, CircleCheck, OctagonAlert, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Screen } from "@/components/screen";
import { Card, CardTitle, Divider, ErrorState, LoadingState, Small } from "@/components/ui";
import { api } from "@/lib/api";
import { useLive } from "@/lib/live";
import { useTheme } from "@/lib/theme-context";
import type { FxPalette } from "@/lib/theme";
import {
  formatPercent,
  formatUsageValue,
  meterFraction,
  usageLabel,
  usageLevel,
  type UsageLevel,
} from "@/lib/usage";
import type { UsageMeterItem, UsageStatItem } from "@/lib/types";

/**
 * Fill, track and text per level.
 *
 * Fill colours were chosen by measurement on the web side and are mirrored
 * here: the base status colours fail WCAG 1.4.11 against their own soft
 * tracks in light mode (warning 1.95:1), so the meter uses the -strong steps
 * and a dedicated amber. The TEXT uses warningStrong rather than the fill,
 * because text needs 4.5:1 where a bar needs 3:1.
 */
function levelStyle(level: UsageLevel, p: FxPalette) {
  switch (level) {
    case "critical":
      return {
        fill: p.criticalStrong,
        track: p.criticalSoft,
        text: p.criticalStrong,
        Icon: OctagonAlert,
      };
    case "warning":
      return {
        fill: p.meterWarning,
        track: p.warningSoft,
        text: p.warningStrong,
        Icon: TriangleAlert,
      };
    case "ok":
      return {
        fill: p.successStrong,
        track: p.successSoft,
        text: p.successStrong,
        Icon: CircleCheck,
      };
  }
}

/**
 * A row we could not measure.
 *
 * Renders no track at all. An empty bar reads as a meter at 0% - "nothing
 * used" - which is the opposite of "we could not find out", and on a screen
 * whose whole job is capacity that inversion is the worst possible default.
 */
function MissingRow({ meter }: { meter: UsageMeterItem }) {
  const { palette } = useTheme();
  return (
    <View style={{ paddingVertical: 12, gap: 4 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <CardTitle style={{ flex: 1 }} numberOfLines={1}>
          {meter.label}
        </CardTitle>
        <Small color={palette.inkSecondary}>
          {meter.state === "unconfigured" ? "Not configured" : "Could not read"}
        </Small>
      </View>
      <Small color={palette.inkSecondary}>
        <Small color={palette.inkFaint}>{meter.provider}. </Small>
        {meter.detail}
      </Small>
    </View>
  );
}

function MeterRow({ meter }: { meter: UsageMeterItem }) {
  const { palette } = useTheme();
  if (!Number.isFinite(meter.used)) return <MissingRow meter={meter} />;

  const ratio = meter.limit > 0 ? meter.used / meter.limit : 0;
  const level = usageLevel(ratio);
  const { fill, track, text, Icon } = levelStyle(level, palette);
  const partial = meter.state === "partial";
  const limit = Number.isFinite(meter.limit)
    ? formatUsageValue(meter.limit, meter.unit)
    : "no cap";

  return (
    <View style={{ paddingVertical: 12, gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <CardTitle style={{ flex: 1 }} numberOfLines={1}>
          {meter.label}
        </CardTitle>
        <Small color={palette.ink} style={{ fontWeight: "600" }}>
          {partial ? "≥" : ""}
          {formatUsageValue(meter.used, meter.unit)}
          <Small color={palette.inkFaint}> / {limit}</Small>
        </Small>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
        accessibilityLabel={`${meter.label}: ${formatPercent(ratio)} of ${limit} used`}
        style={{ height: 6, borderRadius: 999, backgroundColor: track, overflow: "hidden" }}
      >
        <View
          style={{
            height: "100%",
            borderRadius: 999,
            backgroundColor: fill,
            width: `${meterFraction(ratio) * 100}%`,
          }}
        />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <Icon size={13} color={text} strokeWidth={2.4} />
        <Small color={text} style={{ fontWeight: "600" }}>
          {usageLabel(level)}
        </Small>
        <Small color={palette.inkSecondary}>{formatPercent(ratio)}</Small>
      </View>

      <Small color={palette.inkSecondary}>
        {partial ? <Small color={palette.warningStrong}>Partial. </Small> : null}
        {meter.detail}
      </Small>
    </View>
  );
}

function StatRow({ stat }: { stat: UsageStatItem }) {
  const { palette } = useTheme();
  return (
    <View style={{ paddingVertical: 10, gap: 2 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Small style={{ flex: 1 }} numberOfLines={1}>
          {stat.label}
        </Small>
        <Small color={palette.ink} style={{ fontWeight: "600" }}>
          {stat.value === null ? "-" : formatUsageValue(stat.value, stat.unit)}
        </Small>
      </View>
      {stat.detail ? <Small color={palette.inkSecondary}>{stat.detail}</Small> : null}
    </View>
  );
}

/** Rows we could read first - a screen led by an error reads as broken. */
function readableFirst(a: UsageMeterItem, b: UsageMeterItem): number {
  const rank = (m: UsageMeterItem) =>
    m.state === "measured" || m.state === "partial" ? 0 : 1;
  return rank(a) - rank(b);
}

export default function UsageScreen() {
  const { palette } = useTheme();
  const [showVolume, setShowVolume] = useState(false);
  // No polling: measuring walks the storage bucket, so it happens when you
  // open the tab and when you pull to refresh, not on a timer in your pocket.
  const { data, error, loading, refreshing, refresh, reload } = useLive(api.usage, [], {
    interval: 0,
  });

  if (loading && !data) {
    return (
      <Screen title="Usage">
        <LoadingState />
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen title="Usage">
        <ErrorState message={error.message} onRetry={reload} />
      </Screen>
    );
  }

  if (!data) return null;

  const meters = [...data.meters].sort(readableFirst);

  return (
    <Screen
      title="Usage"
      subtitle="Every service MyKavo runs on, as a share of its limit"
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <Card>
        <CardTitle style={{ marginBottom: 4 }}>Quotas</CardTitle>
        {meters.map((meter, index) => (
          <View key={meter.id}>
            {index > 0 ? <Divider /> : null}
            <MeterRow meter={meter} />
          </View>
        ))}
      </Card>

      {data.stats.length > 0 ? (
        <Card style={{ marginTop: 14 }}>
          <Pressable
            onPress={() => setShowVolume((v) => !v)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ flex: 1 }}>
              <CardTitle>Volume</CardTitle>
              <Small color={palette.inkSecondary}>
                What the quotas above are made of
              </Small>
            </View>
            {showVolume ? (
              <ChevronUp size={18} color={palette.inkSecondary} />
            ) : (
              <ChevronDown size={18} color={palette.inkSecondary} />
            )}
          </Pressable>
          {showVolume
            ? data.stats.map((stat, index) => (
                <View key={stat.id}>
                  {index === 0 ? <Divider /> : <Divider />}
                  <StatRow stat={stat} />
                </View>
              ))
            : null}
        </Card>
      ) : null}

      <Card style={{ marginTop: 14 }}>
        <CardTitle style={{ marginBottom: 4 }}>No limit to watch</CardTitle>
        {data.uncapped.map((item, index) => (
          <View key={item.label}>
            {index > 0 ? <Divider /> : null}
            <View style={{ paddingVertical: 10, gap: 2 }}>
              <Small color={palette.ink}>{item.label}</Small>
              <Small color={palette.inkSecondary}>{item.detail}</Small>
            </View>
          </View>
        ))}
      </Card>

      <View style={{ marginTop: 14, gap: 4 }}>
        <Small color={palette.inkSecondary}>
          Measured {new Date(data.generatedAt).toLocaleString()}. Pull down to re-measure.
        </Small>
        {data.problems.map((problem) => (
          <Small key={problem} color={palette.criticalStrong}>
            {problem}
          </Small>
        ))}
      </View>
    </Screen>
  );
}
