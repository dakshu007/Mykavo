import { prisma } from "@mykavo/database";
import { displayPersonName } from "@mykavo/shared";

/**
 * Who has joined MyKavo, for the operator's eyes only.
 *
 * Reads existing rows - there is deliberately no signups table. `User` already
 * records createdAt, and a website count already tells you whether somebody
 * did anything after registering. A separate log would be a second source of
 * truth for a fact the first one already holds, and would start disagreeing
 * with it the first time a user was deleted.
 *
 * Activation is the reason this is worth looking at rather than a vanity
 * count. A signup that never added a website is not a customer yet, and
 * knowing which is which is the difference between "we got ten users" and
 * "we got one".
 */

export const RECENT_SIGNUPS_LIMIT = 25;

export interface SignupRow {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  /** Websites across every workspace the user owns. 0 means not activated. */
  websites: number;
  /** True when the account has done the one thing that makes it a real user. */
  activated: boolean;
}

export interface SignupsReport {
  rows: SignupRow[];
  total: number;
  /** Signups in the last 7 days, for a sense of rate rather than total. */
  lastSevenDays: number;
  /** Null when the figures could not be read; the card says so rather than showing zero. */
  error: string | null;
}

const EMPTY: SignupsReport = { rows: [], total: 0, lastSevenDays: 0, error: null };

export function isActivated(websites: number): boolean {
  return websites > 0;
}

/**
 * Never throws. A failure to list users must not take down the page that also
 * carries worker liveness - the one fact on it worth knowing urgently.
 */
export async function getRecentSignups(
  limit: number = RECENT_SIGNUPS_LIMIT,
): Promise<SignupsReport> {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [users, total, lastSevenDays] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          ownedWorkspaces: { select: { _count: { select: { websites: true } } } },
        },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);

    return {
      rows: users.map((user) => {
        const websites = user.ownedWorkspaces.reduce(
          (sum, workspace) => sum + workspace._count.websites,
          0,
        );
        return {
          id: user.id,
          // Rows created before the signup check keep whatever was stored, so
          // the list must not simply print it. Falls back to the address
          // handle rather than showing a row of dashes.
          name: displayPersonName(user.name, user.email),
          email: user.email,
          joinedAt: user.createdAt.toISOString(),
          websites,
          activated: isActivated(websites),
        };
      }),
      total,
      lastSevenDays,
      error: null,
    };
  } catch (err) {
    return {
      ...EMPTY,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** "3 minutes ago", "2 days ago" - relative to now, for a list you scan. */
export function joinedAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const minutes = Math.max(0, Math.round((now.getTime() - then) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.round(months / 12)}y ago`;
}
