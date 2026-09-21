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
/** Weekly RDAP pass: when does each monitored domain expire? */
export const DOMAIN_SWEEP_QUEUE = "domain-sweep";
/**
 * Delete object-storage keys whose owning rows are already gone. Enqueued the
 * moment a website is deleted so the bucket shrinks in seconds rather than
 * waiting for the nightly retention sweep, which drains the same table.
 */
export const ARTIFACT_PURGE_QUEUE = "artifact-purge";
export const SITE_AUDIT_QUEUE = "site-audit";
/**
 * "Send me a test alert" from the app. Deliberately goes through the queue and
 * the worker rather than sending from the web request, so a green result
 * proves the REAL delivery path - web -> pg-boss -> worker -> Expo -> phone -
 * which is the whole point of a test.
 */
export const PUSH_TEST_QUEUE = "push-test";
/**
 * "Somebody just signed up." Goes to the platform operator, not to a customer.
 *
 * Enqueued from the signup hook rather than sent there: the hook runs inside
 * the request that creates the account, and a push must never be able to slow
 * that down or fail it. A pg-boss insert is one fast local write; the Expo
 * round trip happens in the worker where a failure costs nothing.
 */
export const ADMIN_SIGNUP_QUEUE = "admin-signup";

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

export interface ArtifactPurgeJob {
  /** For logging only - the worker drains the whole table regardless. */
  workspaceId: string;
}

export interface PushTestJob {
  /** Whose devices to alert. Never taken from client input - see the route. */
  userId: string;
}

export interface AdminSignupJob {
  /** The account that was just created. Everything else is read from the row. */
  userId: string;
}
