/**
 * Small building blocks shared by the operator screens (Tracking,
 * Automations, Email marketing): a label/value row, a proportion bar, a status
 * chip and the channel colours. Kept here rather than in ui.tsx because no
 * customer-facing screen uses them.
 */

import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { Small } from "@/components/ui";
import type { FxPalette } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import type { ChannelStatus, TrackingChannel } from "@/lib/types";

/** One colour per channel, the same family the web Tracking page uses. */
export function channelColor(palette: FxPalette, channel: TrackingChannel | "account"): string {
  switch (channel) {
    case "web":
      return palette.info;
    case "android":
      return palette.success;
    case "wordpress":
      return palette.chartViolet;
    case "shopify":
      return palette.orange;
    case "chrome":
      return palette.chartGold;
    case "mcp":
      return palette.chartAmber;
    default:
      return palette.inkFaint;
  }
}

/** How far along a channel is: in use, set up, stuck part-way, or none. */
export function channelTone(palette: FxPalette, status: ChannelStatus): { fg: string; bg: string } {
  switch (status) {
    case "active":
      return { fg: palette.successStrong, bg: palette.successSoft };
    case "installed":
      return { fg: palette.ink, bg: palette.surface };
    case "pending":
    case "started":
      return { fg: palette.warningStrong, bg: palette.warningSoft };
    case "stopped":
      return { fg: palette.criticalStrong, bg: palette.criticalSoft };
    default:
      return { fg: palette.inkFaint, bg: palette.surface };
  }
}

export function Chip({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Small color={fg} style={{ fontSize: 11.5, fontWeight: "600" }}>
        {label}
      </Small>
    </View>
  );
}

/** Label on the left, value on the right; optional note under the label. */
export function KeyRow({
  label,
  value,
  note,
  onPress,
}: {
  label: string;
  value: ReactNode;
  note?: string | null;
  onPress?: () => void;
}) {
  const { palette } = useTheme();
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Small color={palette.ink}>{label}</Small>
        {note ? (
          <Small color={palette.inkFaint} style={{ fontSize: 11.5 }} numberOfLines={2}>
            {note}
          </Small>
        ) : null}
      </View>
      {typeof value === "string" || typeof value === "number" ? (
        <Small color={palette.ink} style={{ fontWeight: "600" }}>
          {value}
        </Small>
      ) : (
        value
      )}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {body}
    </Pressable>
  );
}

/** A thin horizontal bar: `value` of `max`. */
export function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
  const { palette } = useTheme();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.surface, overflow: "hidden" }}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: 6,
          borderRadius: 3,
          backgroundColor: color ?? palette.chartGold,
        }}
      />
    </View>
  );
}

/** "42%" of a total, or "-" when there is nothing to divide by. */
export function share(part: number, total: number): string {
  if (!total) return "-";
  return `${Math.round((part / total) * 1000) / 10}%`;
}
