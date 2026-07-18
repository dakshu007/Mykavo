/**
 * API contract between the mobile app and the MyKavo web backend.
 *
 * Read endpoints live under /api/mobile/* (added for the app - the web
 * dashboard is server-rendered and had no JSON reads for most of this data).
 * Mutations reuse the exact same routes the web dashboard calls, so the two
 * clients can never drift. All timestamps are ISO-8601 strings.
 */

import type {
  ChangeCategory,
  ChangeStatus,
  ScanStatus,
  Severity,
  WebsiteStatus,
} from "./theme";

export type { ChangeCategory, ChangeStatus, ScanStatus, Severity, WebsiteStatus };

export type PlanId = "free" | "pro";
export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type HealthState = "up" | "down" | "unknown";

/* ---------------------------------- me ---------------------------------- */

export interface MeResponse {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    twoFactorEnabled: boolean;
  };
  workspaces: {
    id: string;
    name: string;
    role: WorkspaceRole;
    isActive: boolean;
  }[];
  plan: {
    id: PlanId;
    name: string;
    limits: {
      websites: number;
      pagesPerSite: number;
      scanFrequency: "WEEKLY" | "DAILY";
      seats: number;
    };
  };
}

/* ------------------------------- overview -------------------------------- */

export interface OverviewWebsite {
  id: string;
  name: string;
  url: string;
  status: WebsiteStatus;
  health: HealthState;
  monitoredPages: number;
  openChanges: number;
  highestOpenSeverity: Severity | null;
  lastScanAt: string | null;
  nextScanAt: string | null;
  scanInProgress: boolean;
}

export interface OverviewResponse {
  workspace: { id: string; name: string; role: WorkspaceRole; plan: PlanId };
  stats: {
    websites: number;
    pages: number;
    baselinedPages: number;
    openChanges: number;
  };
  websites: OverviewWebsite[];
  recentChanges: ChangeListItem[];
}

/* -------------------------------- changes -------------------------------- */

export interface ChangeListItem {
  id: string;
  title: string;
  severity: Severity;
  category: ChangeCategory;
  status: ChangeStatus;
  detectedAt: string;
  websiteId: string;
  websiteName: string;
  /** Path of the affected page, or null for site-wide changes. */
  pagePath: string | null;
}

export interface ChangesListResponse {
  changes: ChangeListItem[];
  total: number;
  websites: { id: string; name: string }[];
}

export interface ChangeNote {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface ChangeDetail {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: ChangeCategory;
  status: ChangeStatus;
  changeType: string;
  detectedAt: string;
  previousValue: string | null;
  currentValue: string | null;
  brokenLinks: { url: string; status: number | null; pageCount: number }[];
  websiteId: string;
  websiteName: string;
  websiteUrl: string;
  pageUrl: string | null;
  previousSnapshotId: string | null;
  currentSnapshotId: string | null;
  hasDiff: boolean;
  canUpdateBaseline: boolean;
  notes: ChangeNote[];
}

export interface ChangeDetailResponse {
  change: ChangeDetail;
}

/* --------------------------------- scans --------------------------------- */

export interface ScanListItem {
  id: string;
  websiteId: string;
  websiteName: string;
  websiteUrl: string;
  status: ScanStatus;
  triggerType: "BASELINE" | "SCHEDULED" | "MANUAL";
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  pagesRequested: number;
  pagesScanned: number;
  pagesFailed: number;
  changesDetected: number;
  highestSeverity: Severity | null;
}

export interface ScansListResponse {
  scans: ScanListItem[];
}

export interface ScanPageResult {
  snapshotId: string;
  url: string;
  path: string;
  title: string | null;
  httpStatus: number | null;
  responseTimeMs: number | null;
  pageWeightBytes: number | null;
  requestCount: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  hasScreenshot: boolean;
  isBaseline: boolean;
  baselineVersion: number | null;
}

export interface ScanDetailResponse {
  scan: ScanListItem;
  changes: ChangeListItem[];
  pages: ScanPageResult[];
  openChangeCount: number;
}

/* -------------------------------- websites ------------------------------- */

export interface WebsiteRow {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  normalizedUrl: string;
  status: WebsiteStatus;
  scanFrequency: "WEEKLY" | "DAILY";
  timezone: string;
  lastScanAt: string | null;
  nextScanAt: string | null;
  muteAlertsUntil: string | null;
  badgeEnabled: boolean;
  publicToken: string | null;
  statusPageEnabled: boolean;
  ignoredSelectors: string[] | null;
  screenshotMasks: string[] | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebsitesListResponse {
  websites: (WebsiteRow & { _count: { monitoredPages: number } })[];
}

export interface MonitoredPageRow {
  id: string;
  websiteId: string;
  url: string;
  normalizedUrl: string;
  name: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface WebsiteIncident {
  id: string;
  kind: "DOWN" | "SSL";
  openedAt: string;
  resolvedAt: string | null;
  detail: string;
}

export interface WebsiteDetailResponse {
  website: WebsiteRow;
  pages: (MonitoredPageRow & { baselineVersion: number | null })[];
  stats: {
    monitoredPages: number;
    baselinedPages: number;
    openChanges: number;
    highestOpenSeverity: Severity | null;
  };
  health: WebsiteHealth;
  incidents: WebsiteIncident[];
  recentScans: ScanListItem[];
  scanInProgress: { scanId: string } | null;
  capabilities: {
    canRunManualScan: boolean;
    manualScanBlockedReason: string | null;
  };
}

/* ------------------------------- mutations ------------------------------- */

export interface ScanTriggerResponse {
  scan: {
    id: string;
    websiteId: string;
    status: ScanStatus;
    triggerType: "BASELINE" | "SCHEDULED" | "MANUAL";
    createdAt: string;
  };
}

export type ChangeAction = "review" | "approve" | "ignore" | "resolve" | "reopen";

/* --------------------------------- errors -------------------------------- */

export interface ApiErrorBody {
  error: string;
  code?: string;
  scanId?: string;
}
