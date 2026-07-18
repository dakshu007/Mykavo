/**
 * Status + severity badges - exact ports of the web dashboard's
 * ui/badge.tsx, dashboard/change-badges.tsx, website-status.tsx and
 * scan-status.tsx. Severity is always color + text label, never color alone.
 */

import { Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/lib/theme-context";
import {
  categoryLabels,
  changeStatusColors,
  fonts,
  radius,
  scanStatusColors,
  severityColors,
  websiteStatusColors,
  type ChangeCategory,
  type ChangeStatus,
  type ScanStatus,
  type Severity,
  type WebsiteStatus,
} from "@/lib/theme";
import type { HealthState } from "@/lib/types";

/** Pill with 6px dot + 12px semibold label on a soft chip background. */
export function SeverityBadge({
  severity,
  style,
}: {
  severity: Severity;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const c = severityColors(palette, severity);
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          borderRadius: radius.pill,
          backgroundColor: c.bg,
          paddingHorizontal: 10,
          paddingVertical: 4,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.dot }} />
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12, color: c.text }}>{c.label}</Text>
    </View>
  );
}

/** Dot + colored 13px text, no chip background. */
export function WebsiteStatusBadge({ status }: { status: WebsiteStatus }) {
  const { palette } = useTheme();
  const c = websiteStatusColors(palette, status);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.dot }} />
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: c.text }}>{c.label}</Text>
    </View>
  );
}

/** Filled chip, 12px semibold, no dot. */
export function ScanStatusBadge({ status }: { status: ScanStatus }) {
  const { palette } = useTheme();
  const c = scanStatusColors(palette, status);
  return (
    <View
      style={{
        borderRadius: radius.pill,
        backgroundColor: c.bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12, color: c.text }}>{c.label}</Text>
    </View>
  );
}

/** Small filled chip, 11px semibold. */
export function ChangeStatusBadge({ status }: { status: ChangeStatus }) {
  const { palette } = useTheme();
  const c = changeStatusColors(palette, status);
  return (
    <View
      style={{
        borderRadius: radius.pill,
        backgroundColor: c.bg,
        paddingHorizontal: 10,
        paddingVertical: 2,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11, color: c.text }}>{c.label}</Text>
    </View>
  );
}

/** Neutral category chip (Availability / Visual / SEO / ...). */
export function CategoryChip({ category }: { category: ChangeCategory }) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        borderRadius: radius.pill,
        backgroundColor: palette.surface,
        paddingHorizontal: 10,
        paddingVertical: 2,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11, color: palette.inkSecondary }}>
        {categoryLabels[category]}
      </Text>
    </View>
  );
}

/** Uptime health dot: green up, red down, faint unknown. */
export function HealthDot({ health, size = 8 }: { health: HealthState; size?: number }) {
  const { palette } = useTheme();
  const color =
    health === "up" ? palette.success : health === "down" ? palette.critical : palette.inkFaint;
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}
