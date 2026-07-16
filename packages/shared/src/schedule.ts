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
