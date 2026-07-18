/**
 * Scan detail - mobile counterpart of the web dashboard's
 * /dashboard/scans/[id] page: summary tiles, changes detected during the
 * scan (with scan-level baseline approval), and per-page results with
 * screenshot thumbnails. Polls every 3s while the scan is in flight,
 * exactly like the web page's auto-refresh.
 */

import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react-native";
import { Fragment, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { CategoryChip, ScanStatusBadge, SeverityBadge } from "@/components/badges";
import { Screen } from "@/components/screen";
import {
  Button,
  Card,
  CardTitle,
  Divider,
  EmptyState,
  ErrorState,
  Heading,
  LoadingState,
  Mono,
  Small,
  StatTile,
} from "@/components/ui";
import { api, authedImageSource, screenshotPath } from "@/lib/api";
import { formatBytes, formatDateTime, formatDuration, formatMs, hostOf, pathOf } from "@/lib/format";
import { activeInterval, useLive } from "@/lib/live";
import { fonts, radius } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import type { ScanPageResult } from "@/lib/types";

/** Tiny filled chip for baseline / error tags (local to this screen). */
function ChipTag({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View
      style={{
        borderRadius: radius.pill,
        backgroundColor: bg,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11, color }}>{label}</Text>
    </View>
  );
}

function PageRow({ page }: { page: ScanPageResult }) {
  const { palette } = useTheme();
  const failed = page.errorCode !== null;
  const meta = [
    page.httpStatus !== null ? `HTTP ${page.httpStatus}` : null,
    page.responseTimeMs !== null ? formatMs(page.responseTimeMs) : null,
    page.pageWeightBytes !== null ? formatBytes(page.pageWeightBytes) : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 }}>
      {page.hasScreenshot ? (
        <Image
          source={authedImageSource(screenshotPath(page.snapshotId))}
          style={{ width: 72, height: 48, borderRadius: 8, backgroundColor: palette.surface }}
          contentFit="cover"
          contentPosition="top"
        />
      ) : (
        <View
          style={{
            width: 72,
            height: 48,
            borderRadius: 8,
            backgroundColor: palette.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ImageOff size={16} color={palette.inkFaint} />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Mono numberOfLines={1} color={palette.ink}>
          {pathOf(page.url)}
        </Mono>
        {failed ? (
          <View style={{ gap: 4 }}>
            <ChipTag
              label={page.errorCode ?? "ERROR"}
              bg={palette.criticalSoft}
              color={palette.criticalStrong}
            />
            {page.errorMessage ? <Small numberOfLines={2}>{page.errorMessage}</Small> : null}
          </View>
        ) : (
          <Small numberOfLines={1}>{meta}</Small>
        )}
      </View>
      {page.isBaseline ? (
        <ChipTag
          label={`Baseline v${page.baselineVersion ?? 1}`}
          bg={palette.successSoft}
          color={palette.successStrong}
        />
      ) : null}
    </View>
  );
}

export default function ScanDetailScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const [approving, setApproving] = useState(false);

  const { data, error, loading, refreshing, refresh, reload } = useLive(
    () => api.scanDetail(id),
    [id],
    {
      enabled: id !== "",
      interval: (d) =>
        activeInterval(d?.scan.status === "QUEUED" || d?.scan.status === "RUNNING", 30000, 3000),
    },
  );

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/scans");
    }
  }

  async function approve() {
    setApproving(true);
    try {
      await api.approveScan(id);
    } catch (err) {
      Alert.alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setApproving(false);
    }
    await reload();
  }

  function confirmApprove() {
    Alert.alert(
      "Approve scan?",
      "Promotes every changed page's current snapshot to the new baseline.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Approve", onPress: () => void approve() },
      ],
    );
  }

  const backRow = (
    <Pressable
      onPress={goBack}
      style={({ pressed }) => ({
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
        alignSelf: "flex-start" as const,
        paddingVertical: 4,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <ChevronLeft size={18} color={palette.inkSecondary} />
      <Small color={palette.inkSecondary} style={{ fontFamily: fonts.bodyMedium }}>
        Back
      </Small>
    </Pressable>
  );

  if (!data) {
    return (
      <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
        {backRow}
        {loading ? (
          <LoadingState />
        ) : (
          <ErrorState
            message={error?.message ?? "Scan not found"}
            onRetry={() => void reload()}
          />
        )}
      </Screen>
    );
  }

  const { scan, changes, pages, openChangeCount } = data;
  const inFlight = scan.status === "QUEUED" || scan.status === "RUNNING";
  const canApprove =
    (scan.status === "COMPLETED" || scan.status === "PARTIAL") && openChangeCount > 0;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
      {backRow}

      <View style={{ gap: 6 }}>
        <Heading>{scan.triggerType === "BASELINE" ? "Baseline scan" : "Scan"}</Heading>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Small color={palette.ink}>{scan.websiteName}</Small>
          <Mono color={palette.inkFaint} style={{ fontSize: 12, lineHeight: 16 }}>
            {hostOf(scan.websiteUrl)}
          </Mono>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ScanStatusBadge status={scan.status} />
          {inFlight ? <Small color={palette.primary}>Updating automatically</Small> : null}
        </View>
        <Small color={palette.inkFaint}>{formatDateTime(scan.createdAt)}</Small>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatTile label="Requested" value={scan.pagesRequested} />
          <StatTile label="Scanned" value={scan.pagesScanned} />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatTile
            label="Failed"
            value={scan.pagesFailed}
            caption={
              scan.pagesFailed > 0 ? (
                <Small color={palette.criticalStrong}>needs attention</Small>
              ) : undefined
            }
          />
          <StatTile label="Duration" value={formatDuration(scan.startedAt, scan.completedAt)} />
        </View>
      </View>

      {changes.length > 0 ? (
        <Card>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 4,
            }}
          >
            <CardTitle>Changes detected ({changes.length})</CardTitle>
            {openChangeCount === 0 ? (
              <ChipTag label="All reviewed" bg={palette.successSoft} color={palette.successStrong} />
            ) : null}
          </View>
          {changes.map((change, index) => (
            <Fragment key={change.id}>
              {index > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => router.push(`/change/${change.id}`)}
                style={({ pressed }) => ({
                  flexDirection: "row" as const,
                  alignItems: "center" as const,
                  gap: 12,
                  paddingVertical: 12,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{ flex: 1, gap: 6 }}>
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}
                  >
                    <SeverityBadge severity={change.severity} />
                    <CategoryChip category={change.category} />
                  </View>
                  <CardTitle numberOfLines={2}>{change.title}</CardTitle>
                  <Mono
                    numberOfLines={1}
                    color={palette.inkFaint}
                    style={{ fontSize: 12, lineHeight: 16 }}
                  >
                    {change.pagePath ?? "Site-wide"}
                  </Mono>
                </View>
                <ChevronRight size={16} color={palette.inkFaint} />
              </Pressable>
            </Fragment>
          ))}
          {canApprove ? (
            <Button
              title="Approve entire scan"
              variant="dark"
              onPress={confirmApprove}
              loading={approving}
              style={{ marginTop: 8 }}
            />
          ) : null}
        </Card>
      ) : scan.status === "COMPLETED" ? (
        <Card>
          <EmptyState
            title="No changes detected"
            message="Everything matches the approved baseline."
          />
        </Card>
      ) : null}

      <Card>
        <CardTitle style={{ marginBottom: 4 }}>Pages</CardTitle>
        {pages.length === 0 ? (
          <Small style={{ paddingVertical: 12 }}>
            {inFlight ? "Waiting for the first page result..." : "No page results yet"}
          </Small>
        ) : (
          pages.map((page, index) => (
            <Fragment key={page.snapshotId}>
              {index > 0 ? <Divider /> : null}
              <PageRow page={page} />
            </Fragment>
          ))
        )}
      </Card>
    </Screen>
  );
}
