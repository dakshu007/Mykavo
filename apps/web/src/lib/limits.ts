/**
 * Server-side plan limit enforcement (spec §39). Frontend checks are UX
 * only - every mutating operation re-checks here. Reads limits exclusively
 * from src/config/plans.ts.
 */

import { isMissingTableError, prisma } from "@mykavo/database";
import { logger } from "@/lib/logger";
import { formatLimit, nextPlanUp, type Plan } from "@/config/plans";
import { getWorkspacePlan, getEffectiveWebsiteLimit } from "@/lib/billing/subscription";
import { hasSeatAvailable } from "@/lib/team";

export { getWorkspacePlan, getEffectiveWebsiteLimit };

/** Max simultaneously QUEUED/RUNNING scans per workspace (abuse guard, spec §43). */
export const MAX_CONCURRENT_SCANS_PER_WORKSPACE = 10;

export class LimitError extends Error {
  constructor(
    public readonly code:
      | "WEBSITE_LIMIT"
      | "PAGE_LIMIT"
      | "SCAN_CONCURRENCY"
      | "MANUAL_SCAN_QUOTA"
      | "BASELINE_SCAN_QUOTA"
      | "MEMBER_LIMIT",
    message: string,
  ) {
    super(message);
    this.name = "LimitError";
  }
}

function startOfUtcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "in about 5 hours" / "in a few minutes", for the quota message. */
export function retryIn(oldestUse: Date, now: Date = new Date()): string {
  const ms = oldestUse.getTime() + DAY_MS - now.getTime();
  if (ms <= 60 * 60 * 1000) return "within the hour";
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Baseline scans used in the last 24 hours - counted from scan_quota_use,
 * which keeps its rows when a website (and so its scans) is deleted. A
 * baseline that failed outright does not count, so retrying a site that was
 * down is never blocked. Null when the table does not exist yet.
 */
async function baselineUse(workspaceId: string): Promise<{ used: number; oldest: Date | null } | null> {
  const where = {
    workspaceId,
    kind: "baseline",
    createdAt: { gte: new Date(Date.now() - DAY_MS) },
    OR: [{ scanId: null }, { scan: { is: { status: { not: "FAILED" as const } } } }],
  };
  try {
    const [used, oldest] = await Promise.all([
      prisma.scanQuotaUse.count({ where }),
      prisma.scanQuotaUse.findFirst({ where, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    ]);
    return { used, oldest: oldest?.createdAt ?? null };
  } catch (err) {
    if (isMissingTableError(err)) {
      logger.warn("baseline quota not enforced: run migration 20261002090000_scan_quota_use");
      return null;
    }
    throw err;
  }
}

/** Record a baseline scan against the workspace's quota. Never fails the scan. */
export async function recordBaselineUse(workspaceId: string, scanId: string): Promise<void> {
  await prisma.scanQuotaUse
    .create({ data: { workspaceId, scanId, kind: "baseline" } })
    .catch((err: unknown) => {
      if (!isMissingTableError(err)) logger.error("could not record baseline quota use", { workspaceId, scanId }, err);
    });
}

/**
 * Guards a scan trigger (spec §43): the workspace must be under the concurrent-
 * scan cap, and - for MANUAL re-scans - under its plan's daily manual quota.
 * Throws LimitError (callers map to HTTP 429).
 */
export async function assertScanAllowed(
  workspaceId: string,
  plan: Plan,
  triggerType: "BASELINE" | "MANUAL",
): Promise<void> {
  const inFlight = await prisma.scan.count({
    where: { website: { workspaceId }, status: { in: ["QUEUED", "RUNNING"] } },
  });
  if (inFlight >= MAX_CONCURRENT_SCANS_PER_WORKSPACE) {
    throw new LimitError(
      "SCAN_CONCURRENCY",
      `Too many scans running at once (limit ${MAX_CONCURRENT_SCANS_PER_WORKSPACE}). Wait for some to finish, then try again.`,
    );
  }

  if (triggerType === "BASELINE" && plan.limits.baselineScansPer24h !== Infinity) {
    const use = await baselineUse(workspaceId);
    if (use && use.used >= plan.limits.baselineScansPer24h) {
      const n = plan.limits.baselineScansPer24h;
      throw new LimitError(
        "BASELINE_SCAN_QUOTA",
        `The ${plan.name} plan includes ${n} new baseline scan${n === 1 ? "" : "s"} per 24 hours, and ${n === 1 ? "it has" : "they have"} been used - including for websites that were removed. You can start another ${use.oldest ? retryIn(use.oldest) : "tomorrow"}, or upgrade for more.`,
      );
    }
  }

  if (triggerType === "MANUAL" && plan.limits.manualScansPerDay !== Infinity) {
    const usedToday = await prisma.scan.count({
      where: {
        website: { workspaceId },
        triggerType: "MANUAL",
        createdAt: { gte: startOfUtcDay() },
      },
    });
    if (usedToday >= plan.limits.manualScansPerDay) {
      throw new LimitError(
        "MANUAL_SCAN_QUOTA",
        `You've used all ${plan.limits.manualScansPerDay} manual scans for today (resets at midnight UTC).`,
      );
    }
  }
}

/** Throws LimitError when the workspace cannot add another website. */
export async function assertCanAddWebsite(workspaceId: string): Promise<void> {
  const [plan, limit] = await Promise.all([
    getWorkspacePlan(workspaceId),
    getEffectiveWebsiteLimit(workspaceId),
  ]);
  if (limit === Infinity) return;
  const count = await prisma.website.count({ where: { workspaceId } });
  if (count >= limit) {
    const next = nextPlanUp(plan.id);
    const hint = next
      ? `Upgrade to ${next.name} to monitor up to ${formatLimit(next.limits.websites)}.`
      : "Remove a website you no longer monitor to free up a slot, or email support@mykavo.app.";
    throw new LimitError(
      "WEBSITE_LIMIT",
      `Your ${plan.name} plan monitors up to ${formatLimit(limit)} website${limit === 1 ? "" : "s"}. ${hint}`,
    );
  }
}

/**
 * Throws LimitError when the workspace has no free seat for another member.
 * Seats = active members + pending (unaccepted, unexpired) invites, so a
 * standing invite can never overshoot the plan when accepted. Teams are a
 * paid feature - Free is single-seat, which yields the upgrade message.
 */
export async function assertCanInviteMember(workspaceId: string): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId);
  const [activeMembers, pendingInvites] = await Promise.all([
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.workspaceInvite.count({
      where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
    }),
  ]);
  if (hasSeatAvailable(plan.limits.maxMembers, activeMembers, pendingInvites)) return;

  const next = nextPlanUp(plan.id);
  const message =
    plan.id === "free"
      ? `Team members come with a paid plan. Upgrade to ${next?.name ?? "Pro"} to invite up to ${next?.limits.maxMembers ?? 3} people.`
      : `Your ${plan.name} plan includes ${plan.limits.maxMembers} seats (members plus pending invites). Remove a member or revoke an invite to free one up${
          next && next.limits.maxMembers > plan.limits.maxMembers
            ? `, or upgrade to ${next.name} for ${next.limits.maxMembers}.`
            : "."
        }`;
  throw new LimitError("MEMBER_LIMIT", message);
}

/**
 * Throws LimitError when setting `requestedCount` monitored pages on a
 * website would exceed the plan's per-website page limit. Only gates new
 * selections - websites that already exceed the limit keep their pages.
 */
export async function assertPageLimit(
  workspaceId: string,
  _websiteId: string,
  requestedCount: number,
): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId);
  if (plan.limits.pagesPerWebsite === Infinity) return;
  if (requestedCount > plan.limits.pagesPerWebsite) {
    const next = nextPlanUp(plan.id);
    const upsell = next
      ? ` Upgrade to ${next.name} to monitor ${formatLimit(next.limits.pagesPerWebsite)} per website.`
      : "";
    throw new LimitError(
      "PAGE_LIMIT",
      `Your ${plan.name} plan monitors up to ${formatLimit(plan.limits.pagesPerWebsite)} pages per website.${upsell}`,
    );
  }
}
