/**
 * "Update available" emails.
 *
 * WordPress plugin: once an hour the worker asks WordPress.org which version
 * of the MyKavo plugin is current. A version it has not seen becomes a
 * release, and everyone whose connected site runs an older plugin gets one
 * email about it - automatically while "WordPress plugin update" is on in
 * Admin > Automations, or when an admin presses Send.
 *
 * Android app: sent only when an admin presses Send for a version in Admin >
 * Automations > Update emails.
 *
 * Nobody hears about the same version twice (product_update_notice), nor
 * gets two update emails within 72 hours, nor any after unsubscribing.
 */

import {
  isMissingTableError,
  loadAndroidAppUsers,
  loadPluginInstalls,
  loadUpdateNoticeState,
  prisma,
} from "@mykavo/database";
import { renderAutomation } from "@mykavo/email";
import {
  PRODUCT_ANDROID,
  PRODUCT_WORDPRESS,
  UPDATE_EMAIL_SPACING_MS,
  WPORG_PLUGIN_INFO_URL,
  appUpdateRecipients,
  eligibleForUpdateEmail,
  highestVersion,
  isVersion,
  parseWpOrgPluginInfo,
  pluginUpdateRecipients,
} from "@mykavo/shared";
import { appBase } from "./automation-data";
import { sendAutomatedEmail } from "./automation-send";
import { loadAutomations, type Automations } from "./automation-settings";
import { logger } from "./logger";

const WPORG_CHECK_EVERY_MS = 60 * 60 * 1000;
/** Emails per product per run - a burst never outruns the email provider. */
const SENDS_PER_RUN = 40;

let lastWpOrgCheck = 0;

/** The current plugin version on WordPress.org, recorded as a release. Null if unlisted or unreachable. */
async function checkWordPressOrg(): Promise<void> {
  if (Date.now() - lastWpOrgCheck < WPORG_CHECK_EVERY_MS) return;
  lastWpOrgCheck = Date.now();
  let info: ReturnType<typeof parseWpOrgPluginInfo> = null;
  try {
    const res = await fetch(WPORG_PLUGIN_INFO_URL, {
      headers: { accept: "application/json", "user-agent": "MyKavo release check (+https://mykavo.app)" },
      signal: AbortSignal.timeout(15_000),
    });
    // 404 means the plugin is not listed yet (still in review): nothing to do.
    if (!res.ok) return;
    info = parseWpOrgPluginInfo(await res.json());
  } catch (err) {
    logger.warn("WordPress.org release check failed", { error: err instanceof Error ? err.message : String(err) });
    return;
  }
  if (!info) return;
  const existing = await prisma.productRelease.findUnique({
    where: { product_version: { product: PRODUCT_WORDPRESS, version: info.version } },
    select: { id: true, notes: true },
  });
  if (!existing) {
    await prisma.productRelease.create({
      data: { product: PRODUCT_WORDPRESS, version: info.version, notes: info.notes, source: "wordpress.org" },
    });
    logger.info("new WordPress plugin release seen on WordPress.org", { version: info.version });
  } else if (Array.isArray(existing.notes) && existing.notes.length === 0 && info.notes.length) {
    // An admin queued this version before WordPress.org had its changelog.
    await prisma.productRelease.update({ where: { id: existing.id }, data: { notes: info.notes } });
  }
}

interface ReleaseRow {
  id: string;
  version: string;
  notes: unknown;
  source: string;
  sendRequestedAt: Date | null;
}

/** The release to announce for a product now, or null. */
async function releaseToSend(product: string, automatic: boolean): Promise<ReleaseRow | null> {
  const rows = await prisma.productRelease.findMany({
    where: { product },
    select: { id: true, version: true, notes: true, source: true, sendRequestedAt: true },
  });
  // Announce the newest version only; older ones are superseded.
  const latest = highestVersion(rows.map((r) => r.version));
  const row = rows.find((r) => r.version === latest);
  if (!row) return null;
  // Automatic for WordPress.org releases while the automation is on;
  // anything else only when an admin pressed Send.
  if (row.sendRequestedAt || (automatic && row.source === "wordpress.org")) return row;
  return null;
}

