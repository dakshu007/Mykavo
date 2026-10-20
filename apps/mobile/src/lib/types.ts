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
  /**
   * Which operator-only areas to show. UX hints ONLY - every admin endpoint
   * re-checks the allowlist server-side, so faking these reveals nothing. They
   * exist so the app never renders a tab that 404s when tapped.
   *
   * Optional because the app ships independently of the backend: an APK
   * installed against a server that predates this field must not crash, it
   * must simply show no admin areas.
   */
  admin?: {
    usage: boolean;
    /** Optional on its own: an APK may outlive the server that first sent it. */
    users?: boolean;
    appRequests?: boolean;
    tracking?: boolean;
    automations?: boolean;
    marketing?: boolean;
    blog: boolean;
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
    /**
     * Set only during a Pro trial (ISO date). OPTIONAL on purpose: a
     * server that predates the trial does not send it.
     */
    trialEndsAt?: string | null;
    /** During a trial, the paid plan's website cap. Absent on older servers. */
    paidWebsites?: number | null;
    /** null = unlimited (JSON has no Infinity). */
    limits: {
      websites: number | null;
      pagesPerSite: number | null;
      scanFrequency: "WEEKLY" | "DAILY";
      seats: number | null;
      /** AI change explanations a month. Absent on older servers. */
      aiExplanationsPerMonth?: number | null;
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

/** Why MyKavo paused a website by itself: a Pro trial ended, or nobody opened it. */
export type AutoPauseReason = "OVER_LIMIT" | "DORMANT";

export interface WebsiteDetailResponse {
  website: WebsiteRow & {
    /** null when not auto-paused. Absent on servers that predate it. */
    autoPause?: AutoPauseReason | null;
  };
  pages: (MonitoredPageRow & { baselineVersion: number | null })[];
  stats: {
    monitoredPages: number;
    baselinedPages: number;
    openChanges: number;
    highestOpenSeverity: Severity | null;
  };
  health: WebsiteHealth;
  /**
   * OPTIONAL on purpose. The app updates independently of the backend: a phone
   * running a new build against a server that predates these fields receives a
   * response without them. Typing it as always-present made the compiler agree
   * with an assumption reality does not, and the screen crashed on
   * `domain.checkedAt` of undefined.
   */
  domain?: DomainRegistrationInfo;
  /** Absent on older backends; null when nothing could be read. */
  stack?: StackInfo | null;
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

/* ------------------------- adding a website ------------------------------ */

/**
 * POST /api/websites/[id]/discover. `source` says where a URL was found
 * (sitemap, homepage link, ...) so the selection list can explain itself.
 */
export interface DiscoveredPage {
  url: string;
  source: string;
}

export interface DiscoveryResponse {
  pages: DiscoveredPage[];
  /** Non-fatal problems worth showing, e.g. an unreachable sitemap. */
  warnings: string[];
  /** True when discovery hit its cap and more pages probably exist. */
  truncated: boolean;
  /** The homepage after redirects (apex -> www, http -> https). */
  finalUrl: string;
}

/* -------------------- domain registration + tech stack -------------------- */

/**
 * Domain registration facts read over RDAP. `checkedAt` null means the weekly
 * sweep has not reached this site yet, which must NOT be shown as "fine".
 */
export type ExpiryUrgency = "expired" | "critical" | "warning" | "notice" | "ok";

export interface DomainRegistrationInfo {
  name: string | null;
  expiresAt: string | null;
  registrar: string | null;
  checkedAt: string | null;
  lookupError: string | null;
  /** Computed server-side by @mykavo/shared's assessExpiry - never in the app. */
  daysRemaining: number | null;
  urgency: ExpiryUrgency;
  /** Plain-language summary; empty when there is nothing to say. */
  message: string;
  /** Registry holds that block renewal or transfer. */
  blockingStatuses: string[];
}

export type TechCategory = string;

export interface TechEntry {
  slug: string;
  name: string;
  category: TechCategory;
  version: string | null;
  /** Which signal matched - shown to the user, so it must read plainly. */
  evidence: string;
}

export interface PlatformComponentInfo {
  kind: string;
  slug: string;
  name: string;
  version: string;
}

/** What the site is built with, merged across its monitored pages. */
export interface StackInfo {
  technologies: TechEntry[];
  platform: "wordpress" | null;
  components: PlatformComponentInfo[];
  pagesRead: number;
  assetsSeen: number;
  assetsVersioned: number;
}

/* --------------------------------- usage ---------------------------------- */

/** How much to trust a figure - mirrors MetricState in the web collector. */
export type UsageMetricState = "measured" | "partial" | "unavailable" | "unconfigured";

export type UsageUnit = "bytes" | "count";

export interface UsageMeterItem {
  id: string;
  label: string;
  provider: string;
  used: number;
  limit: number;
  unit: UsageUnit;
  state: UsageMetricState;
  detail: string;
}

export interface UsageStatItem {
  id: string;
  order: number;
  label: string;
  provider: string;
  value: number | null;
  unit: UsageUnit;
  state: UsageMetricState;
  detail: string;
}

export interface UsageResponse {
  generatedAt: string;
  meters: UsageMeterItem[];
  stats: UsageStatItem[];
  uncapped: { label: string; detail: string }[];
  problems: string[];
}

/* --------------------------------- users ---------------------------------- */

/**
 * One signed-up account, as the operator sees it. Mirrors SignupRow in
 * apps/web/src/lib/admin/recent-signups.ts.
 */
export interface SignupRow {
  id: string;
  /**
   * Already made presentable by the server: rows created before name
   * validation shipped can hold anything, so the backend falls back to the
   * address handle rather than sending a row of dashes to be rendered.
   */
  name: string;
  email: string;
  joinedAt: string;
  websites: number;
  /** Has added at least one website - the line between a signup and a user. */
  activated: boolean;
}

export interface UsersResponse {
  rows: SignupRow[];
  total: number;
  lastSevenDays: number;
  /** Non-null when the list could not be read. The screen says so. */
  error: string | null;
}

/* ------------------------------ app requests ------------------------------ */

export type AppAccessStatus = "PENDING" | "APPROVED" | "DECLINED";

/** Mirrors AppRequestRow in apps/web/src/lib/app-access.ts. */
export interface AppRequestRow {
  id: string;
  /** Already made presentable by the server. */
  name: string;
  email: string;
  status: AppAccessStatus;
  requestedAt: string;
  decidedAt: string | null;
  /** True once the approval email was accepted by the provider. */
  emailSent: boolean;
  downloadCount: number;
  /** A MyKavo account already exists for this address. */
  hasAccount: boolean;
}

export interface AppRequestsResponse {
  rows: AppRequestRow[];
  pending: number;
  approved: number;
  total: number;
  /** Non-null when the list could not be read. */
  error: string | null;
}

/* ---------------------------------- blog ---------------------------------- */

export type BlogPostStatus = "DRAFT" | "PUBLISHED";

export interface BlogPostListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: BlogPostStatus;
  publishedAt: string | null;
  updatedAt: string;
}

export interface BlogListResponse {
  posts: BlogPostListItem[];
}

export interface BlogStatusResponse {
  id: string;
  status: BlogPostStatus;
  publishedAt: string | null;
  updatedAt: string;
}

/* --------------------------- search console ------------------------------ */

export interface GscTotals {
  clicks: number;
  impressions: number;
  /** 0-1, recomputed from totals rather than averaged from daily ratios. */
  ctr: number;
  position: number;
}

export interface GscDimensionItem {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  /** null = no figure for the previous window, which is not the same as 0. */
  clicksDelta: number | null;
}

export interface GscWebsiteReport {
  websiteId: string;
  name: string;
  url: string;
  property: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  windowDays: number;
  current: GscTotals;
  previous: GscTotals;
  trend: { date: string; clicks: number; impressions: number }[];
  topQueries: GscDimensionItem[];
  topPages: GscDimensionItem[];
}

export interface SearchConsoleResponse {
  websites: GscWebsiteReport[];
}

/* -------------------------------- tracking -------------------------------- */

/** Mirrors CHANNELS in apps/web/src/lib/activity/core.ts. */
export const TRACKING_CHANNELS = ["web", "android", "wordpress", "shopify", "chrome", "mcp"] as const;
export type TrackingChannel = (typeof TRACKING_CHANNELS)[number];

export const TRACKING_CHANNEL_LABEL: Record<TrackingChannel, string> = {
  web: "Web dashboard",
  android: "Android app",
  wordpress: "WordPress plugin",
  shopify: "Shopify app",
  chrome: "Chrome extension",
  mcp: "AI assistant (MCP)",
};

export type TrackingShow = "all" | "active" | "inactive" | "stuck" | TrackingChannel;

export type ChannelStatus = "active" | "installed" | "pending" | "started" | "stopped" | "none";

/** Mirrors ChannelState in apps/web/src/lib/admin/tracking-core.ts. */
export interface ChannelState {
  status: ChannelStatus;
  label: string;
  detail: string | null;
  lastAt: string | null;
}

/** Mirrors TrackingRow in apps/web/src/lib/admin/tracking-core.ts. */
export interface TrackingRow {
  id: string;
  name: string;
  email: string;
  internal: boolean;
  signedUpAt: string;
  plan: string;
  paid: boolean;
  websites: number;
  monitoring: boolean;
  lastActiveAt: string | null;
  lastChannel: TrackingChannel | null;
  activeDays30: number;
  /** Last 14 days, oldest first: the channels the user was active on each day. */
  spark: TrackingChannel[][];
  channels: Record<TrackingChannel, ChannelState>;
}

export interface TrackingKpis {
  users: number;
  activeToday: number;
  active7d: number;
  active30d: number;
  byChannel: Record<TrackingChannel, { adopted: number; active: number; stuck: number }>;
  funnel: { label: string; count: number }[];
}

export interface TrackingResponse {
  /** False until the activity tables exist on the server. */
  recording: boolean;
  kpis: TrackingKpis;
  daily: ({ day: string } & Record<TrackingChannel, number>)[];
  extension: { installs: number; steps: { label: string; count: number }[] } | null;
  show: TrackingShow;
  includeInternal: boolean;
  shows: { id: TrackingShow; label: string; count: number }[];
  /** Rows matching the filter; `rows` holds at most 200 of them. */
  total: number;
  rows: TrackingRow[];
}

export interface UserTrackingResponse {
  row: TrackingRow;
  workspaces: { id: string; name: string; role: string; plan: string }[];
  websites: { id: string; name: string; url: string; createdAt: string; lastScanAt: string | null }[];
  heat: { channel: TrackingChannel; days: { day: string; pings: number }[] }[];
  timeline: { at: string; channel: TrackingChannel | "account"; title: string; detail: string | null }[];
  pages: { label: string; route: string; views: number; lastAt: string }[];
  devices: { label: string; app: boolean; firstAt: string; lastAt: string; kind: "session" | "push" }[];
}

/* ------------------------------- automations ------------------------------- */

export interface AutomationItem {
  key: string;
  name: string;
  group: "Onboarding" | "Lifecycle series" | "Plan & monitoring" | "Product updates";
  /** When it goes out, in words. */
  trigger: string;
  unsubscribable: boolean;
  enabled: boolean;
  /** Wording, timing or offer differs from what shipped. */
  customised: boolean;
  sendOnDay: number | null;
  offer: { code: string; percent: number } | null;
  stats: { sent7d: number; sent30d: number; failed30d: number; lastSentAt: string | null };
}

export type FlowStatus = "DRAFT" | "ACTIVE" | "PAUSED";

export interface FlowListItem {
  id: string;
  name: string;
  status: FlowStatus;
  trigger: "signup" | "first_website";
  steps: number;
  updatedAt: string;
  runs: { active: number; completed: number; stopped: number };
  sent: number;
}

export interface UpdateEmailPanel {
  product: string;
  release: { version: string; detectedAt: string; sendRequestedAt: string | null } | null;
  suggestedVersion: string;
  total: number;
  outdated: number;
  waiting: number;
  notified: number;
}

export interface AutomationsResponse {
  /** False until the email_automation migration exists on the server. */
  ready: boolean;
  unsubscribes: { total: number; last30d: number } | null;
  automations: AutomationItem[];
  flowsReady: boolean;
  flows: FlowListItem[];
  systemFlows: { id: string; name: string; triggerLabel: string; description: string; sent30d: number }[];
  updates: { ready: boolean; plugin: UpdateEmailPanel; app: UpdateEmailPanel };
}

/* ----------------------------- email marketing ----------------------------- */

export interface MarketingCampaign {
  id: number;
  name: string;
  subject?: string;
  status: string;
  createdAt: string;
  scheduledAt?: string;
  sentDate?: string;
  stats: {
    sent: number;
    delivered: number;
    uniqueViews: number;
    uniqueClicks: number;
    unsubscriptions: number;
    hardBounces: number;
    softBounces: number;
    complaints: number;
  } | null;
}

export interface MarketingResponse {
  configured: boolean;
  provider: "brevo" | "resend";
  forcedResend: boolean;
  sender: { name: string; email: string };
  checks: {
    apiKey: boolean;
    senderEmail: boolean;
    senderVerified: boolean | null;
    domainAuthenticated: boolean | null;
    migration: boolean;
    synced: boolean;
  };
  account: { plan: string; creditsLeft: number | null } | null;
  report: {
    requests: number;
    delivered: number;
    hardBounces: number;
    softBounces: number;
    uniqueOpens: number;
    uniqueClicks: number;
    spamReports: number;
    blocked: number;
    unsubscribed: number;
  } | null;
  audiences: { key: string; id: number; name: string; description: string; subscribers: number }[] | null;
  mykavo: { accounts: number; optedOut: number };
  syncs: {
    id: string;
    kind: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    contacts: number;
    error: string | null;
  }[];
  campaigns: MarketingCampaign[];
  errors: Partial<Record<"account" | "report" | "audiences" | "campaigns" | "senders", string>>;
}
