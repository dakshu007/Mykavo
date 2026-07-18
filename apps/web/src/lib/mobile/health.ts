/**
 * Pure health/capability mapping for the mobile website-detail endpoint.
 * Translates the dashboard's health queries (getLatestHealthCheck,
 * getUptimeStats, getRecentHealthIncidents) and the RunScanButton gating from
 * dashboard/websites/[id]/page.tsx into the mobile contract shapes.
 */

import type { HealthIncidentKind } from "@mykavo/database";
import { daysUntil } from "@mykavo/shared";

export type HealthState = "up" | "down" | "unknown";

/** Overview health dot: no check yet = unknown (same as the dashboard). */
export function healthStateOf(up: boolean | undefined): HealthState {
  if (up === undefined) return "unknown";
  return up ? "up" : "down";
}

export interface LatestHealthCheckRow {
  up: boolean;
  httpStatus: number | null;
  checkedAt: Date;
  sslValidTo: Date | null;
}

export interface UptimeStatsRow {
  totalChecks: number;
  uptimePercent: number | null;
  avgResponseTimeMs: number | null;
}

export interface WebsiteHealth {
  status: HealthState;
  httpStatus: number | null;
  checkedAt: string | null;
  uptime24h: number | null;
  avgResponseMs24h: number | null;
  uptime7d: number | null;
  checks7d: number | null;
  sslDaysLeft: number | null;
  sslValidTo: string | null;
}

/**
 * WebsiteHealth for the mobile contract. A website that has never been
 * health-checked is entirely unknown (all-null fields), matching the
 * dashboard's "first health check runs within 5 minutes" state.
 */
export function buildWebsiteHealth(
  latest: LatestHealthCheckRow | null,
  uptime24h: UptimeStatsRow,
  uptime7d: UptimeStatsRow,
  now: Date,
): WebsiteHealth {
  if (!latest) {
    return {
      status: "unknown",
      httpStatus: null,
      checkedAt: null,
      uptime24h: null,
      avgResponseMs24h: null,
      uptime7d: null,
      checks7d: null,
      sslDaysLeft: null,
      sslValidTo: null,
    };
  }
  return {
    status: latest.up ? "up" : "down",
    httpStatus: latest.httpStatus,
    checkedAt: latest.checkedAt.toISOString(),
    uptime24h: uptime24h.uptimePercent,
    avgResponseMs24h: uptime24h.avgResponseTimeMs,
    uptime7d: uptime7d.uptimePercent,
    checks7d: uptime7d.totalChecks,
    sslDaysLeft: latest.sslValidTo ? daysUntil(latest.sslValidTo, now) : null,
    sslValidTo: latest.sslValidTo ? latest.sslValidTo.toISOString() : null,
  };
}

// ---------- Incidents ----------

export interface IncidentRow {
  id: string;
  kind: HealthIncidentKind;
  openedAt: Date;
  resolvedAt: Date | null;
  detail: string | null;
}

export interface WebsiteIncident {
  id: string;
  kind: "DOWN" | "SSL";
  openedAt: string;
  resolvedAt: string | null;
  detail: string;
}

/** DB kind SSL_EXPIRING surfaces as the contract's short "SSL". */
export function mapIncident(incident: IncidentRow): WebsiteIncident {
  return {
    id: incident.id,
    kind: incident.kind === "DOWN" ? "DOWN" : "SSL",
    openedAt: incident.openedAt.toISOString(),
    resolvedAt: incident.resolvedAt ? incident.resolvedAt.toISOString() : null,
    detail: incident.detail ?? "",
  };
}

// ---------- Manual scan capability ----------

export interface ManualScanCapability {
  canRunManualScan: boolean;
  manualScanBlockedReason: string | null;
}

/**
 * Mirrors the RunScanButton gating on the website detail page: the button is
 * replaced while a scan is in flight, hidden with no monitored pages, always
 * available for the first (baseline) scan, and otherwise Pro-gated by the
 * plan's manualScans flag.
 */
export function manualScanCapability(input: {
  scanInProgress: boolean;
  monitoredPageCount: number;
  hasFinishedScan: boolean;
  planAllowsManualScans: boolean;
}): ManualScanCapability {
  if (input.scanInProgress) {
    return { canRunManualScan: false, manualScanBlockedReason: "A scan is already running." };
  }
  if (input.monitoredPageCount === 0) {
    return {
      canRunManualScan: false,
      manualScanBlockedReason: "Select pages to monitor first.",
    };
  }
  if (!input.hasFinishedScan) {
    return { canRunManualScan: true, manualScanBlockedReason: null };
  }
  if (!input.planAllowsManualScans) {
    return {
      canRunManualScan: false,
      manualScanBlockedReason: "Manual scans are a Pro feature.",
    };
  }
  return { canRunManualScan: true, manualScanBlockedReason: null };
}
