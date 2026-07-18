/**
 * Change detail - mobile counterpart of the web dashboard's
 * dashboard/changes/[id] page: badges + title header, before/after values,
 * screenshots with diff, broken links, notes thread, triage actions and the
 * technical details list.
 */

import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { CategoryChip, ChangeStatusBadge, SeverityBadge } from "@/components/badges";
import { Screen } from "@/components/screen";
import {
  Body,
  Button,
  Card,
  CardTitle,
  Divider,
  ErrorState,
  LoadingState,
  MicroLabel,
  Mono,
  Small,
} from "@/components/ui";
import { api, authedImageSource, diffPath, screenshotPath } from "@/lib/api";
import { formatDateTime, pathOf, timeAgo } from "@/lib/format";
import { useLive } from "@/lib/live";
import { categoryLabels, fonts, radius, severityColors, type } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import type { ChangeDetail } from "@/lib/types";

/** Full-width screenshot: tall full-page capture cropped from the top. */
function Screenshot({ path }: { path: string }) {
  const { palette } = useTheme();
  return (
    <Image
      source={authedImageSource(path)}
      contentFit="cover"
      contentPosition="top"
      style={{
        width: "100%",
        aspectRatio: 16 / 10,
        borderRadius: radius.tile,
        backgroundColor: palette.surface,
      }}
    />
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        paddingVertical: 10,
      }}
    >
      <Small color={palette.inkFaint}>{label}</Small>
      {mono ? (
        <Mono color={palette.ink} numberOfLines={1} style={{ flexShrink: 1 }}>
          {value}
        </Mono>
      ) : (
        <Small color={palette.ink} numberOfLines={1} style={{ flexShrink: 1, textAlign: "right" }}>
          {value}
        </Small>
      )}
    </View>
  );
}

function ActionsCard({
  change,
  reload,
}: {
  change: ChangeDetail;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      Alert.alert(err instanceof Error ? err.message : "Something went wrong");
    }
    await reload();
    setBusy(null);
  }

  const isOpen = change.status === "NEW" || change.status === "REVIEWED";
  const isClosed =
    change.status === "APPROVED" || change.status === "RESOLVED" || change.status === "IGNORED";

  return (
    <Card>
      <CardTitle>Actions</CardTitle>
      <View style={{ gap: 10, marginTop: 14 }}>
        {isOpen ? (
          <Button
            title="Approve change"
            variant="primary"
            loading={busy === "approve"}
            disabled={busy !== null}
            onPress={() => void run("approve", () => api.triageChange(change.id, "approve"))}
          />
        ) : null}
        {change.canUpdateBaseline ? (
          <Button
            title="Approve & update baseline"
            variant="dark"
            loading={busy === "baseline"}
            disabled={busy !== null}
            onPress={() => void run("baseline", () => api.updateBaselineFromChange(change.id))}
          />
        ) : null}
        {change.status === "NEW" ? (
          <Button
            title="Mark reviewed"
            variant="secondary"
            loading={busy === "review"}
            disabled={busy !== null}
            onPress={() => void run("review", () => api.triageChange(change.id, "review"))}
          />
        ) : null}
        {isOpen ? (
          <Button
            title="Resolve"
            variant="secondary"
            loading={busy === "resolve"}
            disabled={busy !== null}
            onPress={() => void run("resolve", () => api.triageChange(change.id, "resolve"))}
          />
        ) : null}
        {isOpen ? (
          <Button
            title="Ignore"
            variant="ghost"
            loading={busy === "ignore"}
            disabled={busy !== null}
            onPress={() => void run("ignore", () => api.triageChange(change.id, "ignore"))}
          />
        ) : null}
        {isClosed ? (
          <Button
            title="Reopen"
            variant="secondary"
            loading={busy === "reopen"}
            disabled={busy !== null}
            onPress={() => void run("reopen", () => api.triageChange(change.id, "reopen"))}
          />
        ) : null}
      </View>
    </Card>
  );
}

