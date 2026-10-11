/**
 * Email marketing - Brevo setup, 30-day results, audiences, campaigns and
 * contact syncs: the web Email marketing page, on the phone. "Sync now" uses
 * the website's own route. Writing and sending campaigns stays on the
 * website, where there is room to compose and preview them.
 * Operator-only, reached from Settings > Admin.
 */

import { Stack } from "expo-router";
import { CircleCheck, CircleDashed, CircleX } from "lucide-react-native";
import { useState } from "react";
import { Alert, View } from "react-native";

import { Chip, KeyRow, share } from "@/components/admin";
import { Screen } from "@/components/screen";
import {
  Button,
  Card,
  CardTitle,
  Divider,
  ErrorState,
  LoadingState,
  Small,
  StatTile,
} from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/format";
import { useLive } from "@/lib/live";
import { useTheme } from "@/lib/theme-context";
import type { MarketingResponse } from "@/lib/types";

const CHECKS: { key: keyof MarketingResponse["checks"]; label: string }[] = [
  { key: "apiKey", label: "Brevo API key" },
  { key: "senderEmail", label: "Sender email" },
  { key: "senderVerified", label: "Sender verified in Brevo" },
  { key: "domainAuthenticated", label: "Domain authenticated" },
  { key: "migration", label: "Database migration" },
  { key: "synced", label: "Contacts synced" },
];

function CheckIcon({ value }: { value: boolean | null }) {
  const { palette } = useTheme();
  if (value === true) return <CircleCheck size={16} color={palette.success} />;
  if (value === false) return <CircleX size={16} color={palette.critical} />;
  return <CircleDashed size={16} color={palette.inkFaint} />;
}

