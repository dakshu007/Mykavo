/**
 * Queue contract shared by the web app (producers) and workers (consumers).
 * Backed by pg-boss on the existing PostgreSQL instance - chosen over
 * BullMQ+Redis to keep infrastructure at zero cost (see docs/ARCHITECTURE.md).
 */

export const SCAN_WEBSITE_QUEUE = "scan-website";
export const SCHEDULER_SWEEP_QUEUE = "scheduler-sweep";
export const RETENTION_SWEEP_QUEUE = "retention-sweep";
export const LIGHTHOUSE_AUDIT_QUEUE = "lighthouse-audit";
export const HEALTH_SWEEP_QUEUE = "health-sweep";
export const REPORT_SWEEP_QUEUE = "report-sweep";
export const AUDIT_SWEEP_QUEUE = "audit-sweep";
export const BILLING_SWEEP_QUEUE = "billing-sweep";
export const CLIENT_REPORT_SWEEP_QUEUE = "client-report-sweep";
export const GSC_SYNC_QUEUE = "gsc-sync";
export const GSC_SYNC_SWEEP_QUEUE = "gsc-sync-sweep";
export const SITE_AUDIT_QUEUE = "site-audit";

export interface ScanWebsiteJob {
  scanId: string;
}

export interface LighthouseAuditJob {
  auditId: string;
}

export interface SiteAuditJob {
  siteAuditId: string;
  /** Plan-resolved crawl cap, decided by the web app at enqueue time. */
  maxPages: number;
}

export interface GscSyncJob {
  websiteId: string;
}
