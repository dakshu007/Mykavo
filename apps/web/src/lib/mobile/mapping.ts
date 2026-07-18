/**
 * Pure mapping helpers for the read-only mobile API (/api/mobile/*). These
 * translate Prisma rows into the JSON contract in apps/mobile/src/lib/types.ts
 * so the route handlers stay thin. No DB access and no Next.js imports here -
 * everything is unit-testable.
 */

import type {
  ChangeCategory,
  ChangeSeverity,
  ChangeStatus,
  ScanStatus,
  ScanTriggerType,
} from "@mykavo/database";

/** Severity ordering used everywhere: CRITICAL > HIGH > MEDIUM > LOW > INFO. */
export const SEVERITY_RANK: Record<ChangeSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  INFO: 0,
};

/** The highest severity in a list, or null when the list is empty. */
export function highestSeverity(severities: ChangeSeverity[]): ChangeSeverity | null {
  let top: ChangeSeverity | null = null;
  for (const s of severities) {
    if (top === null || SEVERITY_RANK[s] > SEVERITY_RANK[top]) top = s;
  }
  return top;
}

/**
 * Narrows a stored severity string (Scan.highestSeverity is String? in the
 * schema) to the enum, or null for anything unknown.
 */
export function parseSeverity(value: string | null): ChangeSeverity | null {
  return value !== null && value in SEVERITY_RANK ? (value as ChangeSeverity) : null;
}

/** Path (+ query) of a URL, matching the dashboard's pathOf helper. */
export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

// ---------- ChangeListItem ----------

export interface ChangeRowForList {
  id: string;
  title: string;
  severity: ChangeSeverity;
  category: ChangeCategory;
  status: ChangeStatus;
  detectedAt: Date;
  websiteId: string;
  website: { name: string };
  monitoredPage: { url: string } | null;
}

export interface ChangeListItem {
  id: string;
  title: string;
  severity: ChangeSeverity;
  category: ChangeCategory;
  status: ChangeStatus;
  detectedAt: string;
  websiteId: string;
  websiteName: string;
  /** Path of the affected page, or null for site-wide changes. */
  pagePath: string | null;
}

export function mapChangeListItem(change: ChangeRowForList): ChangeListItem {
  return {
    id: change.id,
    title: change.title,
    severity: change.severity,
    category: change.category,
    status: change.status,
    detectedAt: change.detectedAt.toISOString(),
    websiteId: change.websiteId,
    websiteName: change.website.name,
    pagePath: change.monitoredPage ? pathOf(change.monitoredPage.url) : null,
  };
}

/**
 * Scan-detail ordering: most severe first, newest first within a severity
 * (the web scan page achieves the same via a stable sort over a
 * detectedAt-desc query). Returns a new array.
 */
export function sortChangesBySeverity<
  T extends { severity: ChangeSeverity; detectedAt: Date },
>(changes: T[]): T[] {
  return [...changes].sort((a, b) => {
    const bySeverity = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (bySeverity !== 0) return bySeverity;
    return b.detectedAt.getTime() - a.detectedAt.getTime();
  });
}

// ---------- Per-website open-change aggregation (overview) ----------

export interface OpenChangeGroupRow {
  websiteId: string;
  severity: ChangeSeverity;
  count: number;
}

export interface OpenChangeSummary {
  openChanges: number;
  highestOpenSeverity: ChangeSeverity | null;
}

/**
 * Collapses a `groupBy(websiteId, severity)` result into one summary per
 * website: total open changes plus the highest open severity.
 */
export function summarizeOpenChanges(
  rows: OpenChangeGroupRow[],
): Map<string, OpenChangeSummary> {
  const out = new Map<string, OpenChangeSummary>();
  for (const row of rows) {
    const current = out.get(row.websiteId) ?? {
      openChanges: 0,
      highestOpenSeverity: null,
    };
    current.openChanges += row.count;
    if (
      current.highestOpenSeverity === null ||
      SEVERITY_RANK[row.severity] > SEVERITY_RANK[current.highestOpenSeverity]
    ) {
      current.highestOpenSeverity = row.severity;
    }
    out.set(row.websiteId, current);
  }
  return out;
}

// ---------- ScanListItem ----------

export interface ScanRowForList {
  id: string;
  websiteId: string;
  status: ScanStatus;
  triggerType: ScanTriggerType;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  pagesRequested: number;
  pagesScanned: number;
  pagesFailed: number;
  changesDetected: number;
  highestSeverity: string | null;
}

export interface ScanListItem {
  id: string;
  websiteId: string;
  websiteName: string;
  websiteUrl: string;
  status: ScanStatus;
  triggerType: ScanTriggerType;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  pagesRequested: number;
  pagesScanned: number;
  pagesFailed: number;
  changesDetected: number;
  highestSeverity: ChangeSeverity | null;
}

export function mapScanListItem(
  scan: ScanRowForList,
  website: { name: string; url: string },
): ScanListItem {
  return {
    id: scan.id,
    websiteId: scan.websiteId,
    websiteName: website.name,
    websiteUrl: website.url,
    status: scan.status,
    triggerType: scan.triggerType,
    startedAt: scan.startedAt ? scan.startedAt.toISOString() : null,
    completedAt: scan.completedAt ? scan.completedAt.toISOString() : null,
    createdAt: scan.createdAt.toISOString(),
    pagesRequested: scan.pagesRequested,
    pagesScanned: scan.pagesScanned,
    pagesFailed: scan.pagesFailed,
    changesDetected: scan.changesDetected,
    highestSeverity: parseSeverity(scan.highestSeverity),
  };
}

// ---------- Change detail metadata ----------

export interface BrokenLink {
  url: string;
  /** Terminal HTTP status, or null when the URL was unreachable. */
  status: number | null;
  /** Monitored pages linking to this URL. */
  pageCount: number;
}

/**
 * Defensive parse of metadata.brokenLinks written by the comparison worker
 * (shape: { url, status, pages } with status 0 meaning unreachable) into the
 * mobile contract's { url, status: number | null, pageCount }.
 */
export function parseBrokenLinks(metadata: unknown): BrokenLink[] {
  if (typeof metadata !== "object" || metadata === null) return [];
  const list = (metadata as { brokenLinks?: unknown }).brokenLinks;
  if (!Array.isArray(list)) return [];
  const rows: BrokenLink[] = [];
  for (const entry of list) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { url?: unknown }).url === "string" &&
      typeof (entry as { status?: unknown }).status === "number" &&
      typeof (entry as { pages?: unknown }).pages === "number"
    ) {
      const { url, status, pages } = entry as {
        url: string;
        status: number;
        pages: number;
      };
      rows.push({ url, status: status === 0 ? null : status, pageCount: pages });
    }
  }
  return rows;
}

/** Whether the change carries a visual diff image (metadata.diffStorageKey). */
export function hasDiffImage(metadata: unknown): boolean {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    typeof (metadata as Record<string, unknown>).diffStorageKey === "string"
  );
}

/**
 * Update-baseline eligibility, mirroring the checks in
 * /api/changes/[id]/update-baseline: the change must target a monitored page
 * (site-wide changes have no baseline) and have a successful current snapshot.
 */
export function canUpdateBaseline(change: {
  monitoredPageId: string | null;
  currentSnapshotId: string | null;
  currentSnapshot: { errorCode: string | null } | null;
}): boolean {
  return (
    change.monitoredPageId !== null &&
    change.currentSnapshotId !== null &&
    !change.currentSnapshot?.errorCode
  );
}
