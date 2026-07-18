/**
 * Overview - the mobile counterpart of the web dashboard overview
 * (apps/web/src/app/dashboard/page.tsx): headline stats, website health
 * rows and the latest open changes. Polls faster while a scan is running,
 * matching the web dashboard's live cadence.
 */

import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Linking, Pressable, Text, View } from "react-native";

import { HealthDot, SeverityBadge, WebsiteStatusBadge } from "@/components/badges";
import { Screen } from "@/components/screen";
import {
  Button,
  Card,
  CardTitle,
  Divider,
  EmptyState,
  ErrorState,
  LoadingState,
  Mono,
  Small,
  StatTile,
} from "@/components/ui";
import { api } from "@/lib/api";
import { hostOf, timeAgo } from "@/lib/format";
import { activeInterval, useLive } from "@/lib/live";
import { fonts, radius, severityColors, type Severity } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

/**
 * Compact open-changes count chip tinted by the site's highest open severity
 * (dot + count). The full labeled SeverityBadge lives on the change rows.
 */
function OpenChangesBadge({ severity, count }: { severity: Severity; count: number }) {
  const { palette } = useTheme();
  const c = severityColors(palette, severity);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: radius.pill,
        backgroundColor: c.bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.dot }} />
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12, color: c.text }}>
        {count} open
      </Text>
    </View>
  );
}

/** Card header: CardTitle left + small "View all" action right. */
function CardHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
      }}
    >
      <CardTitle>{title}</CardTitle>
      {onViewAll ? (
        <Pressable onPress={onViewAll} hitSlop={8}>
          <Small color={palette.primary}>View all</Small>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function OverviewScreen() {
  const router = useRouter();
  const { palette } = useTheme();

  const { data, error, loading, refreshing, refresh, reload } = useLive(api.overview, [], {
    interval: (d) => activeInterval(Boolean(d?.websites.some((w) => w.scanInProgress)), 15000),
  });

  if (loading && !data) {
    return (
      <Screen title="Overview">
        <LoadingState />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen title="Overview" refreshing={refreshing} onRefresh={() => void refresh()}>
        <ErrorState
          message={error?.message ?? "Could not load your overview."}
          onRetry={() => void reload()}
        />
      </Screen>
    );
  }

  const { stats, websites, recentChanges } = data;

  return (
    <Screen
      title="Overview"
      subtitle={data.workspace.name}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      {/* Headline stats - 2x2 tile grid. */}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatTile label="Websites" value={stats.websites} gradient={palette.gradientMint} />
          <StatTile
            label="Open changes"
            value={stats.openChanges}
            gradient={palette.gradientCoral}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatTile label="Pages monitored" value={stats.pages} />
          <StatTile label="Baselined pages" value={stats.baselinedPages} />
        </View>
      </View>

      <Card>
        <CardHeader
          title="Your websites"
          onViewAll={websites.length > 0 ? () => router.push("/(tabs)/websites") : undefined}
        />
        {websites.length === 0 ? (
          <EmptyState
            title="Add your first website"
            message="Add and configure websites from the web dashboard at mykavo.app. Once monitoring starts, everything shows up here."
            action={
              <Button
                title="Open mykavo.app"
                variant="secondary"
                size="sm"
                onPress={() => void Linking.openURL("https://mykavo.app/dashboard/websites/new")}
              />
            }
          />
        ) : (
          websites.slice(0, 8).map((w, i) => (
            <View key={w.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => router.push(`/website/${w.id}`)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <HealthDot health={w.health} size={10} />
                <View style={{ flex: 1, gap: 3 }}>
                  <CardTitle numberOfLines={1}>{w.name}</CardTitle>
                  <Mono
                    numberOfLines={1}
                    color={palette.inkFaint}
                    style={{ fontSize: 12, lineHeight: 16 }}
                  >
                    {hostOf(w.url)}
                  </Mono>
                  <WebsiteStatusBadge status={w.status} />
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  {w.openChanges > 0 && w.highestOpenSeverity ? (
                    <OpenChangesBadge severity={w.highestOpenSeverity} count={w.openChanges} />
                  ) : null}
                  {w.scanInProgress ? <Small color={palette.primary}>Scanning</Small> : null}
                </View>
                <ChevronRight size={16} color={palette.inkFaint} />
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <Card>
        <CardHeader
          title="Recent changes"
          onViewAll={recentChanges.length > 0 ? () => router.push("/(tabs)/changes") : undefined}
        />
        {recentChanges.length === 0 ? (
          <EmptyState title="No open changes" message="All quiet. Your sites look stable." />
        ) : (
          recentChanges.map((c, i) => (
            <View key={c.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => router.push(`/change/${c.id}`)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <SeverityBadge severity={c.severity} />
                  <CardTitle numberOfLines={2}>{c.title}</CardTitle>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Small numberOfLines={1}>{c.websiteName}</Small>
                    <Small color={palette.inkFaint}>{timeAgo(c.detectedAt)}</Small>
                  </View>
                </View>
                <ChevronRight size={16} color={palette.inkFaint} />
              </Pressable>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
