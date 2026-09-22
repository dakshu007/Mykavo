/**
 * Website detail - mobile counterpart of the web dashboard's
 * /dashboard/websites/[id] page: header + run-scan action, stat tiles,
 * health, incidents, recent scans, monitored pages, mute controls and the
 * pause/resume danger zone. Polls fast while a scan is in flight.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarClock, ChevronLeft, ChevronRight, Layers } from "lucide-react-native";
import { Fragment, useState, type ReactNode } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { HealthDot, ScanStatusBadge, WebsiteStatusBadge } from "@/components/badges";
import { Screen } from "@/components/screen";
import {
  Body,
  Button,
  Card,
  CardTitle,
  Divider,
  MicroLabel,
  ErrorState,
  Heading,
  LoadingState,
  Mono,
  Small,
  StatTile,
} from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import {
  formatDateTime,
  formatMs,
  formatPercent,
  hostOf,
  isInFuture,
  pathOf,
  timeAgo,
} from "@/lib/format";
import { activeInterval, useLive } from "@/lib/live";
import { fonts, radius } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import type { DomainRegistrationInfo, ExpiryUrgency, StackInfo } from "@/lib/types";

/** Small filled chip - local helper for baseline/incident/off markers. */
function Chip({ label, bg, color }: { label: string; bg: string; color: string }) {
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

/** Label-left / value-right row used by the Health card. */
function KeyRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingVertical: 12,
      }}
    >
      <Small>{label}</Small>
      {value}
    </View>
  );
}

/* --------------------------- domain expiry -------------------------------- */

/** Why a registry lookup failed, without blaming the user. */
const DOMAIN_ERROR_COPY: Record<string, string> = {
  NO_REGISTRABLE_DOMAIN: "This address has no public domain registration to check.",
  NOT_FOUND: "The registry has no record for this domain.",
  RATE_LIMITED: "The registry rate-limited us. MyKavo will retry on the next sweep.",
  UNSUPPORTED_TLD: "This domain's registry does not publish expiry data.",
  BLOCKED_URL: "The registry lookup was blocked by MyKavo's request guard.",
  LOOKUP_FAILED: "The registry could not be reached.",
};

const URGENCY_LABEL: Record<ExpiryUrgency, string> = {
  expired: "Expired",
  critical: "Renew now",
  warning: "Renew soon",
  notice: "Coming up",
  ok: "In good standing",
};

/**
 * When does this domain expire?
 *
 * An expired domain takes the site AND every email address on it down at once,
 * and unlike an outage nobody gets paged - the renewal notice went to an inbox
 * someone left the agency with. Renders nothing until a lookup has actually
 * run, and says plainly when the registry could not be read rather than
 * implying the domain is fine.
 */
