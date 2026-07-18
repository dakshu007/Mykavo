/**
 * Changes list - mobile counterpart of the web dashboard's
 * dashboard/changes page: status / severity / category filter pills over a
 * single card list with severity + status badges per row.
 */

import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { SeverityBadge, ChangeStatusBadge } from "@/components/badges";
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
  Pill,
  Small,
} from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useLive } from "@/lib/live";
import { categoryLabels, type ChangeCategory, type Severity } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import type { ChangeListItem } from "@/lib/types";

type StatusFilter = "open" | "all";

const SEVERITIES: { value: Severity; label: string }[] = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "INFO", label: "Info" },
];

const CATEGORIES = Object.keys(categoryLabels) as ChangeCategory[];

/** Edge-to-edge horizontal pill row aligned with the screen padding. */
function FilterRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -16 }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 4,
        gap: 8,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {children}
    </ScrollView>
  );
}

function ChangeRow({ change }: { change: ChangeListItem }) {
  const { palette } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/change/${change.id}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <SeverityBadge severity={change.severity} />
            <ChangeStatusBadge status={change.status} />
          </View>
          <CardTitle numberOfLines={2}>{change.title}</CardTitle>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Small numberOfLines={1}>{change.websiteName}</Small>
              <Small color={palette.inkFaint}>·</Small>
              {change.pagePath ? (
                <Mono numberOfLines={1} style={{ flexShrink: 1 }}>
                  {change.pagePath}
                </Mono>
              ) : (
                <Small numberOfLines={1}>Site-wide</Small>
              )}
            </View>
            <Small color={palette.inkFaint}>{timeAgo(change.detectedAt)}</Small>
          </View>
        </View>
        <ChevronRight size={16} color={palette.inkFaint} />
      </View>
    </Pressable>
  );
}

export default function ChangesScreen() {
  const [status, setStatus] = useState<StatusFilter>("open");
  const [severity, setSeverity] = useState<Severity | undefined>(undefined);
  const [category, setCategory] = useState<ChangeCategory | undefined>(undefined);

  const { data, error, loading, refreshing, refresh, reload } = useLive(
    () => api.changes({ status, severity, category }),
    [status, severity, category],
    { interval: 20000 },
  );

  const hasRefinement = severity !== undefined || category !== undefined;

  const subtitle = data
    ? `${data.total} ${status === "all" ? "total" : "open"}`
    : undefined;

  let body: React.ReactNode;
  if (loading && !data) {
    body = <LoadingState />;
  } else if (error && !data) {
    body = <ErrorState message={error.message} onRetry={() => void reload()} />;
  } else if (data) {
    let list: React.ReactNode;
    if (data.changes.length === 0) {
      if (data.websites.length === 0) {
        // No website in the workspace has ever produced a change event.
        list = (
          <EmptyState
            title="No changes detected yet"
            message="Once a website is scanned again after its baseline, meaningful changes - visual, SEO, links, scripts, performance - appear here with severity and before-and-after views."
          />
        );
      } else if (hasRefinement) {
        list = (
          <EmptyState
            title="Nothing matches these filters"
            message="Changes were detected, just none with this combination of severity, category, or status."
            action={
              <Button
                title="Clear filters"
                variant="secondary"
                size="sm"
                onPress={() => {
                  setSeverity(undefined);
                  setCategory(undefined);
                }}
              />
            }
          />
        );
      } else {
        list = (
          <EmptyState
            title="You're all caught up"
            message="Everything detected has been approved, resolved, or ignored."
            action={
              <Button
                title="View all changes"
                variant="secondary"
                size="sm"
                onPress={() => setStatus("all")}
              />
            }
          />
        );
      }
    } else {
      list = data.changes.map((change, index) => (
        <View key={change.id}>
          {index > 0 ? <Divider /> : null}
          <ChangeRow change={change} />
        </View>
      ));
    }
    body = <Card>{list}</Card>;
  } else {
    body = <LoadingState />;
  }

  return (
    <Screen
      title="Changes"
      subtitle={subtitle}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      <View style={{ gap: 4 }}>
        <FilterRow>
          <Pill
            label="Open"
            active={status === "open"}
            onPress={() => setStatus("open")}
            style={{ paddingHorizontal: 12, paddingVertical: 6 }}
          />
          <Pill
            label="All"
            active={status === "all"}
            onPress={() => setStatus("all")}
            style={{ paddingHorizontal: 12, paddingVertical: 6 }}
          />
        </FilterRow>
        <FilterRow>
          <Pill
            label="Any severity"
            active={severity === undefined}
            onPress={() => setSeverity(undefined)}
            style={{ paddingHorizontal: 12, paddingVertical: 6 }}
          />
          {SEVERITIES.map((s) => (
            <Pill
              key={s.value}
              label={s.label}
              active={severity === s.value}
              onPress={() => setSeverity(s.value)}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            />
          ))}
        </FilterRow>
        <FilterRow>
          <Pill
            label="Any type"
            active={category === undefined}
            onPress={() => setCategory(undefined)}
            style={{ paddingHorizontal: 12, paddingVertical: 6 }}
          />
          {CATEGORIES.map((c) => (
            <Pill
              key={c}
              label={categoryLabels[c]}
              active={category === c}
              onPress={() => setCategory(c)}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            />
          ))}
        </FilterRow>
      </View>
      {body}
    </Screen>
  );
}
