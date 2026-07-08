/**
 * Queue contract shared by the web app (producers) and workers (consumers).
 * Backed by pg-boss on the existing PostgreSQL instance — chosen over
 * BullMQ+Redis to keep infrastructure at zero cost (see docs/ARCHITECTURE.md).
 */

export const SCAN_WEBSITE_QUEUE = "scan-website";

export interface ScanWebsiteJob {
  scanId: string;
}