export default function ChangeDetailScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, error, loading, refreshing, refresh, reload } = useLive(
    () => api.changeDetail(id),
    [id],
    { interval: 30000 },
  );

  const change = data?.change ?? null;

  const backRow = (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/changes"))}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
        paddingVertical: 4,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <ChevronLeft size={18} color={palette.inkSecondary} />
      <Small style={{ fontFamily: fonts.bodyMedium }}>Changes</Small>
    </Pressable>
  );

  if (!change) {
    return (
      <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
        {backRow}
        {error && !loading ? (
          <ErrorState message={error.message} onRetry={() => void reload()} />
        ) : (
          <LoadingState />
        )}
      </Screen>
    );
  }

  const pagePath = change.pageUrl ? pathOf(change.pageUrl) : null;
  const hasValues = change.previousValue !== null || change.currentValue !== null;
  const hasShots = change.previousSnapshotId !== null || change.currentSnapshotId !== null;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
      {backRow}

      {/* Header */}
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <SeverityBadge severity={change.severity} />
          <CategoryChip category={change.category} />
          <ChangeStatusBadge status={change.status} />
        </View>
        <Text style={[type.h2, { color: palette.ink }]}>{change.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
          <Small>{change.websiteName}</Small>
          {pagePath ? <Mono numberOfLines={1}>{pagePath}</Mono> : <Small>Site-wide</Small>}
          <Small color={palette.inkFaint}>{formatDateTime(change.detectedAt)}</Small>
        </View>
        <Body>{change.description}</Body>
      </View>

      {/* Before / after values */}
      {hasValues ? (
        <Card>
          <CardTitle>Before / after</CardTitle>
          <View style={{ gap: 12, marginTop: 14 }}>
            <View style={{ gap: 6 }}>
              <MicroLabel>Baseline</MicroLabel>
              <View
                style={{
                  backgroundColor: palette.successSoft,
                  borderRadius: radius.field,
                  padding: 12,
                }}
              >
                <Mono color={palette.successStrong} numberOfLines={6}>
                  {change.previousValue ?? "-"}
                </Mono>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <MicroLabel>Current</MicroLabel>
              <View
                style={{
                  backgroundColor: palette.criticalSoft,
                  borderRadius: radius.field,
                  padding: 12,
                }}
              >
                <Mono color={palette.criticalStrong} numberOfLines={6}>
                  {change.currentValue ?? "-"}
                </Mono>
              </View>
            </View>
          </View>
        </Card>
      ) : null}

      {/* Screenshots */}
      {hasShots ? (
        <Card>
          <CardTitle>Screenshots</CardTitle>
          <View style={{ gap: 14, marginTop: 14 }}>
            {change.previousSnapshotId ? (
              <View style={{ gap: 6 }}>
                <MicroLabel>Before</MicroLabel>
                <Screenshot path={screenshotPath(change.previousSnapshotId)} />
              </View>
            ) : null}
            {change.currentSnapshotId ? (
              <View style={{ gap: 6 }}>
                <MicroLabel>After</MicroLabel>
                <Screenshot path={screenshotPath(change.currentSnapshotId)} />
              </View>
            ) : null}
            {change.hasDiff ? (
              <View style={{ gap: 6 }}>
                <MicroLabel>Diff</MicroLabel>
                <Screenshot path={diffPath(change.id)} />
              </View>
            ) : null}
          </View>
        </Card>
      ) : null}

      {/* Broken links */}
      {change.brokenLinks.length > 0 ? (
        <Card>
          <CardTitle>Broken links ({change.brokenLinks.length})</CardTitle>
          <View style={{ marginTop: 8 }}>
            {change.brokenLinks.map((link, index) => (
              <View key={link.url}>
                {index > 0 ? <Divider /> : null}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 12,
                  }}
                >
                  <Mono numberOfLines={1} color={palette.ink} style={{ flex: 1 }}>
                    {link.url}
                  </Mono>
                  <View
                    style={{
                      borderRadius: radius.pill,
                      backgroundColor: palette.criticalSoft,
                      paddingHorizontal: 10,
                      paddingVertical: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemiBold,
                        fontSize: 12,
                        color: palette.criticalStrong,
                      }}
                    >
                      {link.status !== null ? `HTTP ${link.status}` : "Unreachable"}
                    </Text>
                  </View>
                  <Small color={palette.inkFaint}>
                    on {link.pageCount} page{link.pageCount === 1 ? "" : "s"}
                  </Small>
                </View>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {/* Notes (read-only in the app) */}
      {change.notes.length > 0 ? (
        <Card>
          <CardTitle>Notes</CardTitle>
          <View style={{ marginTop: 8 }}>
            {change.notes.map((note, index) => (
              <View key={note.id}>
                {index > 0 ? <Divider /> : null}
                <View style={{ paddingVertical: 12, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                    <Small color={palette.ink} style={{ fontFamily: fonts.bodySemiBold }}>
                      {note.authorName}
                    </Small>
                    <Small color={palette.inkFaint}>{timeAgo(note.createdAt)}</Small>
                  </View>
                  <Body>{note.body}</Body>
                </View>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {/* Triage actions */}
      <ActionsCard change={change} reload={reload} />

      {/* Technical details */}
      <Card>
        <CardTitle>Details</CardTitle>
        <View style={{ marginTop: 8 }}>
          <DetailRow label="Type" value={change.changeType} mono />
          <Divider />
          <DetailRow label="Category" value={categoryLabels[change.category]} />
          <Divider />
          <DetailRow label="Severity" value={severityColors(palette, change.severity).label} />
          <Divider />
          <DetailRow label="Website" value={change.websiteName} />
          <Divider />
          <DetailRow label="Detected" value={formatDateTime(change.detectedAt)} />
        </View>
      </Card>
    </Screen>
  );
}