export default function EmailMarketingScreen() {
  const { palette } = useTheme();
  const { data, error, loading, refreshing, refresh, reload } = useLive(api.marketing, [], { interval: 0 });
  const [syncing, setSyncing] = useState(false);

  const header = <Stack.Screen options={{ title: "Email marketing" }} />;

  if (loading && !data) {
    return (
      <Screen title="Email marketing">
        {header}
        <LoadingState />
      </Screen>
    );
  }
  if (error && !data) {
    return (
      <Screen title="Email marketing">
        {header}
        <ErrorState message={error.message} onRetry={reload} />
      </Screen>
    );
  }
  if (!data) return null;

  async function syncNow() {
    setSyncing(true);
    try {
      await api.syncMarketing();
      await reload();
    } catch (err) {
      Alert.alert("Sync failed", err instanceof ApiError || err instanceof Error ? err.message : "Try again.");
    } finally {
      setSyncing(false);
    }
  }

  const r = data.report;
  const errors = Object.entries(data.errors).filter(([, v]) => Boolean(v));

  return (
    <Screen
      title="Email marketing"
      subtitle={`${data.provider === "brevo" ? "Brevo" : "Resend"} · ${data.mykavo.accounts} contacts`}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {header}

      {errors.length > 0 ? (
        <Card style={{ marginBottom: 14 }}>
          <CardTitle color={palette.criticalStrong} style={{ marginBottom: 4 }}>
            Brevo did not answer everything
          </CardTitle>
          {errors.map(([part, message]) => (
            <Small key={part} color={palette.inkSecondary}>
              {part}: {message}
            </Small>
          ))}
        </Card>
      ) : null}

      <Card style={{ marginBottom: 14 }}>
        <CardTitle style={{ marginBottom: 2 }}>Setup</CardTitle>
        <Small color={palette.inkSecondary}>
          Sender: {data.sender.name} &lt;{data.sender.email}&gt;
          {data.forcedResend ? " · sending through Resend (Brevo switched off)" : ""}
        </Small>
        {CHECKS.map((c) => (
          <View key={c.key}>
            <Divider style={{ marginTop: 8 }} />
            <KeyRow label={c.label} value={<CheckIcon value={data.checks[c.key]} />} />
          </View>
        ))}
        {data.account ? (
          <>
            <Divider />
            <KeyRow
              label="Brevo plan"
              value={data.account.plan}
              note={data.account.creditsLeft !== null ? `${data.account.creditsLeft} email credits left` : null}
            />
          </>
        ) : null}
      </Card>

      {r ? (
        <>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            <StatTile label="Sent, 30 days" value={r.requests} />
            <StatTile label="Delivered" value={share(r.delivered, r.requests)} />
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <StatTile label="Opened" value={share(r.uniqueOpens, r.delivered)} />
            <StatTile label="Clicked" value={share(r.uniqueClicks, r.delivered)} />
          </View>
          <Card style={{ marginBottom: 14 }}>
            <KeyRow label="Unsubscribed" value={r.unsubscribed} />
            <Divider />
            <KeyRow label="Spam reports" value={r.spamReports} />
            <Divider />
            <KeyRow label="Bounced" value={r.hardBounces + r.softBounces} note={`${r.hardBounces} hard · ${r.softBounces} soft`} />
            <Divider />
            <KeyRow label="Opted out of MyKavo emails" value={data.mykavo.optedOut} />
          </Card>
        </>
      ) : null}

      {data.audiences && data.audiences.length > 0 ? (
        <Card style={{ marginBottom: 14 }}>
          <CardTitle style={{ marginBottom: 4 }}>Audiences</CardTitle>
          {data.audiences.map((a, i) => (
            <View key={a.key}>
              {i > 0 ? <Divider /> : null}
              <KeyRow label={a.name} note={a.description} value={a.subscribers} />
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={{ marginBottom: 14 }}>
        <CardTitle style={{ marginBottom: 4 }}>Campaigns</CardTitle>
        {data.campaigns.length === 0 ? (
          <Small color={palette.inkSecondary}>No campaigns in the last 30 days.</Small>
        ) : (
          data.campaigns.map((c, i) => (
            <View key={c.id}>
              {i > 0 ? <Divider /> : null}
              <View style={{ paddingVertical: 10, gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Small color={palette.ink} style={{ fontWeight: "600", flexShrink: 1 }} numberOfLines={1}>
                    {c.name}
                  </Small>
                  <Chip
                    label={c.status}
                    fg={c.status === "sent" ? palette.successStrong : palette.inkSecondary}
                    bg={c.status === "sent" ? palette.successSoft : palette.surface}
                  />
                </View>
                {c.subject ? (
                  <Small color={palette.inkSecondary} numberOfLines={1}>
                    {c.subject}
                  </Small>
                ) : null}
                <Small color={palette.inkFaint} style={{ fontSize: 11.5 }}>
                  {c.stats
                    ? `${c.stats.sent} sent · ${share(c.stats.uniqueViews, c.stats.delivered)} opened · ${share(c.stats.uniqueClicks, c.stats.delivered)} clicked`
                    : c.scheduledAt
                      ? `Scheduled for ${formatDateTime(c.scheduledAt)}`
                      : `Created ${timeAgo(c.createdAt)}`}
                </Small>
              </View>
            </View>
          ))
        )}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <CardTitle style={{ marginBottom: 4 }}>Contact sync</CardTitle>
        {data.syncs.length === 0 ? (
          <Small color={palette.inkSecondary}>No syncs yet.</Small>
        ) : (
          data.syncs.map((s, i) => (
            <View key={s.id}>
              {i > 0 ? <Divider /> : null}
              <KeyRow
                label={`${s.kind === "full" ? "Full" : "Incremental"} sync · ${timeAgo(s.startedAt)}`}
                note={s.error ?? `${s.contacts} contacts`}
                value={
                  <Chip
                    label={s.status.toLowerCase()}
                    fg={s.error ? palette.criticalStrong : palette.successStrong}
                    bg={s.error ? palette.criticalSoft : palette.successSoft}
                  />
                }
              />
            </View>
          ))
        )}
        <View style={{ marginTop: 12 }}>
          <Button
            title="Sync now"
            variant="secondary"
            size="sm"
            loading={syncing}
            disabled={!data.configured}
            onPress={() => void syncNow()}
          />
        </View>
      </Card>

      <Small color={palette.inkSecondary}>
        Write, schedule and send campaigns from Email marketing on mykavo.app.
      </Small>
    </Screen>
  );
}
