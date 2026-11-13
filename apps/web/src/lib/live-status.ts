/**
 * Live progress for pages that show a scan or site audit in flight.
 *
 * Those pages used to re-render their whole server component every 3 to 6
 * seconds (router.refresh), which re-ran every query on the page, about 15 on
 * a website's page, for as long as the job ran and whether or not anything
 * had changed. Every byte Postgres sends counts as Supabase egress.
 *
 * Now the page polls one tiny status row instead (GET /api/live-status) and
 * re-renders only when that status actually moves. This module is the shared
 * vocabulary: what a status is, when a job is finished, and what counts as a
 * change worth a re-render.
 */

export type LiveWatch = "status" | "progress";

export interface LiveItem {
  status: string;
  /** Pages scanned (scans) or pages crawled (site audits). */
  progress: number;
}

export interface LiveStatus {
  items: LiveItem[];
  /** True once nothing is queued or running: the page can stop polling. */
  done: boolean;
}

const IN_FLIGHT = new Set(["QUEUED", "RUNNING"]);

export function isInFlight(status: string): boolean {
  return IN_FLIGHT.has(status);
}

/** Site audits crawl hundreds of pages; re-render every 25, not every page. */
export const AUDIT_PROGRESS_STEP = 25;

/**
 * The part of a status that should trigger a re-render. "status" pages only
 * care when a job starts or finishes; "progress" pages also move as pages
 * complete (bucketed by `step` so a fast crawl does not re-render every poll).
 */
export function liveSignature(items: LiveItem[], watch: LiveWatch, step = 1): string {
  return items
    .map((i) => (watch === "status" ? i.status : `${i.status}:${Math.floor(i.progress / Math.max(1, step))}`))
    .join("|");
}

export function liveDone(items: LiveItem[]): boolean {
  return items.every((i) => !isInFlight(i.status));
}

/** Parses `?scan=ID` or `?audits=ID,ID` (at most 20 ids). Null when neither is valid. */
export function parseLiveQuery(params: URLSearchParams): { kind: "scan" | "audits"; ids: string[] } | null {
  const scan = params.get("scan")?.trim();
  if (scan) return /^[A-Za-z0-9_-]{1,64}$/.test(scan) ? { kind: "scan", ids: [scan] } : null;
  const audits = params.get("audits");
  if (audits) {
    const ids = [...new Set(audits.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 20);
    if (ids.length === 0 || !ids.every((id) => /^[A-Za-z0-9_-]{1,64}$/.test(id))) return null;
    return { kind: "audits", ids };
  }
  return null;
}
