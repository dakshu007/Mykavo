/**
 * Changes list - mobile counterpart of the web dashboard's
 * dashboard/changes page: a single card list with severity + status badges
 * per row, under one compact row of filters.
 *
 * The filters were three rows of chips, which took the top third of the
 * screen and pushed the first change below the fold - the page spent its best
 * space on controls rather than on the thing you opened it to see. They are
 * now three selects that state their current value; see components/
 * filter-select.tsx.
 */

import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { SeverityBadge, ChangeStatusBadge } from "@/components/badges";
import { FilterSelect, type FilterOption } from "@/components/filter-select";
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
} from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useLive } from "@/lib/live";
import { categoryLabels, type ChangeCategory, type Severity } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import type { ChangeListItem } from "@/lib/types";

type StatusFilter = "open" | "all";

const STATUS_OPTIONS: FilterOption<StatusFilter>[] = [
  { value: "open", label: "Open", hint: "Still needs a decision" },
  { value: "all", label: "All changes", hint: "Including reviewed, approved and ignored" },
];

const SEVERITY_OPTIONS: FilterOption<Severity | undefined>[] = [
  { value: undefined, label: "Any severity" },
  { value: "CRITICAL", label: "Critical", hint: "Something is broken or gone" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "INFO", label: "Info", hint: "Noted, not alarming" },
];

const CATEGORY_OPTIONS: FilterOption<ChangeCategory | undefined>[] = [
  { value: undefined, label: "Any type" },
  ...(Object.keys(categoryLabels) as ChangeCategory[]).map((value) => ({
    value: value as ChangeCategory | undefined,
    label: categoryLabels[value],
  })),
];

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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <FilterSelect
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          isDefault={status === "open"}
          onChange={setStatus}
        />
        <FilterSelect
          label="Severity"
          value={severity}
          options={SEVERITY_OPTIONS}
          isDefault={severity === undefined}
          onChange={setSeverity}
        />
        <FilterSelect
          label="Type"
          value={category}
          options={CATEGORY_OPTIONS}
          isDefault={category === undefined}
          onChange={setCategory}
        />
      </View>
      {body}
    </Screen>
  );
}
