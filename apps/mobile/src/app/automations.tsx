/**
 * Automations - the automated emails, the flows and the update emails.
 *
 * The phone counterpart of the web Automations page. Switches use the same
 * admin routes the website does, so turning an email off here is exactly the
 * same as turning it off at a desk. Editing wording, timing and flow steps
 * stays on the website, where there is room to preview an email.
 * Operator-only, reached from Settings > Admin.
 */

import { Stack } from "expo-router";
import { useState } from "react";
import { Alert, Switch, View } from "react-native";

import { Chip, KeyRow } from "@/components/admin";
import { Screen } from "@/components/screen";
import {
  Card,
  CardTitle,
  Divider,
  ErrorState,
  LoadingState,
  Small,
} from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useLive } from "@/lib/live";
import { useTheme } from "@/lib/theme-context";
import type { AutomationItem, FlowListItem, UpdateEmailPanel } from "@/lib/types";

const GROUPS: AutomationItem["group"][] = ["Onboarding", "Lifecycle series", "Plan & monitoring", "Product updates"];

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : "Something went wrong.";
}

function AutomationRow({
  item,
  busy,
  onToggle,
}: {
  item: AutomationItem;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const { palette } = useTheme();
  const s = item.stats;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 }}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Small color={palette.ink} style={{ fontWeight: "600" }}>
            {item.name}
          </Small>
          {item.customised ? <Chip label="Edited" fg={palette.ink} bg={palette.surface} /> : null}
          {item.sendOnDay !== null ? (
            <Chip label={`Day ${item.sendOnDay}`} fg={palette.inkSecondary} bg={palette.surface} />
          ) : null}
        </View>
        <Small color={palette.inkSecondary} numberOfLines={3}>
          {item.trigger}
        </Small>
        <Small color={palette.inkFaint} style={{ fontSize: 11.5 }}>
          {s.sent7d} sent this week · {s.sent30d} in 30 days
          {s.failed30d > 0 ? ` · ${s.failed30d} failed` : ""}
          {s.lastSentAt ? ` · last ${timeAgo(s.lastSentAt)}` : ""}
        </Small>
      </View>
      <Switch
        value={item.enabled}
        disabled={busy}
        onValueChange={onToggle}
        trackColor={{ false: palette.line, true: palette.primary }}
        thumbColor={item.enabled ? palette.primaryContrast : palette.card}
        accessibilityLabel={`${item.name}: ${item.enabled ? "on" : "off"}`}
      />
    </View>
  );
}

function flowTone(status: FlowListItem["status"], palette: ReturnType<typeof useTheme>["palette"]) {
  if (status === "ACTIVE") return { fg: palette.successStrong, bg: palette.successSoft };
  if (status === "PAUSED") return { fg: palette.warningStrong, bg: palette.warningSoft };
  return { fg: palette.inkSecondary, bg: palette.surface };
}

function UpdatePanel({ title, panel }: { title: string; panel: UpdateEmailPanel }) {
  const { palette } = useTheme();
  const release = panel.release;
  return (
    <View style={{ paddingVertical: 8 }}>
      <Small color={palette.ink} style={{ fontWeight: "600" }}>
        {title}
      </Small>
      <Small color={palette.inkSecondary}>
        {release
          ? `Latest ${release.version} · ${release.sendRequestedAt ? `sent ${timeAgo(release.sendRequestedAt)}` : "not sent yet"}`
          : `No release recorded yet · next would be ${panel.suggestedVersion}`}
      </Small>
      <Small color={palette.inkFaint} style={{ fontSize: 11.5 }}>
        {panel.total} in use · {panel.outdated} on an older version · {panel.notified} notified · {panel.waiting} waiting
      </Small>
    </View>
  );
}

