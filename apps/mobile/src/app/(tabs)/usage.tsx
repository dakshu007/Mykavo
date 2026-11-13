/**
 * Command Center - the operator's live view of all of MyKavo on one screen:
 * what needs attention, money, people, the scanner, AI, WordPress, email and
 * push, plus a live feed of what just happened. Refreshes every 20 seconds
 * while open and paints the last reading instantly from cache.
 *
 * Operator-only. The tab (route name kept as "usage" so links and tests stay
 * stable) is hidden for everyone else, and /api/mobile/admin/pulse answers
 * 404 independently, so hiding it is convenience, not the boundary.
 */

import * as Haptics from "expo-haptics";
import { useRouter, type Href } from "expo-router";
import {
  Activity,
  ChevronRight,
  CircleCheck,
  CreditCard,
  Gauge,
  Globe,
  Info,
  LifeBuoy,
  MailQuestion,
  Megaphone,
  OctagonAlert,
  PenLine,
  Search,
  Send,
  ServerCrash,
  Smartphone,
  Sparkles,
  TriangleAlert,
  UserPlus,
  Users,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Pressable, Switch, Text, View } from "react-native";

import { Bar, Chip } from "@/components/admin";
import { Screen } from "@/components/screen";
import { Card, CardTitle, Divider, ErrorState, LoadingState, MicroLabel, Small, StatTile } from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useLive } from "@/lib/live";
import { fonts, radius, type FxPalette } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import type { AdminPulse, PulseAlertLevel, PulseFeedItem } from "@/lib/types";