const notesOf = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 8) : [];

async function recordNotice(product: string, version: string, userId: string, notificationId: string): Promise<void> {
  await prisma.productUpdateNotice
    .create({ data: { product, version, userId, notificationId } })
    .catch((err: unknown) => logger.error("could not record update notice", { product, version, userId }, err));
}

async function sendPluginUpdates(a: Automations): Promise<number> {
  const release = await releaseToSend(PRODUCT_WORDPRESS, a.settings.plugin_update.enabled);
  if (!release || !isVersion(release.version)) return 0;
  const [installs, state] = await Promise.all([
    loadPluginInstalls(prisma),
    loadUpdateNoticeState(prisma, PRODUCT_WORDPRESS, release.version, UPDATE_EMAIL_SPACING_MS),
  ]);
  const people = eligibleForUpdateEmail(pluginUpdateRecipients(installs, release.version), state).slice(0, SENDS_PER_RUN);
  let sent = 0;
  for (const p of people) {
    const result = await sendAutomatedEmail({
      workspaceId: p.workspaceId,
      to: p.email,
      key: "plugin_update",
      unsubscribable: true,
      a,
      render: (unsubscribeUrl) =>
        renderAutomation(
          { key: "plugin_update", data: { name: p.name, version: release.version, notes: notesOf(release.notes), sites: p.sites, unsubscribeUrl } },
          a.settings,
        ),
    });
    if (result.ok) {
      await recordNotice(PRODUCT_WORDPRESS, release.version, p.userId, result.notificationId);
      sent++;
    } else {
      logger.warn("plugin update email failed", { userId: p.userId, error: result.error });
    }
  }
  return sent;
}

async function sendAppUpdates(a: Automations): Promise<number> {
  // Never automatic: the app has no store to read a version from.
  const release = await releaseToSend(PRODUCT_ANDROID, false);
  if (!release || !isVersion(release.version)) return 0;
  const [users, state] = await Promise.all([
    loadAndroidAppUsers(prisma),
    loadUpdateNoticeState(prisma, PRODUCT_ANDROID, release.version, UPDATE_EMAIL_SPACING_MS),
  ]);
  const people = eligibleForUpdateEmail(appUpdateRecipients(users, release.version), state).slice(0, SENDS_PER_RUN);
  let sent = 0;
  for (const p of people) {
    const result = await sendAutomatedEmail({
      workspaceId: p.workspaceId,
      to: p.email,
      key: "app_update",
      unsubscribable: true,
      a,
      render: (unsubscribeUrl) =>
        renderAutomation(
          {
            key: "app_update",
            data: {
              name: p.name,
              version: release.version,
              currentVersion: p.version,
              notes: notesOf(release.notes),
              downloadUrl: `${appBase}/dashboard/app`,
              unsubscribeUrl,
            },
          },
          a.settings,
        ),
    });
    if (result.ok) {
      await recordNotice(PRODUCT_ANDROID, release.version, p.userId, result.notificationId);
      sent++;
    } else {
      logger.warn("app update email failed", { userId: p.userId, error: result.error });
    }
  }
  return sent;
}

/** One pass: check WordPress.org (hourly), then send what is due. */
export async function runProductUpdates(): Promise<void> {
  try {
    await checkWordPressOrg();
    const a = await loadAutomations();
    const [plugin, app] = [await sendPluginUpdates(a), await sendAppUpdates(a)];
    if (plugin || app) logger.info("update emails sent", { plugin, app });
  } catch (err) {
    if (isMissingTableError(err)) {
      logger.warn("update emails skipped: run migration 20261002120000_product_updates");
      return;
    }
    throw err;
  }
}
