/**
 * Search Console - the last 28 days of Google search performance, per
 * website, on the phone.
 *
 * Reads MyKavo's synced copy rather than Google, so it opens instantly and
 * cannot fail because an OAuth token needs refreshing.
 *
 * Form choices, all deliberate:
 *  - Four STAT TILES, not a chart. Each headline is one current number with
 *    one delta against a named period; a chart of four series in different
 *    units would be a dual-axis chart, which is the single most misleading
 *    thing you can draw.
 *  - One SPARKLINE, of clicks only. Clicks and impressions differ by an order
 *    of magnitude, so plotting both on one scale would flatten clicks into
 *    the axis and invent crossings that are artefacts of the rendering.
 *  - Position's delta is INVERTED: position 8 -> 5 is an improvement, so a
 *    fall is green. Getting this backwards would report every recovery as a
 *    loss.
 */

import { Stack } from "expo-router";
import { ArrowDownRight, ArrowUpRight, ExternalLink, Minus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Linking, Pressable, View } from "react-native";

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
  Small,
} from "@/components/ui";
import { api } from "@/lib/api";
import { deltaPresentation, percentChange } from "@/lib/delta";
import { timeAgo } from "@/lib/format";
import { useLive } from "@/lib/live";
import { useTheme } from "@/lib/theme-context";
import type { GscDimensionItem, GscWebsiteReport } from "@/lib/types";

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "-";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 1000)}k`;
  return Math.round(value).toLocaleString("en-US");
}

/**
 * A headline figure and how it moved.
 *
 * `lowerIsBetter` exists for average position, where the numbers run the
 * other way. Colour is never the only signal: the arrow points, and the
 * period is named in words underneath.
 */
function StatTile({
  label,
  value,
  change,
  lowerIsBetter = false,
  windowDays,
}: {
  label: string;
  value: string;
  change: number | null;
  lowerIsBetter?: boolean;
  windowDays: number;
}) {
  const { palette } = useTheme();
  const { direction, good, label: deltaLabel } = deltaPresentation(change, lowerIsBetter);
  const tone =
    good === null
      ? palette.inkSecondary
      : good
        ? palette.successStrong
        : palette.criticalStrong;
  const Arrow = direction === "flat" ? Minus : direction === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: "45%",
        backgroundColor: palette.surface,
        borderRadius: 16,
        padding: 13,
        gap: 3,
      }}
    >
      <Small color={palette.inkSecondary}>{label}</Small>
      {/* Proportional figures, not tabular: these are standalone headline
          numbers, not a column that has to align. */}
      <CardTitle style={{ fontSize: 22, lineHeight: 27 }}>{value}</CardTitle>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        <Arrow size={13} color={tone} strokeWidth={2.4} />
        <Small color={tone} style={{ fontWeight: "600" }}>
          {deltaLabel ?? "no earlier data"}
        </Small>
        <Small color={palette.inkFaint}>vs prev {windowDays}d</Small>
      </View>
    </View>
  );
}

/**
 * Daily clicks as thin bars.
 *
 * Bars rather than a line because the series is short, daily and often has
 * zeroes - a line through a zero day implies a value between two points that
 * was never there. Drawn with plain views: a chart library for 28 numbers
 * would be a dependency for nothing.
 */
function Sparkline({ values }: { values: number[] }) {
  const { palette } = useTheme();
  const max = Math.max(1, ...values);
  const lastIndex = values.length - 1;

  return (
    <View
      style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 44 }}
      accessibilityRole="image"
      accessibilityLabel={`Daily clicks for the last ${values.length} days, highest ${max}`}
    >
      {values.map((value, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height: Math.max(2, (value / max) * 44),
            borderRadius: 2,
            // The most recent day carries the accent; the rest recede, so the
            // eye lands on "today" without a label.
            backgroundColor: index === lastIndex ? palette.chartGold : palette.inkFaint,
            opacity: index === lastIndex ? 1 : 0.45,
          }}
        />
      ))}
    </View>
  );
}

function DimensionRow({ row, mono }: { row: GscDimensionItem; mono?: boolean }) {
  const { palette } = useTheme();
  const delta = row.clicksDelta;
  const tone =
    delta === null || delta === 0
      ? palette.inkFaint
      : delta > 0
        ? palette.successStrong
        : palette.criticalStrong;

  return (
    <View style={{ paddingVertical: 10, gap: 3 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {mono ? (
          <Mono style={{ flex: 1, fontSize: 12 }} numberOfLines={1}>
            {row.key}
          </Mono>
        ) : (
          <Small style={{ flex: 1 }} numberOfLines={2}>
            {row.key}
          </Small>
        )}
        <Small color={palette.ink} style={{ fontWeight: "600" }}>
          {formatNumber(row.clicks)}
        </Small>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Small color={palette.inkFaint}>{formatNumber(row.impressions)} impressions</Small>
        <Small color={palette.inkFaint}>pos {row.position.toFixed(1)}</Small>
        {delta !== null && delta !== 0 ? (
          <Small color={tone} style={{ fontWeight: "600" }}>
            {delta > 0 ? "+" : ""}
            {formatNumber(delta)} clicks
          </Small>
        ) : null}
      </View>
    </View>
  );
}

function ReportBody({ report }: { report: GscWebsiteReport }) {
  const { palette } = useTheme();
  const { current, previous, windowDays } = report;

  return (
    <>
      {report.lastError ? (
        <Card style={{ marginBottom: 14, backgroundColor: palette.criticalSoft }}>
          <Small color={palette.criticalStrong} style={{ fontWeight: "600" }}>
            Last sync failed
          </Small>
          <Small color={palette.criticalStrong}>{report.lastError}</Small>
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <StatTile
          label="Clicks"
          value={formatNumber(current.clicks)}
          change={percentChange(current.clicks, previous.clicks)}
          windowDays={windowDays}
        />
        <StatTile
          label="Impressions"
          value={formatNumber(current.impressions)}
          change={percentChange(current.impressions, previous.impressions)}
          windowDays={windowDays}
        />
        <StatTile
          label="CTR"
          value={`${(current.ctr * 100).toFixed(1)}%`}
          change={percentChange(current.ctr, previous.ctr)}
          windowDays={windowDays}
        />
        <StatTile
          label="Avg position"
          value={current.position.toFixed(1)}
          change={percentChange(current.position, previous.position)}
          lowerIsBetter
          windowDays={windowDays}
        />
      </View>

      {report.trend.length > 1 ? (
        <Card style={{ marginTop: 14 }}>
          <CardTitle style={{ marginBottom: 2 }}>Clicks per day</CardTitle>
          <Small color={palette.inkSecondary} style={{ marginBottom: 10 }}>
            Last {report.trend.length} days
          </Small>
          <Sparkline values={report.trend.map((point) => point.clicks)} />
        </Card>
      ) : null}

      {report.topQueries.length > 0 ? (
        <Card style={{ marginTop: 14 }}>
          <CardTitle style={{ marginBottom: 2 }}>Top queries</CardTitle>
          {report.topQueries.map((row, index) => (
            <View key={row.key}>
              {index > 0 ? <Divider /> : null}
              <DimensionRow row={row} />
            </View>
          ))}
        </Card>
      ) : null}

      {report.topPages.length > 0 ? (
        <Card style={{ marginTop: 14 }}>
          <CardTitle style={{ marginBottom: 2 }}>Top pages</CardTitle>
          {report.topPages.map((row, index) => (
            <View key={row.key}>
              {index > 0 ? <Divider /> : null}
              <DimensionRow row={row} mono />
            </View>
          ))}
        </Card>
      ) : null}

      <Small color={palette.inkSecondary} style={{ marginTop: 14 }}>
        {report.property ? `${report.property} · ` : ""}
        Synced {timeAgo(report.lastSyncAt)}. Figures come from MyKavo&apos;s copy of Search
        Console, refreshed by the daily sync.
      </Small>
    </>
  );
}

export default function SearchConsoleScreen() {
  const { palette } = useTheme();
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const { data, error, loading, refreshing, refresh, reload } = useLive(
    api.searchConsole,
    [],
    { interval: 0 },
  );

  const options: FilterOption<string | null>[] = useMemo(
    () =>
      (data?.websites ?? []).map((site) => ({
        value: site.websiteId,
        label: site.name,
        hint: site.url.replace(/^https?:\/\//, ""),
      })),
    [data],
  );

  // Default to the first connected site rather than making the picker a
  // required first step - one site is the common case and should need no taps.
  const report =
    data?.websites.find((site) => site.websiteId === websiteId) ?? data?.websites[0] ?? null;

  const header = <Stack.Screen options={{ title: "Search Console" }} />;

  if (loading && !data) {
    return (
      <Screen title="Search Console">
        {header}
        <LoadingState />
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen title="Search Console">
        {header}
        <ErrorState message={error.message} onRetry={() => void reload()} />
      </Screen>
    );
  }

  if (!data) return null;

  return (
    <Screen
      title="Search Console"
      subtitle={report ? `Last ${report.windowDays} days` : undefined}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      {header}
      {data.websites.length === 0 ? (
        <EmptyState
          title="No website is connected yet"
          message="Connect a website to Google Search Console on the web dashboard, and its clicks, impressions and top queries appear here."
          action={
            <Pressable
              onPress={() => void Linking.openURL("https://mykavo.app/dashboard/search-console")}
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
              <ExternalLink size={14} color={palette.inkSecondary} />
              <Small color={palette.inkSecondary} style={{ fontWeight: "600" }}>
                Open the dashboard
              </Small>
            </Pressable>
          }
        />
      ) : (
        <>
          {data.websites.length > 1 ? (
            <View style={{ flexDirection: "row", marginBottom: 12 }}>
              <FilterSelect
                label="Website"
                value={report?.websiteId ?? null}
                options={options}
                isDefault={false}
                onChange={setWebsiteId}
              />
            </View>
          ) : null}
          {report ? <ReportBody report={report} /> : null}
        </>
      )}
    </Screen>
  );
}
