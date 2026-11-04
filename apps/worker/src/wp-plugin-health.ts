/**
 * WordPress Plugin Health sweep (Starter, Pro, Agency).
 *
 * The MyKavo plugin uploads each connected site's installed plugins once a
 * day (POST /api/wp/v1/plugins -> wp_plugin_inventory). This sweep asks
 * WordPress.org about each plugin at most once a week and records whether it
 * is closed, has had no release in over two years, is fine, or is not on
 * WordPress.org at all (premium or custom: never flagged).
 *
 * Polite by construction: one lookup per slug however many sites use it,
 * one a second, at most MAX_LOOKUPS_PER_RUN a run. The cron runs daily so
 * the cap spreads the weekly work over the week, and a plugin installed
 * today is looked at tomorrow rather than next week.
 *
 * Then one email per workspace about plugins that are newly flagged
 * (alertedAt marks what was already said). It spends the ACTIVATION share of
 * the email budget, so it can never use up what CRITICAL alerts need, and
 * it is skipped for workspaces that switched email off.
 */

import { getWorkspaceEntitlement, prisma } from "@mykavo/database";
import { pluginHealthAlertEmail, sendEmail, type PluginHealthItem } from "@mykavo/email";
import {
  classifyWpOrgPlugin,
  includesWpPluginHealth,
  isFlaggedWpPluginStatus,
  toPlanTier,
  wpOrgPluginInfoUrl,
  type WpPluginVerdict,
} from "@mykavo/shared";
import { activationEmailAllowance } from "./activation-email";
import { resolveEmailConfig } from "./notify";
import { logger } from "./logger";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Each plugin is looked up again after this long. */
const RECHECK_AFTER_MS = 7 * DAY_MS;
/** WordPress.org lookups per run, one a second. */
const MAX_LOOKUPS_PER_RUN = 200;
const LOOKUP_GAP_MS = 1_000;
/** Stale rows read to find this run's slugs; enough for 200 distinct ones. */
const MAX_CANDIDATE_ROWS = 5_000;
/** Plugins listed in one email; the rest wait for the next run. */
const MAX_PLUGINS_PER_EMAIL = 25;
const SEND_GAP_MS = 700;

