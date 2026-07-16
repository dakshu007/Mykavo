/**
 * Performance-drop alert decision (Lighthouse). Pure function only - the
 * worker (apps/worker/src/lighthouse-audit.ts) does the IO and delegates the
 * "should this drop alert?" decision here so the rule is unit-testable.
 *
 * THE DROP RULE - alert when the performance score of a completed audit fell
 * by at least PERFORMANCE_DROP_THRESHOLD points versus the previous completed
 * audit of the SAME url, and the previous score was at least
 * PERFORMANCE_DROP_MIN_BASELINE. Rationale: a ≥15-point fall on a healthy or
 * middling score is a real regression worth an email; a site already scoring
 * below 30 is known-bad and bouncing around the bottom - alerting on its
 * noise would train users to ignore us (spec §25, low false positives).
 */

/** Minimum points the performance score must fall to trigger an alert. */
export const PERFORMANCE_DROP_THRESHOLD = 15;

/** Previous scores below this never alert (already-terrible exemption). */
export const PERFORMANCE_DROP_MIN_BASELINE = 30;

/**
 * Decide whether a completed audit's performance score warrants a drop alert.
 *
 * @param previousScore performance score of the previous completed audit of
 *   the same url - null when there is no previous audit (first audit) or it
 *   had no performance score.
 * @param currentScore performance score of the audit that just completed -
 *   null when Lighthouse produced no score.
 */
export function shouldAlertPerformanceDrop(
  previousScore: number | null,
  currentScore: number | null,
): boolean {
  if (previousScore === null || currentScore === null) return false;
  if (previousScore < PERFORMANCE_DROP_MIN_BASELINE) return false;
  return previousScore - currentScore >= PERFORMANCE_DROP_THRESHOLD;
}
