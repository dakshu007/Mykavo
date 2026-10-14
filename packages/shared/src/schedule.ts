/**
 * Pure scheduling helpers (spec §40). No I/O - trivially testable and shared
 * by the scheduler sweep (worker) and any UI that previews the next scan.
 */

export type ScanFrequency = "WEEKLY" | "DAILY";

const DAY_MS = 24 * 60 * 60 * 1000;

export function frequencyIntervalMs(frequency: ScanFrequency): number {
  return frequency === "DAILY" ? DAY_MS : 7 * DAY_MS;
}

/** The next scan time for a website given its frequency, measured from `from`. */
export function computeNextScanAt(frequency: ScanFrequency, from: Date): Date {
  return new Date(from.getTime() + frequencyIntervalMs(frequency));
}

/**
 * When to try again after a scan FAILED outright: the normal schedule, but
 * never more than a day away. A failed scan used to clear nextScanAt, which
 * stopped monitoring for good after one bad night - a site that came back
 * (or was relaunched on a new host) was never looked at again.
 */
export function computeRetryAfterFailure(frequency: ScanFrequency, from: Date): Date {
  return new Date(from.getTime() + Math.min(frequencyIntervalMs(frequency), DAY_MS));
}

/** A website is due when it is ACTIVE and its nextScanAt has passed. */
export function isScanDue(
  website: { status: string; nextScanAt: Date | null },
  now: Date,
): boolean {
  return (
    website.status === "ACTIVE" &&
    website.nextScanAt !== null &&
    website.nextScanAt.getTime() <= now.getTime()
  );
}

/**
 * A website moving to daily scans (an upgrade, a trial) should not wait out
 * the rest of a weekly interval: its next scan becomes a day after the last
 * one, or now if that has passed. Null when it is already due sooner.
 */
export function pulledForwardNextScan(
  current: { nextScanAt: Date | null; lastScanAt: Date | null },
  now: Date,
): Date | null {
  const dueBy = current.lastScanAt ? new Date(Math.max(now.getTime(), current.lastScanAt.getTime() + DAY_MS)) : now;
  if (!current.nextScanAt || current.nextScanAt > dueBy) return dueBy;
  return null;
}
