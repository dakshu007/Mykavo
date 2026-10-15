/**
 * Websites MyKavo pauses by itself, and resumes by the same rule:
 *
 * - DORMANT: a Free workspace nobody has opened for 30 days. Scanning sites
 *   nobody looks at costs server time and email for nothing; the first visit
 *   back resumes them (see the dashboard layout).
 * - OVER_LIMIT: a trial ended with more websites than Free allows. Upgrading
 *   resumes them.
 *
 * A website the owner paused has no row in website_auto_pause, so it is never
 * resumed by these rules.
 */

import type { PrismaClient, Prisma, WebsiteStatus } from "@prisma/client";
import { isMissingTableError } from "./automations";

type Db = PrismaClient | Prisma.TransactionClient;

export type AutoPauseReason = "DORMANT" | "OVER_LIMIT";

/** Days without anyone opening MyKavo before a Free workspace's sites pause. */
export const DORMANT_AFTER_DAYS = 30;
/** Days a dormant pause lasts before history is trimmed to the baseline. */
export const DORMANT_TRIM_AFTER_DAYS = 90;

/** The status a website returns to when resumed: monitoring if it has a baseline. */
export async function resumeStatusFor(db: Db, websiteId: string): Promise<"ACTIVE" | "PENDING"> {
  const baseline = await db.baseline.findFirst({
    where: { websiteId, status: "ACTIVE" },
    select: { id: true },
  });
  return baseline ? "ACTIVE" : "PENDING";
}

/**
 * The statuses each rule pauses from. DORMANT stops scanning, so only sites
 * being scanned (ACTIVE or ERROR) are paused. OVER_LIMIT is about how many
 * websites the plan covers, so a site still being set up (PENDING,
 * DISCOVERING, BASELINING) is paused too: otherwise it would start
 * monitoring as soon as its baseline finishes. Resuming such a site brings
 * it back as PENDING until it has a baseline (resumeStatusFor).
 */
const AUTO_PAUSABLE_STATUSES: Record<AutoPauseReason, readonly WebsiteStatus[]> = {
  DORMANT: ["ACTIVE", "ERROR"],
  OVER_LIMIT: ["ACTIVE", "ERROR", "PENDING", "DISCOVERING", "BASELINING"],
};

/**
 * Pauses websites and records why. Only websites in one of the reason's
 * AUTO_PAUSABLE_STATUSES are paused (never one already paused, so an owner's
 * own pause is not turned into MyKavo's); returns those that were.
 */
export async function autoPauseWebsites(
  db: Db,
  websites: { id: string; workspaceId: string }[],
  reason: AutoPauseReason,
  now: Date = new Date(),
): Promise<string[]> {
  const paused: string[] = [];
  for (const w of websites) {
    const res = await db.website.updateMany({
      where: { id: w.id, status: { in: [...AUTO_PAUSABLE_STATUSES[reason]] } },
      data: { status: "PAUSED" },
    });
    if (res.count !== 1) continue;
    await db.websiteAutoPause.upsert({
      where: { websiteId: w.id },
      create: { websiteId: w.id, workspaceId: w.workspaceId, reason, pausedAt: now },
      update: { reason, pausedAt: now, notifiedAt: null },
    });
    paused.push(w.id);
  }
  return paused;
}

/**
 * Resumes a workspace's auto-paused websites for the given reasons, scanning
 * them again soon. Websites the owner paused in the meantime stay paused.
 * Missing table (migration not applied): nothing to resume.
 */
export async function resumeAutoPaused(
  db: Db,
  workspaceId: string,
  reasons: AutoPauseReason[],
  options: { now?: Date; limit?: number } = {},
): Promise<{ id: string; name: string }[]> {
  const now = options.now ?? new Date();
  let rows: { websiteId: string }[];
  try {
    rows = await db.websiteAutoPause.findMany({
      where: { workspaceId, reason: { in: reasons } },
      orderBy: { pausedAt: "asc" },
      take: options.limit,
      select: { websiteId: true },
    });
  } catch (err) {
    if (isMissingTableError(err)) return [];
    throw err;
  }
  const resumed: { id: string; name: string }[] = [];
  for (const row of rows) {
    const website = await db.website.findUnique({
      where: { id: row.websiteId },
      select: { id: true, name: true, status: true },
    });
    if (website && website.status === "PAUSED") {
      await db.website.update({
        where: { id: website.id },
        data: { status: await resumeStatusFor(db, website.id), nextScanAt: now },
      });
      resumed.push({ id: website.id, name: website.name });
    }
    await db.websiteAutoPause.delete({ where: { websiteId: row.websiteId } }).catch(() => undefined);
  }
  return resumed;
}

/** Why each of these websites was auto-paused (absent: not auto-paused). */
export async function autoPauseReasons(db: Db, websiteIds: string[]): Promise<Map<string, AutoPauseReason>> {
  if (websiteIds.length === 0) return new Map();
  try {
    const rows = await db.websiteAutoPause.findMany({
      where: { websiteId: { in: websiteIds } },
      select: { websiteId: true, reason: true },
    });
    return new Map(rows.map((r) => [r.websiteId, r.reason as AutoPauseReason]));
  } catch (err) {
    if (isMissingTableError(err)) return new Map();
    throw err;
  }
}
