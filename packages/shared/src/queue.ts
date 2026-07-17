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

export interface ScanWebsiteJob {
  scanId: string;
}

export interface LighthouseAuditJob {
  auditId: string;
}
