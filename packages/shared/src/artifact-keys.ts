/**
 * Object-storage key layout (spec §60).
 *
 * These live in one place because two unrelated modules must agree on them
 * exactly: the comparison step WRITES a diff image, and the retention sweep
 * DELETES it months later from a different process. Previously the sweep
 * reconstructed the diff key by string-replacing "screenshot.jpg" in the
 * screenshot key - which silently stopped working the moment screenshots
 * became content-addressed, orphaning every diff image forever.
 */

/**
 * Where a page's screenshot lives. CONTENT-ADDRESSED: the key is the hash of
 * the stored bytes, so an unchanged page is stored once no matter how many
 * times it is scanned.
 *
 * The consequence to remember everywhere else: one object may be referenced
 * by many snapshots, so it may only be deleted once the LAST reference is
 * gone. See `findUnreferencedScreenshotKeys` in @mykavo/database.
 */
export function screenshotPrefix(workspaceId: string): string {
  return `ws/${workspaceId}/shot`;
}

/**
 * Where a visual diff image lives. Unlike screenshots these are NOT shared:
 * a diff belongs to exactly one page in one scan, so it is deleted with that
 * snapshot.
 *
 * Deliberately identical to the pre-existing layout
 * (`<artifactPrefix>/diff.png`) so diffs already in the bucket keep resolving
 * after screenshots move to content addressing.
 */
export function diffKey(params: {
  workspaceId: string;
  scanId: string;
  monitoredPageId: string;
}): string {
  return `ws/${params.workspaceId}/scan/${params.scanId}/${params.monitoredPageId}/diff.png`;
}

/**
 * True for a content-addressed screenshot key, i.e. one that may be shared by
 * several snapshots. Legacy per-scan keys are owned by a single snapshot.
 * Reference counting is applied to both regardless - a legacy key simply
 * always has a count of one - so this is for diagnostics, not control flow.
 */
export function isContentAddressedScreenshotKey(key: string): boolean {
  return /^ws\/[^/]+\/shot\/[0-9a-f]{64}\.jpg$/.test(key);
}