export default function AutomationsScreen() {
  const { palette } = useTheme();
  const { data, error, loading, refreshing, refresh, reload } = useLive(api.automations, [], { interval: 0 });
  // Optimistic switches: the new value shows at once, and goes back if the
  // server says no.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const header = <Stack.Screen options={{ title: "Automations" }} />;

  if (loading && !data) {
    return (
      <Screen title="Automations">
        {header}
        <LoadingState />
      </Screen>
    );
  }
  if (error && !data) {
    return (
      <Screen title="Automations">
        {header}
        <ErrorState message={error.message} onRetry={reload} />
      </Screen>
    );
  }
  if (!data) return null;

  async function toggleAutomation(item: AutomationItem, enabled: boolean) {
    setBusy(item.key);
    setPending((p) => ({ ...p, [item.key]: enabled }));
    try {
      await api.setAutomationEnabled(item.key, enabled);
      await reload();
    } catch (err) {
      Alert.alert("Could not change it", errorMessage(err));
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[item.key];
        return next;
      });
      setBusy(null);
    }
  }

  async function toggleFlow(flow: FlowListItem) {
    const next = flow.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setBusy(flow.id);
    try {
      await api.setFlowStatus(flow.id, next);
      await reload();
    } catch (err) {
      Alert.alert(
        next === "ACTIVE" ? "Could not turn it on" : "Could not pause it",
        `${errorMessage(err)}${next === "ACTIVE" ? " Open the flow on the website to fix it." : ""}`,
      );
    } finally {
      setBusy(null);
    }
  }

  const enabledCount = data.automations.filter((a) => a.enabled).length;

  return (
    <Screen
      title="Automations"
      subtitle={`${enabledCount} of ${data.automations.length} emails on`}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {header}

      {!data.ready ? (
        <Card style={{ marginBottom: 14 }}>
          <Small color={palette.warningStrong}>
            Settings cannot be saved yet: run the email_automation migration on the server first.
          </Small>
        </Card>
      ) : null}

      {data.unsubscribes ? (
        <Card style={{ marginBottom: 14 }}>
          <KeyRow
            label="Unsubscribed from optional emails"
            value={data.unsubscribes.total}
            note={`${data.unsubscribes.last30d} in the last 30 days`}
          />
        </Card>
      ) : null}

      {GROUPS.map((group) => {
        const items = data.automations.filter((a) => a.group === group);
        if (items.length === 0) return null;
        return (
          <Card key={group} style={{ marginBottom: 14 }}>
            <CardTitle style={{ marginBottom: 4 }}>{group}</CardTitle>
            {items.map((item, i) => (
              <View key={item.key}>
                {i > 0 ? <Divider /> : null}
                <AutomationRow
                  item={{ ...item, enabled: pending[item.key] ?? item.enabled }}
                  busy={busy !== null || !data.ready}
                  onToggle={(v) => void toggleAutomation(item, v)}
                />
              </View>
            ))}
          </Card>
        );
      })}

      <Card style={{ marginBottom: 14 }}>
        <CardTitle style={{ marginBottom: 4 }}>Flows</CardTitle>
        {data.systemFlows.map((f, i) => (
          <View key={f.id}>
            {i > 0 ? <Divider /> : null}
            <KeyRow label={f.name} note={`Built in · ${f.triggerLabel}`} value={`${f.sent30d} sent`} />
          </View>
        ))}
        {!data.flowsReady ? (
          <Small color={palette.inkSecondary} style={{ marginTop: 8 }}>
            Custom flows need the automation_flows migration on the server.
          </Small>
        ) : (
          data.flows.map((f) => {
            const tone = flowTone(f.status, palette);
            return (
              <View key={f.id}>
                <Divider />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Small color={palette.ink} style={{ fontWeight: "600", flexShrink: 1 }} numberOfLines={1}>
                        {f.name}
                      </Small>
                      <Chip label={f.status.toLowerCase()} fg={tone.fg} bg={tone.bg} />
                    </View>
                    <Small color={palette.inkFaint} style={{ fontSize: 11.5 }}>
                      {f.steps} steps · {f.sent} sent · {f.runs.active} in progress · {f.runs.completed} finished
                    </Small>
                  </View>
                  <Switch
                    value={f.status === "ACTIVE"}
                    disabled={busy !== null}
                    onValueChange={() => void toggleFlow(f)}
                    trackColor={{ false: palette.line, true: palette.primary }}
                    thumbColor={f.status === "ACTIVE" ? palette.primaryContrast : palette.card}
                    accessibilityLabel={`${f.name}: ${f.status === "ACTIVE" ? "on" : "off"}`}
                  />
                </View>
              </View>
            );
          })
        )}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <CardTitle style={{ marginBottom: 2 }}>Update emails</CardTitle>
        <UpdatePanel title="WordPress plugin" panel={data.updates.plugin} />
        <Divider />
        <UpdatePanel title="Android app" panel={data.updates.app} />
      </Card>

      <Small color={palette.inkSecondary}>
        Switch emails and flows on or off here. To change wording, timing or flow steps, or to send
        update emails, use Automations on mykavo.app.
      </Small>
    </Screen>
  );
}
