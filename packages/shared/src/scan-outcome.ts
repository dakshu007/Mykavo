/**
 * Scan outcome resolution (spec §44).
 *
 * A scan is more than the page fetches. After every page is captured, the
 * scan still has to establish baselines (BASELINE runs) or compare against
 * them and emit change events (SCHEDULED / MANUAL / DEPLOY runs). Those
 * stages used to fail into a log line while the scan itself was already
 * stored as COMPLETED - so a scan that never produced a verdict was
 * indistinguishable, in the dashboard and in the customer's inbox, from one
 * that checked everything and found nothing wrong.
 *
 * For a monitoring product that is the worst failure mode there is: silence
 * is the success signal, so a silent failure reads as "all good". This module
 * holds the rule that decides what a scan's stored status and error code
 * should be once every stage has reported, and it is deliberately pure so the
 * rule is testable without a database.
 */

/** Stages that run after page capture and can fail independently of it. */
export type ScanStage = "BASELINE" | "COMPARISON" | "LINK_CHECK" | "SITE_META";

/** Structured codes stored on Scan.errorCode - never a raw error string. */
export type ScanErrorCode =
  | "ALL_PAGES_FAILED"
  | "BASELINE_FAILED"
  | "COMPARISON_FAILED"
  | "COMPARISON_INCOMPLETE"
  | "LINK_CHECK_FAILED"
  | "SITE_META_FAILED";

export interface StageFailure {
  stage: ScanStage;
  code: ScanErrorCode;
  /** Raw detail for the log only. Never becomes the stored errorMessage. */
  detail?: string;
}

export interface ScanOutcome {
  status: "COMPLETED" | "PARTIAL" | "FAILED";
  errorCode: ScanErrorCode | null;
  errorMessage: string | null;
  /**
   * True when pages were captured but MyKavo cannot stand behind the change
   * verdict for this scan. Callers use it to alert rather than stay quiet.
   */
  verdictMissing: boolean;
}

/**
 * Stages whose failure means there is no trustworthy answer to "did anything
 * change?". These demote the scan's status; the others only annotate it,
 * because a scan that compared every page but could not re-check outbound
 * links still delivered its core verdict.
 */
const VERDICT_STAGES: ReadonlySet<ScanStage> = new Set<ScanStage>(["BASELINE", "COMPARISON"]);

/** Most severe first - the stored code reports the worst thing that happened. */
const STAGE_PRIORITY: readonly ScanStage[] = ["COMPARISON", "BASELINE", "LINK_CHECK", "SITE_META"];

const MESSAGES: Record<ScanErrorCode, string> = {
  ALL_PAGES_FAILED:
    "Every monitored page failed to scan. The site may be down or blocking requests.",
  BASELINE_FAILED:
    "Pages were captured, but the baseline could not be saved, so there is nothing for future scans to compare against. Run the baseline scan again.",
  COMPARISON_FAILED:
    "Pages were captured, but the comparison against the approved baseline did not finish, so no changes could be reported for this scan. This scan is not evidence that nothing changed.",
  COMPARISON_INCOMPLETE:
    "Some pages could not be compared against their baseline, so changes on those pages may be missing from this scan.",
  LINK_CHECK_FAILED:
    "Pages were compared, but the internal link check did not finish, so newly broken links may be missing from this scan.",
  SITE_META_FAILED:
    "Pages were compared, but robots.txt and sitemap checks did not finish for this scan.",
};

/** The user-facing sentence for a structured code (spec §44). */
export function scanErrorMessage(code: ScanErrorCode): string {
  return MESSAGES[code];
}

export function resolveScanOutcome(input: {
  pagesScanned: number;
  pagesFailed: number;
  failures: readonly StageFailure[];
}): ScanOutcome {
  const { pagesScanned, pagesFailed } = input;

  // Nothing was captured at all - the later stages are moot.
  if (pagesScanned === 0) {
    const failedEverything = pagesFailed > 0;
    return {
      status: failedEverything ? "FAILED" : "COMPLETED",
      errorCode: failedEverything ? "ALL_PAGES_FAILED" : null,
      errorMessage: failedEverything ? MESSAGES.ALL_PAGES_FAILED : null,
      verdictMissing: false,
    };
  }

  // At least one page succeeded, so this is never a total failure - the
  // snapshots are real and worth showing even if the rest went wrong.
  const captureStatus = pagesFailed === 0 ? "COMPLETED" : "PARTIAL";

  const worst = STAGE_PRIORITY.map((stage) =>
    input.failures.find((f) => f.stage === stage),
  ).find((f): f is StageFailure => f !== undefined);

  if (!worst) {
    return { status: captureStatus, errorCode: null, errorMessage: null, verdictMissing: false };
  }

  const verdictMissing = VERDICT_STAGES.has(worst.stage);
  return {
    status: verdictMissing ? "PARTIAL" : captureStatus,
    errorCode: worst.code,
    errorMessage: MESSAGES[worst.code],
    verdictMissing,
  };
}