function DomainExpiryCard({ domain }: { domain: DomainRegistrationInfo | undefined }) {
  const { palette } = useTheme();

  // `domain` is absent entirely when the backend predates this feature - the
  // app ships independently of the server, so a new build WILL meet an old
  // one. Nothing to show until the weekly sweep has reached this site either.
  if (!domain?.checkedAt) return null;

  const tone: Record<ExpiryUrgency, { bg: string; text: string }> = {
    expired: { bg: palette.criticalSoft, text: palette.criticalStrong },
    critical: { bg: palette.criticalSoft, text: palette.criticalStrong },
    warning: { bg: palette.warningSoft, text: palette.warningStrong },
    notice: { bg: palette.primarySoft, text: palette.accent },
    ok: { bg: palette.successSoft, text: palette.successStrong },
  };

  // An unknown or missing urgency must not index into the maps below and
  // return undefined - that is the same crash one level down.
  const urgency: ExpiryUrgency =
    domain.urgency && domain.urgency in URGENCY_LABEL ? domain.urgency : "ok";
  const blocking = domain.blockingStatuses ?? [];
  const failed = Boolean(domain.lookupError) || !domain.expiresAt;

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <CalendarClock size={17} color={palette.accent} />
        <CardTitle style={{ flex: 1 }}>Domain</CardTitle>
        {!failed ? (
          <Chip
            label={URGENCY_LABEL[urgency]}
            bg={tone[urgency].bg}
            color={tone[urgency].text}
          />
        ) : null}
      </View>

      {failed ? (
        <Small>
          {domain.lookupError
            ? (DOMAIN_ERROR_COPY[domain.lookupError] ??
              "The registry lookup did not return an expiry date.")
            : "The registry did not publish an expiry date for this domain."}
        </Small>
      ) : (
        <>
          <View style={{ gap: 2, marginBottom: 4 }}>
            <MicroLabel>Expires</MicroLabel>
            <Text
              style={{
                fontFamily: fonts.bodySemiBold,
                fontSize: 22,
                lineHeight: 28,
                color: palette.ink,
              }}
            >
              {typeof domain.daysRemaining === "number" && domain.daysRemaining >= 0
                ? `in ${domain.daysRemaining} day${domain.daysRemaining === 1 ? "" : "s"}`
                : "already passed"}
            </Text>
          </View>
          {domain.message ? <Small>{domain.message}</Small> : null}
          <Divider style={{ marginTop: 14 }} />
          <KeyRow
            label="Expiry date"
            value={
              <Mono color={palette.ink}>
                {domain.expiresAt ? formatDateTime(domain.expiresAt).split(",")[0] : "\u2014"}
              </Mono>
            }
          />
          {domain.registrar ? (
            <>
              <Divider />
              <KeyRow
                label="Registrar"
                value={
                  <Small color={palette.ink} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {domain.registrar}
                  </Small>
                }
              />
            </>
          ) : null}
          {domain.name ? (
            <>
              <Divider />
              <KeyRow label="Domain" value={<Mono color={palette.ink}>{domain.name}</Mono>} />
            </>
          ) : null}
          {blocking.length > 0 ? (
            <View
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: radius.field,
                backgroundColor: palette.warningSoft,
              }}
            >
              <Small color={palette.warningStrong}>
                The registry has a hold on this domain ({blocking.join(", ")}),
                which can block renewal or transfer.
              </Small>
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}

/* ----------------------------- detected stack ----------------------------- */

/**
 * What the site is built with, merged across its monitored pages.
 *
 * Plugins are enqueued per page - a checkout plugin only loads on /checkout -
 * so the homepage alone under-reports the site. The coverage line is
 * deliberately blunt: a number that contradicts what is listed is worse than
 * no number.
 */
function DetectedStackCard({ stack }: { stack: StackInfo }) {
  const { palette } = useTheme();
  // Same reasoning as DomainExpiryCard: a backend one deploy behind can send
  // the object without its arrays, and `.length` on undefined is a crash.
  const technologies = stack.technologies ?? [];
  const components = stack.components ?? [];
  if (technologies.length === 0 && components.length === 0) return null;

  const byCategory = new Map<string, typeof technologies>();
  for (const tech of technologies) {
    const list = byCategory.get(tech.category) ?? [];
    list.push(tech);
    byCategory.set(tech.category, list);
  }

  const unread = stack.assetsSeen - stack.assetsVersioned;

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Layers size={17} color={palette.accent} />
        <CardTitle style={{ flex: 1 }}>Detected stack</CardTitle>
        <Chip
          label={`${technologies.length}`}
          bg={palette.infoSoft}
          color={palette.info}
        />
      </View>

      {[...byCategory.entries()].map(([category, entries], i) => (
        <View key={category} style={{ marginTop: i === 0 ? 0 : 14, gap: 8 }}>
          <MicroLabel>{category.replace(/[-_]/g, " ")}</MicroLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {entries.map((tech) => (
              <Chip
                key={tech.slug}
                label={tech.version ? `${tech.name} ${tech.version}` : tech.name}
                bg={palette.surface}
                color={palette.ink}
              />
            ))}
          </View>
        </View>
      ))}

      {components.length > 0 ? (
        <View style={{ marginTop: 16, gap: 8 }}>
          <MicroLabel>
            {stack.platform === "wordpress" ? "WordPress components" : "Components"}
          </MicroLabel>
          {components.map((component, i) => (
            <Fragment key={`${component.kind}:${component.slug}`}>
              {i > 0 ? <Divider /> : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingVertical: 8,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Small color={palette.ink} numberOfLines={1}>
                    {component.name}
                  </Small>
                  <Small color={palette.inkFaint}>{component.kind}</Small>
                </View>
                <Mono color={palette.ink}>{component.version}</Mono>
              </View>
            </Fragment>
          ))}
        </View>
      ) : null}

      {stack.assetsSeen > 0 && unread > 0 ? (
        <Body style={{ marginTop: 14 }}>
          <Small color={palette.inkFaint}>
            Read from {stack.pagesRead} page{stack.pagesRead === 1 ? "" : "s"}.{" "}
            {unread} of {stack.assetsSeen} platform assets did not state a version, usually
            because a cache or CDN stripped it - those components are present but their
            versions are unknown.
          </Small>
        </Body>
      ) : null}
    </Card>
  );
}

const TRIGGER_LABELS: Record<"BASELINE" | "SCHEDULED" | "MANUAL", string> = {
  BASELINE: "Baseline",
  SCHEDULED: "Scheduled",
  MANUAL: "Manual",
};

export default function WebsiteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { palette } = useTheme();

  const [scanBusy, setScanBusy] = useState(false);
  const [alertsBusy, setAlertsBusy] = useState(false);
  const [pauseBusy, setPauseBusy] = useState(false);

  const { data, error, loading, refreshing, refresh, reload } = useLive(
    () => api.websiteDetail(id),
    [id],
    { interval: (d) => activeInterval(Boolean(d?.scanInProgress), 20000) },
  );

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/websites");
    }
  }

  async function runScan() {
    setScanBusy(true);
    try {
      const res = await api.runScan(id);
      router.push(`/scan/${res.scan.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.scanId) {
        router.push(`/scan/${err.scanId}`);
      } else {
        Alert.alert(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setScanBusy(false);
    }
    await reload();
  }

  async function mute(hours: 1 | 8 | 24 | null) {
    setAlertsBusy(true);
    try {
      await api.muteWebsite(id, hours);
    } catch (err) {
      Alert.alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAlertsBusy(false);
    }
    await reload();
  }

  async function togglePause(paused: boolean) {
    setPauseBusy(true);
    try {
      await api.pauseWebsite(id, paused);
    } catch (err) {
      Alert.alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPauseBusy(false);
    }
    await reload();
  }

  const backRow = (
    <Pressable
      onPress={goBack}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
        paddingVertical: 4,
        marginBottom: 8,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <ChevronLeft size={18} color={palette.inkSecondary} />
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: palette.inkSecondary }}>
        Websites
      </Text>
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
            message={error?.message ?? "Could not load this website."}
            onRetry={() => void reload()}
          />
        )}
      </Screen>
    );
  }

  const { website, pages, stats, health, incidents, recentScans, scanInProgress, capabilities } =
    data;
  const mutedUntil = isInFuture(website.muteAlertsUntil) ? website.muteAlertsUntil : null;
  const sslDaysLeft = health.sslDaysLeft;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
      {backRow}

      {/* Header */}
      <View style={{ gap: 6 }}>
        <Heading>{website.name}</Heading>
        <Mono>{hostOf(website.url)}</Mono>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <WebsiteStatusBadge status={website.status} />
          {mutedUntil ? (
            <Small color={palette.inkFaint}>Muted until {formatDateTime(mutedUntil)}</Small>
          ) : null}
        </View>
      </View>

      {/* Primary action */}
      {scanInProgress ? (
        <Pressable
          onPress={() => router.push(`/scan/${scanInProgress.scanId}`)}
          style={({ pressed }) => ({
            height: 44,
            borderRadius: radius.pill,
            backgroundColor: palette.primarySoft,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.accent }}
          />
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: palette.accent }}>
            Scan in progress...
          </Text>
        </Pressable>
      ) : (
        <View style={{ gap: 6 }}>
          <Button
            title="Run scan"
            onPress={() => void runScan()}
            loading={scanBusy}
            disabled={!capabilities.canRunManualScan}
          />
          {!capabilities.canRunManualScan && capabilities.manualScanBlockedReason ? (
            <Small color={palette.inkFaint} style={{ textAlign: "center" }}>
              {capabilities.manualScanBlockedReason}
            </Small>
          ) : null}
        </View>
      )}

      {/* Stat tiles */}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatTile label="Pages" value={stats.monitoredPages} />
          <StatTile
            label="Baselined"
            value={`${stats.baselinedPages}/${stats.monitoredPages}`}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatTile
            label="Open changes"
            value={stats.openChanges}
            gradient={stats.openChanges > 0 ? palette.gradientCoral : undefined}
          />
          <StatTile label="Last scan" value={timeAgo(website.lastScanAt)} />
        </View>
      </View>

      {/* Health */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <HealthDot health={health.status} />
          <CardTitle>
            {health.status === "up" ? "Up" : health.status === "down" ? "Down" : "Unknown"}
          </CardTitle>
          {health.httpStatus !== null ? <Mono>HTTP {health.httpStatus}</Mono> : null}
        </View>
        <Divider />
        <KeyRow
          label="Uptime 24h"
          value={<Small color={palette.ink}>{formatPercent(health.uptime24h)}</Small>}
        />
        <Divider />
        <KeyRow
          label="Avg response 24h"
          value={<Small color={palette.ink}>{formatMs(health.avgResponseMs24h)}</Small>}
        />
        <Divider />
        <KeyRow
          label="Uptime 7d"
          value={<Small color={palette.ink}>{formatPercent(health.uptime7d)}</Small>}
        />
        <Divider />
        <KeyRow
          label="SSL"
          value={
            sslDaysLeft === null ? (
              <Small color={palette.inkFaint}>-</Small>
            ) : (
              <Small
                color={
                  sslDaysLeft <= 14
                    ? palette.criticalStrong
                    : sslDaysLeft <= 30
                      ? palette.warningStrong
                      : palette.ink
                }
              >
                {sslDaysLeft <= 0 ? "Expired" : `${sslDaysLeft} days left`}
              </Small>
            )
          }
        />
      </Card>

      <DomainExpiryCard domain={data.domain} />

      {/* Incidents */}
      {incidents.length > 0 ? (
        <Card>
          <CardTitle style={{ marginBottom: 4 }}>Incidents</CardTitle>
          {incidents.map((incident, index) => (
            <Fragment key={incident.id}>
              {index > 0 ? <Divider /> : null}
              <View style={{ paddingVertical: 12, gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {incident.kind === "DOWN" ? (
                    <Chip label="DOWN" bg={palette.criticalSoft} color={palette.criticalStrong} />
                  ) : (
                    <Chip label="SSL" bg={palette.warningSoft} color={palette.warningStrong} />
                  )}
                  <Small color={palette.inkFaint}>{formatDateTime(incident.openedAt)}</Small>
                  {incident.resolvedAt === null ? (
                    <Text
                      style={{
                        fontFamily: fonts.bodySemiBold,
                        fontSize: 12,
                        color: palette.criticalStrong,
                        marginLeft: "auto",
                      }}
                    >
                      Ongoing
                    </Text>
                  ) : null}
                </View>
                {incident.detail ? <Small numberOfLines={2}>{incident.detail}</Small> : null}
              </View>
            </Fragment>
          ))}
        </Card>
      ) : null}

      {/* Recent scans */}
      <Card>
        <CardTitle style={{ marginBottom: 4 }}>Recent scans</CardTitle>
        {recentScans.length === 0 ? (
          <Small style={{ paddingVertical: 12 }}>No scans yet.</Small>
        ) : (
          recentScans.map((scan, index) => (
            <Fragment key={scan.id}>
              {index > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => router.push(`/scan/${scan.id}`)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 12,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <ScanStatusBadge status={scan.status} />
                <Small style={{ flex: 1 }} numberOfLines={1}>
                  {TRIGGER_LABELS[scan.triggerType]}
                </Small>
                <Small color={palette.inkSecondary}>
                  {scan.pagesScanned}/{scan.pagesRequested} pages
                </Small>
                <Small color={palette.inkFaint}>{timeAgo(scan.createdAt)}</Small>
                <ChevronRight size={16} color={palette.inkFaint} />
              </Pressable>
            </Fragment>
          ))
        )}
      </Card>

      {/* Monitored pages */}
      <Card>
        <CardTitle style={{ marginBottom: 4 }}>Monitored pages</CardTitle>
        {pages.length === 0 ? (
          <Small style={{ paddingVertical: 12 }}>No pages monitored yet.</Small>
        ) : (
          pages.map((page, index) => (
            <Fragment key={page.id}>
              {index > 0 ? <Divider /> : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Mono numberOfLines={1} color={palette.ink}>
                    {pathOf(page.url)}
                  </Mono>
                  {page.name ? <Small numberOfLines={1}>{page.name}</Small> : null}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {!page.enabled ? (
                    <Chip label="Off" bg={palette.infoSoft} color={palette.inkFaint} />
                  ) : null}
                  {page.baselineVersion !== null ? (
                    <Chip
                      label={`Baseline v${page.baselineVersion}`}
                      bg={palette.successSoft}
                      color={palette.successStrong}
                    />
                  ) : (
                    <Chip label="No baseline" bg={palette.infoSoft} color={palette.info} />
                  )}
                </View>
              </View>
            </Fragment>
          ))
        )}
      </Card>

      {data.stack ? <DetectedStackCard stack={data.stack} /> : null}

      {/* Alerts */}
      <Card>
        <CardTitle style={{ marginBottom: 12 }}>Alerts</CardTitle>
        {mutedUntil ? (
          <Button
            title="Unmute alerts"
            variant="secondary"
            onPress={() => void mute(null)}
            loading={alertsBusy}
          />
        ) : (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              title="Mute 1h"
              variant="secondary"
              size="sm"
              onPress={() => void mute(1)}
              disabled={alertsBusy}
              style={{ flex: 1 }}
            />
            <Button
              title="Mute 8h"
              variant="secondary"
              size="sm"
              onPress={() => void mute(8)}
              disabled={alertsBusy}
              style={{ flex: 1 }}
            />
            <Button
              title="Mute 24h"
              variant="secondary"
              size="sm"
              onPress={() => void mute(24)}
              disabled={alertsBusy}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </Card>

      {/* Danger zone */}
      <Card>
        <CardTitle style={{ marginBottom: 12 }}>Danger zone</CardTitle>
        {website.status === "PAUSED" ? (
          <Button
            title="Resume monitoring"
            variant="secondary"
            onPress={() => void togglePause(false)}
            loading={pauseBusy}
          />
        ) : (
          <Button
            title="Pause monitoring"
            variant="danger"
            onPress={() => void togglePause(true)}
            loading={pauseBusy}
          />
        )}
      </Card>
    </Screen>
  );
}