const appBase = (process.env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Only sites still connected to the plugin are looked at. */
const connectedWordPress = {
  website: { siteConnections: { some: { platform: "wordpress", revokedAt: null } } },
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Plan check per workspace, cached for the run. */
function planChecker(): (workspaceId: string) => Promise<boolean> {
  const cache = new Map<string, boolean>();
  return async (workspaceId) => {
    const hit = cache.get(workspaceId);
    if (hit !== undefined) return hit;
    const ent = await getWorkspaceEntitlement(prisma, workspaceId);
    const allowed = ent ? includesWpPluginHealth(toPlanTier(ent.planId)) : false;
    cache.set(workspaceId, allowed);
    return allowed;
  };
}

/** One WordPress.org lookup. Null when the answer said nothing (retry later). */
async function lookUp(slug: string): Promise<WpPluginVerdict | null> {
  try {
    const res = await fetch(wpOrgPluginInfoUrl(slug), {
      headers: { accept: "application/json", "user-agent": "MyKavo Plugin Health (+https://mykavo.app)" },
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
    const raw = await res.text();
    let json: unknown = null;
    if (raw.length <= 512 * 1024) {
      try {
        json = JSON.parse(raw);
      } catch {
        json = null;
      }
    }
    return classifyWpOrgPlugin(res.status, json);
  } catch (err) {
    logger.warn("WordPress.org plugin lookup failed", {
      slug,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Record a verdict on every row with the slug; a changed status may be alerted again. */
async function store(slug: string, verdict: WpPluginVerdict, now: Date): Promise<void> {
  const data = {
    wporgStatus: verdict.status,
    lastUpdated: verdict.lastUpdated ? new Date(`${verdict.lastUpdated}T00:00:00Z`) : null,
    reason: verdict.reason,
    checkedAt: now,
  };
  await prisma.$transaction([
    prisma.wpPluginInventory.updateMany({
      where: { slug, wporgStatus: { not: verdict.status } },
      data: { ...data, alertedAt: null },
    }),
    prisma.wpPluginInventory.updateMany({ where: { slug, wporgStatus: verdict.status }, data }),
  ]);
}

async function checkPlugins(allowed: (workspaceId: string) => Promise<boolean>, now: Date): Promise<{ looked: number; failed: number }> {
  const candidates = await prisma.wpPluginInventory.findMany({
    where: {
      ...connectedWordPress,
      OR: [{ checkedAt: null }, { checkedAt: { lt: new Date(now.getTime() - RECHECK_AFTER_MS) } }],
    },
    orderBy: { checkedAt: { sort: "asc", nulls: "first" } },
    take: MAX_CANDIDATE_ROWS,
    select: { slug: true, website: { select: { workspaceId: true } } },
  });

  // Only plugins a paying workspace has installed cost a lookup.
  const slugs: string[] = [];
  const seen = new Set<string>();
  for (const row of candidates) {
    if (slugs.length >= MAX_LOOKUPS_PER_RUN) break;
    if (seen.has(row.slug)) continue;
    if (!(await allowed(row.website.workspaceId))) continue;
    seen.add(row.slug);
    slugs.push(row.slug);
  }

  let failed = 0;
  for (const [i, slug] of slugs.entries()) {
    if (i > 0) await pause(LOOKUP_GAP_MS);
    const verdict = await lookUp(slug);
    if (!verdict) {
      failed++;
      continue;
    }
    await store(slug, verdict, new Date());
  }
  return { looked: slugs.length, failed };
}

async function sendAlerts(allowed: (workspaceId: string) => Promise<boolean>): Promise<number> {
  let budget = await activationEmailAllowance();
  if (budget <= 0) return 0;

  const rows = await prisma.wpPluginInventory.findMany({
    where: { ...connectedWordPress, wporgStatus: { in: ["closed", "outdated"] }, alertedAt: null },
    orderBy: { createdAt: "asc" },
    // Flagged plugins are a small share of all installed ones.
    take: 10_000,
    select: {
      id: true,
      name: true,
      wporgStatus: true,
      reason: true,
      website: { select: { id: true, url: true, workspaceId: true, workspace: { select: { owner: { select: { email: true } } } } } },
    },
  });

  const byWorkspace = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byWorkspace.get(r.website.workspaceId) ?? [];
    list.push(r);
    byWorkspace.set(r.website.workspaceId, list);
  }

  let sent = 0;
  for (const [workspaceId, list] of byWorkspace) {
    if (budget <= 0) break;
    try {
      if (!(await allowed(workspaceId))) continue;
      const owner = list[0]!.website.workspace.owner.email;
      const config = await resolveEmailConfig(workspaceId);
      if (!owner || !config) continue; // email switched off

      const batch = list.slice(0, MAX_PLUGINS_PER_EMAIL);
      // Claim first: a concurrent run, or a crash while sending, can cost at
      // most a missed email, never a repeated one.
      const claim = await prisma.wpPluginInventory.updateMany({
        where: { id: { in: batch.map((r) => r.id) }, alertedAt: null },
        data: { alertedAt: new Date() },
      });
      if (claim.count === 0) continue;

      const plugins: PluginHealthItem[] = [];
      for (const r of batch) {
        if (!isFlaggedWpPluginStatus(r.wporgStatus)) continue;
        plugins.push({
          name: r.name,
          websiteHost: hostOf(r.website.url),
          status: r.wporgStatus,
          reason: r.reason ?? (r.wporgStatus === "closed" ? "Closed on WordPress.org." : "Not updated on WordPress.org in over 2 years."),
        });
      }
      if (plugins.length === 0) continue;
      const siteIds = [...new Set(batch.map((r) => r.website.id))];
      const mail = pluginHealthAlertEmail({
        plugins,
        dashboardUrl: siteIds.length === 1 ? `${appBase}/dashboard/websites/${siteIds[0]}` : `${appBase}/dashboard/websites`,
      });

      if (sent > 0) await pause(SEND_GAP_MS);
      const result = await sendEmail({ to: [owner], subject: mail.subject, html: mail.html, text: mail.text });
      await prisma.notification.create({
        data: {
          workspaceId,
          websiteId: siteIds.length === 1 ? siteIds[0]! : null,
          channelType: "EMAIL",
          recipient: owner,
          subject: mail.subject,
          status: result.ok ? "SENT" : "FAILED",
          sentAt: result.ok ? new Date() : null,
          errorMessage: result.error ?? null,
        },
      });
      budget--;
      if (!result.ok) {
        // Not sent: let the next run try again.
        await prisma.wpPluginInventory.updateMany({ where: { id: { in: batch.map((r) => r.id) } }, data: { alertedAt: null } });
        logger.warn("plugin health email failed; stopping this run", { workspaceId, error: result.error });
        break;
      }
      sent++;
    } catch (err) {
      logger.error("plugin health alert failed", { workspaceId }, err);
    }
  }
  return sent;
}

export async function runPluginHealthSweep(now: Date = new Date()): Promise<void> {
  const allowed = planChecker();
  const { looked, failed } = await checkPlugins(allowed, now);
  let emails = 0;
  try {
    emails = await sendAlerts(allowed);
  } catch (err) {
    logger.error("plugin health alerts skipped this run", {}, err);
  }
  logger.info("plugin health sweep finished", { lookups: looked, failed, emails });
}
