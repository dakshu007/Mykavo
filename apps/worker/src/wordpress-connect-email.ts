/**
 * "Finish connecting WordPress": one email to someone who pressed Connect in
 * the WordPress plugin and never approved it (see wordpress-connect.ts in
 * @mykavo/shared for who counts as stuck).
 *
 * Runs inside the hourly activation sweep on the ACTIVATION share of the
 * email budget, like "Baseline ready": it is help with something the person
 * started, not marketing, so it carries no unsubscribe link and goes through
 * the transactional provider. It is still skipped for workspaces that
 * switched email off.
 *
 * Needs the send log (email_automation migration): without it there would
 * be no way to tell the email was already sent, so nothing goes out.
 */

import { prisma } from "@mykavo/database";
import { renderAutomation } from "@mykavo/email";
import {
  WORDPRESS_CONNECT_LOOKBACK_MS,
  displayPersonName,
  hostOfUrl,
  pickConnectReminders,
  wordpressPluginUrl,
  type ConnectAttempt,
} from "@mykavo/shared";
import { sendAutomatedEmail } from "./automation-send";
import { sentBy, type Automations } from "./automation-settings";
import { logger } from "./logger";
import { resolveEmailConfig } from "./notify";

const GAP_MS = 700;
/** Connect presses read per run; a few days of them, so small. */
const MAX_EVENTS = 1000;

const pause = () => new Promise((resolve) => setTimeout(resolve, GAP_MS));

function text(meta: unknown, key: string): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const v = (meta as Record<string, unknown>)[key];
  return typeof v === "string" && v.length <= 2000 ? v : null;
}

export async function sendWordPressConnectReminders(budget: number, a: Automations): Promise<number> {
  if (budget <= 0 || !a.ready || !a.settings.wordpress_connect.enabled) return 0;
  const now = new Date();

  const events = await prisma.activityEvent.findMany({
    where: {
      type: "wordpress_connect_started",
      workspaceId: { not: null },
      createdAt: { gte: new Date(now.getTime() - WORDPRESS_CONNECT_LOOKBACK_MS) },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_EVENTS,
    select: { userId: true, workspaceId: true, meta: true, createdAt: true },
  });
  const attempts: ConnectAttempt[] = [];
  for (const e of events) {
    const siteUrl = text(e.meta, "site");
    if (!e.workspaceId || !siteUrl) continue;
    attempts.push({ userId: e.userId, workspaceId: e.workspaceId, siteUrl, adminUrl: text(e.meta, "admin"), at: e.createdAt });
  }
  if (attempts.length === 0) return 0;

  const workspaceIds = [...new Set(attempts.map((x) => x.workspaceId))];
  const [connections, sent] = await Promise.all([
    prisma.siteConnection.findMany({
      where: { workspaceId: { in: workspaceIds }, platform: "wordpress", connectedAt: { not: null }, revokedAt: null },
      select: { workspaceId: true, siteUrl: true, website: { select: { url: true } } },
    }),
    prisma.notification.findMany({
      where: { workspaceId: { in: workspaceIds }, status: "SENT", ...sentBy("wordpress_connect", a) },
      select: { workspaceId: true },
    }),
  ]);
  const connectedHosts = new Map<string, Set<string>>();
  for (const c of connections) {
    const set = connectedHosts.get(c.workspaceId) ?? new Set<string>();
    for (const h of [hostOfUrl(c.siteUrl), hostOfUrl(c.website.url)]) if (h) set.add(h);
    connectedHosts.set(c.workspaceId, set);
  }
  const due = pickConnectReminders(attempts, {
    now,
    connectedHosts,
    alreadySent: new Set(sent.map((n) => n.workspaceId)),
  });

  let count = 0;
  for (const attempt of due) {
    if (count >= budget) break;
    const host = hostOfUrl(attempt.siteUrl);
    const pluginUrl = wordpressPluginUrl(attempt.siteUrl, attempt.adminUrl);
    if (!host || !pluginUrl) continue;
    if (!(await resolveEmailConfig(attempt.workspaceId))) continue; // email switched off

    const [user, websites] = await Promise.all([
      prisma.user.findUnique({ where: { id: attempt.userId }, select: { name: true, email: true } }),
      prisma.website.findMany({ where: { workspaceId: attempt.workspaceId }, select: { name: true, url: true } }),
    ]);
    if (!user?.email) continue;
    const website = websites.find((w) => hostOfUrl(w.url) === host) ?? null;

    const result = await sendAutomatedEmail({
      workspaceId: attempt.workspaceId,
      to: user.email,
      key: "wordpress_connect",
      unsubscribable: false,
      a,
      render: () =>
        renderAutomation(
          {
            key: "wordpress_connect",
            data: {
              name: displayPersonName(user.name, user.email),
              siteHost: host,
              websiteName: website?.name ?? null,
              pluginUrl,
            },
          },
          a.settings,
        ),
    });
    if (!result.ok) {
      logger.warn("wordpress connect reminder failed, stopping this run", {
        workspaceId: attempt.workspaceId,
        error: result.error,
      });
      break;
    }
    logger.info("wordpress connect reminder sent", { workspaceId: attempt.workspaceId, userId: attempt.userId });
    count++;
    await pause();
  }
  return count;
}