const money = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`);

function levelTone(p: FxPalette, level: PulseAlertLevel): { fg: string; bg: string; Icon: LucideIcon } {
  if (level === "critical") return { fg: p.criticalStrong, bg: p.criticalSoft, Icon: OctagonAlert };
  if (level === "warning") return { fg: p.warningStrong, bg: p.warningSoft, Icon: TriangleAlert };
  return { fg: p.info, bg: p.infoSoft, Icon: Info };
}

const FEED_ICON: Record<PulseFeedItem["kind"], LucideIcon> = {
  signup: UserPlus,
  payment: CreditCard,
  scan_failed: ServerCrash,
  change: Zap,
  ai_post: Sparkles,
  wp_draft: Send,
  app_request: Smartphone,
  service: LifeBuoy,
  support: LifeBuoy,
};

/** "Live" dot + seconds since the last reading, ticking without refetching. */
function LiveBadge({ at, stale }: { at: string; stale: boolean }) {
  const { palette } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.round((now - new Date(at).getTime()) / 1000));
  const color = stale ? palette.warning : palette.success;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: stale ? palette.warningSoft : palette.successSoft,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12, color: stale ? palette.warningStrong : palette.successStrong }}>
        {stale ? "Offline copy" : secs < 10 ? "Live" : `${secs < 60 ? `${secs}s` : `${Math.round(secs / 60)}m`} ago`}
      </Text>
    </View>
  );
}

function SectionHead({ icon: Icon, title, right }: { icon: LucideIcon; title: string; right?: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <Icon size={16} color={palette.ink} strokeWidth={2.2} />
      <CardTitle style={{ flex: 1 }}>{title}</CardTitle>
      {right}
    </View>
  );
}

/** Label + big number, used in the dense rows inside cards. */
function Figure({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 20, lineHeight: 26, color: tone ?? palette.ink }}>{value}</Text>
      <Small color={palette.inkSecondary} style={{ fontSize: 12 }} numberOfLines={1}>
        {label}
      </Small>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 12, paddingVertical: 8 }}>{children}</View>;
}

/** Fourteen thin bars: signups per day, today on the right. */
function Spark({ values }: { values: number[] }) {
  const { palette } = useTheme();
  const max = Math.max(1, ...values);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 54, marginTop: 8 }}>
      {values.map((v, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(3, (v / max) * 54),
            borderRadius: 3,
            backgroundColor: i === values.length - 1 ? palette.primary : v > 0 ? palette.chartGold : palette.surface,
          }}
        />
      ))}
    </View>
  );
}

function Alerts({ pulse }: { pulse: AdminPulse }) {
  const { palette } = useTheme();
  if (pulse.alerts.length === 0) {
    return (
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.successSoft, alignItems: "center", justifyContent: "center" }}>
          <CircleCheck size={22} color={palette.successStrong} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <CardTitle>All systems calm</CardTitle>
          <Small color={palette.inkSecondary}>Nothing needs you right now.</Small>
        </View>
      </Card>
    );
  }
  return (
    <Card>
      <SectionHead icon={TriangleAlert} title="Needs you" right={<Chip label={String(pulse.alerts.length)} fg={palette.inkInverse} bg={palette.ink} />} />
      {pulse.alerts.map((a, i) => {
        const t = levelTone(palette, a.level);
        return (
          <View key={`${a.title}-${i}`}>
            {i > 0 ? <Divider /> : null}
            <View style={{ flexDirection: "row", gap: 12, paddingVertical: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
                <t.Icon size={17} color={t.fg} strokeWidth={2.3} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Small color={palette.ink} style={{ fontFamily: fonts.bodySemiBold }}>
                  {a.title}
                </Small>
                <Small color={palette.inkSecondary} style={{ fontSize: 12 }}>
                  {a.detail}
                </Small>
              </View>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function AiCard({ pulse, onToggled }: { pulse: AdminPulse; onToggled: () => void }) {
  const { palette } = useTheme();
  const [saving, setSaving] = useState(false);
  const ai = pulse.ai;

  function toggle(next: boolean) {
    const run = async () => {
      setSaving(true);
      try {
        await api.setAiPaused(!next);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        onToggled();
      } catch (err) {
        Alert.alert("Not saved", err instanceof Error ? err.message : "Try again.");
      } finally {
        setSaving(false);
      }
    };
    if (next) {
      void run();
      return;
    }
    Alert.alert("Pause all AI?", "Explanations, weekly notes and the AI Writer stop for everyone. Monitoring keeps running.", [
      { text: "Cancel", style: "cancel" },
      { text: "Pause AI", style: "destructive", onPress: () => void run() },
    ]);
  }

  return (
    <Card>
      <SectionHead
        icon={Sparkles}
        title="AI"
        right={
          ai.configured ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Small color={ai.paused ? palette.warningStrong : palette.successStrong} style={{ fontFamily: fonts.bodySemiBold }}>
                {ai.paused ? "Paused" : "Running"}
              </Small>
              <Switch
                value={!ai.paused}
                disabled={saving}
                onValueChange={toggle}
                trackColor={{ false: palette.line, true: palette.success }}
                thumbColor="#ffffff"
                accessibilityLabel="AI running"
              />
            </View>
          ) : (
            <Chip label="Not configured" fg={palette.inkSecondary} bg={palette.surface} />
          )
        }
      />
      <Row>
        <Figure label="Spent today" value={money(ai.spentTodayUsd)} />
        <Figure label="Posts today" value={ai.posts24h} />
        <Figure label="Posts ever" value={ai.postsTotal} />
      </Row>
      <Row>
        <Figure label="Jobs running" value={ai.jobs24h.running + ai.jobs24h.queued} />
        <Figure label="Done today" value={ai.jobs24h.done} />
        <Figure label="Failed today" value={ai.jobs24h.failed} tone={ai.jobs24h.failed > 0 ? palette.criticalStrong : undefined} />
      </Row>
      {ai.pools.map((pool) => (
        <View key={pool.label} style={{ gap: 6, paddingTop: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Small color={palette.ink}>{pool.label}</Small>
            <Small color={palette.inkSecondary}>
              {money(pool.spentUsd)} {pool.capUsd > 0 ? `of ${money(pool.capUsd)}` : "· no cap"}
            </Small>
          </View>
          {pool.capUsd > 0 ? (
            <Bar
              value={pool.spentUsd}
              max={pool.capUsd}
              color={pool.spentUsd / pool.capUsd >= 0.8 ? palette.criticalStrong : palette.successStrong}
            />
          ) : null}
        </View>
      ))}
      <Small color={palette.inkFaint} style={{ fontSize: 11.5, marginTop: 10 }}>
        AI Writer open to: {ai.rollout === "everyone" ? "everyone" : ai.rollout === "beta" ? "beta list" : "admins only"}
      </Small>
      {ai.recentFailures.length > 0 ? (
        <>
          <Divider style={{ marginTop: 10 }} />
          {ai.recentFailures.map((f) => (
            <View key={f.id} style={{ paddingVertical: 8, gap: 2 }}>
              <Small color={palette.criticalStrong} style={{ fontFamily: fonts.bodySemiBold, fontSize: 12 }}>
                {f.kind} failed · {timeAgo(f.at)}
              </Small>
              <Small color={palette.inkSecondary} style={{ fontSize: 12 }} numberOfLines={2}>
                {f.error}
              </Small>
            </View>
          ))}
        </>
      ) : null}
    </Card>
  );
}

function Feed({ items }: { items: PulseFeedItem[] }) {
  const { palette } = useTheme();
  if (items.length === 0) return null;
  return (
    <Card>
      <SectionHead icon={Activity} title="Live feed" />
      {items.map((item, i) => {
        const Icon = FEED_ICON[item.kind];
        const color = item.tone === "good" ? palette.successStrong : item.tone === "bad" ? palette.criticalStrong : palette.inkSecondary;
        const bg = item.tone === "good" ? palette.successSoft : item.tone === "bad" ? palette.criticalSoft : palette.surface;
        return (
          <View key={item.id} style={{ flexDirection: "row", gap: 12 }}>
            {/* The timeline rail: icon on top, a thin line down to the next one. */}
            <View style={{ alignItems: "center", width: 30 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginTop: 6 }}>
                <Icon size={15} color={color} strokeWidth={2.3} />
              </View>
              {i < items.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: palette.line, marginTop: 4 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingVertical: 8, gap: 1 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Small color={palette.ink} style={{ flex: 1, fontFamily: fonts.bodySemiBold }} numberOfLines={1}>
                  {item.title}
                </Small>
                <Small color={palette.inkFaint} style={{ fontSize: 11.5 }}>
                  {timeAgo(item.at)}
                </Small>
              </View>
              <Small color={palette.inkSecondary} style={{ fontSize: 12 }} numberOfLines={1}>
                {item.detail}
              </Small>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function Shortcut({ icon: Icon, title, badge, href }: { icon: LucideIcon; title: string; badge?: number; href: Href }) {
  const { palette } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(href)}
      style={({ pressed }) => ({
        width: "48%",
        flexGrow: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 14,
        borderRadius: radius.tile,
        backgroundColor: palette.card,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Icon size={18} color={palette.ink} strokeWidth={2} />
      <Small color={palette.ink} style={{ flex: 1, fontFamily: fonts.bodyMedium }} numberOfLines={1}>
        {title}
      </Small>
      {badge ? <Chip label={String(badge)} fg={palette.primaryContrast} bg={palette.primary} /> : <ChevronRight size={16} color={palette.inkFaint} />}
    </Pressable>
  );
}

export default function CommandCenterScreen() {
  const { palette } = useTheme();
  const { data, error, loading, refreshing, refresh, reload } = useLive(api.pulse, [], { interval: 20000, cache: "pulse" });

  if (loading && !data) {
    return (
      <Screen title="Command Center">
        <LoadingState />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen title="Command Center">
        <ErrorState message={error?.message ?? "Could not load the Command Center."} onRetry={reload} />
      </Screen>
    );
  }

  const p = data;
  const scanOk = p.scans.completed24h + p.scans.partial24h;
  const sev = p.monitoring.changes24h;
  const worker =
    p.worker.state === "healthy"
      ? { label: "Healthy", fg: palette.successStrong, bg: palette.successSoft }
      : p.worker.state === "stale"
        ? { label: "Late", fg: palette.warningStrong, bg: palette.warningSoft }
        : p.worker.state === "down"
          ? { label: "Down", fg: palette.criticalStrong, bg: palette.criticalSoft }
          : { label: "Unknown", fg: palette.inkSecondary, bg: palette.surface };

  return (
    <Screen
      title="Command Center"
      subtitle="All of MyKavo, live"
      headerRight={<LiveBadge at={p.generatedAt} stale={Boolean(error)} />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <Alerts pulse={p} />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatTile label="MRR" value={money(p.revenue.mrrUsd)} gradient={palette.gradientMint} caption={<Small>{p.revenue.paying} paying</Small>} />
        <StatTile label="Online now" value={p.users.online} gradient={palette.gradientCoral} caption={<Small>{p.users.activeToday} active today</Small>} />
      </View>

      <Card>
        <SectionHead icon={Users} title="People" right={<Small color={palette.inkSecondary}>{p.users.total} accounts</Small>} />
        <Row>
          <Figure label="Signups today" value={p.users.today} tone={p.users.today > 0 ? palette.successStrong : undefined} />
          <Figure label="This week" value={p.users.week} />
          <Figure label="Trials live" value={p.revenue.trials} />
        </Row>
        <MicroLabel>Signups, last 14 days</MicroLabel>
        <Spark values={p.users.signups14d} />
      </Card>

      <Card>
        <SectionHead icon={CreditCard} title="Revenue" right={<Small color={palette.inkSecondary}>{money(p.revenue.mrrUsd)}/mo</Small>} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 6 }}>
          {p.revenue.byPlan.length === 0 ? <Small color={palette.inkSecondary}>No paying workspaces yet.</Small> : null}
          {p.revenue.byPlan.map((b) => (
            <Chip key={b.plan} label={`${b.plan} · ${b.count}`} fg={palette.ink} bg={palette.surface} />
          ))}
        </View>
        <Row>
          <Figure label="On hold" value={p.revenue.onHold} tone={p.revenue.onHold > 0 ? palette.warningStrong : undefined} />
          <Figure label="Cancelling" value={p.revenue.cancelling} tone={p.revenue.cancelling > 0 ? palette.warningStrong : undefined} />
          <Figure label="Paying" value={p.revenue.paying} />
        </Row>
      </Card>

      <Card>
        <SectionHead icon={Gauge} title="Scanner" right={<Chip label={worker.label} fg={worker.fg} bg={worker.bg} />} />
        <Small color={palette.inkSecondary} style={{ fontSize: 12 }}>
          {p.worker.minutesAgo !== null ? `Last health check ${p.worker.minutesAgo} min ago. ` : ""}
          {p.worker.detail}
        </Small>
        <Row>
          <Figure label="Scans today" value={p.scans.total24h} />
          <Figure label="Failed" value={p.scans.failed24h} tone={p.scans.failed24h > 0 ? palette.criticalStrong : undefined} />
          <Figure label="Avg time" value={p.scans.avgSeconds === null ? "-" : `${p.scans.avgSeconds}s`} />
        </Row>
        {p.scans.total24h > 0 ? (
          <Bar value={scanOk} max={p.scans.total24h} color={p.scans.failed24h / p.scans.total24h > 0.2 ? palette.criticalStrong : palette.successStrong} />
        ) : null}
        <Small color={palette.inkFaint} style={{ fontSize: 11.5, marginTop: 6 }}>
          {p.scans.running} running · {p.scans.queued} queued
        </Small>
        {p.scans.recentFailures.length > 0 ? (
          <>
            <Divider style={{ marginTop: 10 }} />
            {p.scans.recentFailures.map((f) => (
              <View key={f.id} style={{ flexDirection: "row", gap: 8, paddingVertical: 7 }}>
                <Small color={palette.ink} style={{ flex: 1 }} numberOfLines={1}>
                  {f.website}
                </Small>
                <Small color={palette.criticalStrong} style={{ fontSize: 12 }} numberOfLines={1}>
                  {f.error}
                </Small>
                <Small color={palette.inkFaint} style={{ fontSize: 11.5 }}>
                  {timeAgo(f.at)}
                </Small>
              </View>
            ))}
          </>
        ) : null}
      </Card>

      <Card>
        <SectionHead icon={Globe} title="Monitoring" right={<Small color={palette.inkSecondary}>{p.monitoring.pages} pages</Small>} />
        <Row>
          <Figure label="Websites" value={p.monitoring.websites} />
          <Figure label="Active" value={p.monitoring.active} />
          <Figure label="Errored" value={p.monitoring.errored} tone={p.monitoring.errored > 0 ? palette.warningStrong : undefined} />
          <Figure label="Down now" value={p.monitoring.openIncidents} tone={p.monitoring.openIncidents > 0 ? palette.criticalStrong : undefined} />
        </Row>
        <MicroLabel>Changes found today</MicroLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          <Chip label={`Critical ${sev.critical}`} fg={palette.criticalStrong} bg={palette.criticalSoft} />
          <Chip label={`High ${sev.high}`} fg={palette.orangeStrong} bg={palette.orangeSoft} />
          <Chip label={`Medium ${sev.medium}`} fg={palette.warningStrong} bg={palette.warningSoft} />
          <Chip label={`Low ${sev.low}`} fg={palette.inkSecondary} bg={palette.surface} />
          <Chip label={`Info ${sev.info}`} fg={palette.inkSecondary} bg={palette.surface} />
        </View>
      </Card>

      <AiCard pulse={p} onToggled={() => void reload()} />

      <Card>
        <SectionHead icon={PenLine} title="WordPress" right={<Small color={palette.inkSecondary}>{p.wordpress.connected} sites</Small>} />
        <Row>
          <Figure label="Drafts today" value={p.wordpress.drafts24h} />
          <Figure label="Waiting" value={p.wordpress.draftsQueued} />
          <Figure label="Stuck" value={p.wordpress.draftsStuck} tone={p.wordpress.draftsStuck > 0 ? palette.warningStrong : undefined} />
          <Figure label="Failed" value={p.wordpress.draftsFailed24h} tone={p.wordpress.draftsFailed24h > 0 ? palette.criticalStrong : undefined} />
        </Row>
        {p.wordpress.versions.length > 0 ? (
          <>
            <MicroLabel>Plugin versions in use</MicroLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {p.wordpress.versions.map((v) => (
                <Chip key={v.version} label={`${v.version} · ${v.count}`} fg={palette.ink} bg={palette.surface} />
              ))}
            </View>
          </>
        ) : null}
      </Card>

      <Card>
        <SectionHead icon={Send} title="Email and push" />
        <Row>
          <Figure label="Emails today" value={p.channels.email24h} />
          <Figure label="Failed" value={p.channels.emailFailed24h} tone={p.channels.emailFailed24h > 0 ? palette.criticalStrong : undefined} />
          <Figure label="Phones" value={p.channels.pushDevices} />
        </Row>
        {p.channels.appVersions.length > 0 ? (
          <>
            <MicroLabel>App versions this week</MicroLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {p.channels.appVersions.map((v) => (
                <Chip key={v.version} label={`${v.version} · ${v.count}`} fg={palette.ink} bg={palette.surface} />
              ))}
            </View>
          </>
        ) : null}
      </Card>

      <Feed items={p.feed} />

      <View style={{ gap: 8 }}>
        <MicroLabel>Go to</MicroLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <Shortcut icon={Users} title="Users" href="/users" />
          <Shortcut icon={Activity} title="Tracking" href="/tracking" />
          <Shortcut icon={MailQuestion} title="App requests" href="/app-requests" badge={p.inbox.appRequestsPending} />
          <Shortcut icon={Workflow} title="Automations" href="/automations" />
          <Shortcut icon={Megaphone} title="Email marketing" href="/email-marketing" />
          <Shortcut icon={PenLine} title="Blog" href="/blog" />
          <Shortcut icon={Search} title="Search Console" href="/search-console" />
          <Shortcut icon={Gauge} title="Infrastructure" href="/infrastructure" />
        </View>
      </View>

      <Small color={palette.inkFaint} style={{ textAlign: "center", fontSize: 11.5 }}>
        {p.inbox.serviceRequests7d} help requests this week · {p.inbox.support24h} support questions today
      </Small>
    </Screen>
  );
}
