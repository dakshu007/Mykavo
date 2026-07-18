/**
 * Scan history tab - mobile counterpart of the web dashboard's
 * /dashboard/scans table: every scan across the workspace with status,
 * trigger, page counts, duration and start time. Polls faster while a
 * scan is queued or running.
 */

import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Fragment } from "react";
import { Pressable, View } from "react-native";

import { ScanStatusBadge } from "@/components/badges";
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
import { formatDuration, hostOf, timeAgo } from "@/lib/format";
import { activeInterval, useLive } from "@/lib/live";
import { useTheme } from "@/lib/theme-context";
import type { ScanListItem } from "@/lib/types";

const triggerLabels: Record<ScanListItem["triggerType"], string> = {
  BASELINE: "Baseline scan",
  MANUAL: "Manual",
  SCHEDULED: "Scheduled",
};

function ScanRow({ scan, onPress }: { scan: ScanListItem; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
        paddingVertical: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ gap: 2 }}>
          <CardTitle numberOfLines={1}>{scan.websiteName}</CardTitle>
          <Mono
            numberOfLines={1}
            color={palette.inkFaint}
            style={{ fontSize: 12, lineHeight: 16 }}
          >
            {hostOf(scan.websiteUrl)}
          </Mono>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <ScanStatusBadge status={scan.status} />
          <Small>{triggerLabels[scan.triggerType]}</Small>
        </View>
        <Small>
          {scan.pagesScanned}/{scan.pagesRequested} pages
          {scan.pagesFailed > 0 ? (
            <Small color={palette.criticalStrong}>, {scan.pagesFailed} failed</Small>
          ) : null}
        </Small>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Small color={palette.inkFaint}>{timeAgo(scan.createdAt)}</Small>
        <Small>{formatDuration(scan.startedAt, scan.completedAt)}</Small>
      </View>
      <ChevronRight size={16} color={palette.inkFaint} />
    </Pressable>
  );
}

export default function ScansScreen() {
  const router = useRouter();
  const { data, error, loading, refreshing, refresh, reload } = useLive(
    () => api.scans(),
    [],
    {
      interval: (d) =>
        activeInterval(
          Boolean(d?.scans.some((s) => s.status === "QUEUED" || s.status === "RUNNING")),
          20000,
        ),
    },
  );

  const scans = data?.scans ?? [];

  return (
    <Screen
      title="Scan history"
      subtitle={data ? `Last ${scans.length} ${scans.length === 1 ? "scan" : "scans"}` : undefined}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      {loading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState message={error.message} onRetry={() => void reload()} />
      ) : scans.length === 0 ? (
        <Card>
          <EmptyState
            title="No scans yet"
            message="Run your first scan from a website page"
          />
        </Card>
      ) : (
        <Card>
          {scans.map((scan, index) => (
            <Fragment key={scan.id}>
              {index > 0 ? <Divider /> : null}
              <ScanRow scan={scan} onPress={() => router.push(`/scan/${scan.id}`)} />
            </Fragment>
          ))}
        </Card>
      )}
    </Screen>
  );
}
