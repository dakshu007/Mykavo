/**
 * Who a product event belongs to, and the properties every product event
 * carries (plan, trial state, how the account found MyKavo). Sending lives
 * in @mykavo/shared/product-events; this module only reads the database.
 *
 * Nothing personal leaves here: the distinct id is the owner's user id, the
 * referrer becomes a coarse bucket, and internal accounts are flagged (not
 * dropped) so they can be filtered out in Mixpanel.
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { getWorkspaceEntitlement } from "./subscription";
import { isInternalEmail } from "./platform-admin";
import { isMissingTableError } from "./automations";

type Db = PrismaClient | Prisma.TransactionClient;

export type TrialStatus = "in_trial" | "trial_ended" | "never_trialed" | "paid";

export interface ProductEventContext {
  /** The workspace owner's user id: one Mixpanel person per account. */
  distinctId: string;
  props: {
    plan_at_time: string;
    trial_status: TrialStatus;
    acquisition_source: string;
    is_internal: boolean;
  };
  /** Raw dates the callers turn into durations. */
  ownerCreatedAt: Date;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
}

/** Referrer host + landing path to a coarse, non-identifying bucket. */
export function acquisitionBucket(attr: { referrer: string; landing: string } | null): string {
  if (!attr) return "unknown";
  const ref = attr.referrer.toLowerCase();
  if (!ref) return attr.landing.startsWith("/tools") ? "direct_tool" : "direct";
  // Google-owned hosts that are not search come before the search check.
  if (/(chromewebstore|chrome\.google)/.test(ref)) return "chrome_web_store";
  if (/(chatgpt|openai|claude|perplexity|gemini|copilot)/.test(ref)) return "ai_assistant";
  if (/(^|\.)google\./.test(ref)) return "google_organic";
  if (/(^|\.)(bing|duckduckgo|yahoo|ecosia|yandex|baidu)\./.test(ref)) return "other_search";
  if (/(wordpress\.org|wordpress\.com)/.test(ref)) return "wordpress";
  if (/(linkedin|lnkd)/.test(ref)) return "linkedin";
  if (/(twitter|x\.com|t\.co)$/.test(ref) || ref === "x.com") return "x";
  if (/(reddit|news\.ycombinator|producthunt|facebook|instagram|youtube)/.test(ref)) return "social_community";
  if (/mykavo\.app$/.test(ref)) return "direct";
  return "referral";
}

export function trialStatusOf(
  planBilledBy: string | null | undefined,
  trial: { endsAt: Date } | null,
  now: Date = new Date(),
): TrialStatus {
  if (planBilledBy === "dodo" || planBilledBy === "shopify") return "paid";
  if (planBilledBy === "trial") return "in_trial";
  if (trial) return trial.endsAt <= now ? "trial_ended" : "in_trial";
  return "never_trialed";
}

async function optional<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (err) {
    if (isMissingTableError(err)) return fallback;
    throw err;
  }
}

/** Context for a workspace's events, or null when the workspace is gone. */
export async function productEventContext(db: Db, workspaceId: string): Promise<ProductEventContext | null> {
  const ws = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true, owner: { select: { email: true, createdAt: true } } },
  });
  if (!ws) return null;
  const [ent, trial, attr] = await Promise.all([
    getWorkspaceEntitlement(db, workspaceId),
    optional(db.workspaceTrial.findUnique({ where: { workspaceId }, select: { startedAt: true, endsAt: true } }), null),
    optional(
      db.signupAttribution.findUnique({ where: { userId: ws.ownerId }, select: { referrer: true, landing: true } }),
      null,
    ),
  ]);
  return {
    distinctId: ws.ownerId,
    props: {
      plan_at_time: ent?.planId ?? "free",
      trial_status: trialStatusOf(ent?.billedBy, trial),
      acquisition_source: acquisitionBucket(attr),
      is_internal: isInternalEmail(ws.owner.email),
    },
    ownerCreatedAt: ws.owner.createdAt,
    trialStartedAt: trial?.startedAt ?? null,
    trialEndsAt: trial?.endsAt ?? null,
  };
}

/** How a website is set up: through the WordPress plugin, the Shopify app, or by hand. */
export async function platformSetupOf(db: Db, websiteId: string): Promise<string> {
  const conn = await optional(
    db.siteConnection.findFirst({
      where: { websiteId, revokedAt: null, connectedAt: { not: null } },
      select: { platform: true },
      orderBy: { createdAt: "asc" },
    }),
    null,
  );
  if (!conn) return "manual";
  if (conn.platform === "wordpress") return "wordpress_plugin";
  if (conn.platform === "shopify") return "shopify_app";
  return conn.platform;
}
