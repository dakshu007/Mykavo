import { compareVersions } from "./platform-fingerprint";

/**
 * "Update available" emails for things users install: which version is
 * current, who runs an older one, and who may be emailed about it. Pure -
 * the worker and the admin page load the rows.
 */

export const PRODUCT_WORDPRESS = "wordpress-plugin";
export const PRODUCT_ANDROID = "android-app";
export type Product = typeof PRODUCT_WORDPRESS | typeof PRODUCT_ANDROID;

/** WordPress.org plugin information API for the MyKavo plugin. */
export const WPORG_PLUGIN_INFO_URL =
  "https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request%5Bslug%5D=mykavo&request%5Bfields%5D%5Bsections%5D=1";

/** Gap between two update emails to the same person, whatever the product. */
export const UPDATE_EMAIL_SPACING_MS = 72 * 60 * 60 * 1000;

const VERSION_RE = /^\d{1,3}(\.\d{1,4}){1,3}$/;

export function isVersion(v: unknown): v is string {
  return typeof v === "string" && VERSION_RE.test(v);
}

/** Older than `latest`. An unknown version counts as older: it predates version reporting. */
export function isOlderVersion(current: string | null | undefined, latest: string): boolean {
  if (!current || !isVersion(current)) return true;
  return compareVersions(current, latest) < 0;
}

/** The highest of some versions, or null. */
export function highestVersion(versions: string[]): string | null {
  return versions.filter(isVersion).reduce<string | null>((m, v) => (!m || compareVersions(v, m) > 0 ? v : m), null);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/**
 * The version and its changelog lines from WordPress.org's plugin_information
 * response. Null when the plugin is not listed (still in review) or the
 * response is not what WordPress.org sends.
 */
export function parseWpOrgPluginInfo(json: unknown): { version: string; notes: string[] } | null {
  if (!json || typeof json !== "object") return null;
  const o = json as { version?: unknown; sections?: { changelog?: unknown } };
  if (!isVersion(o.version)) return null;
  const version = o.version;
  const changelog = typeof o.sections?.changelog === "string" ? o.sections.changelog : "";
  // The entry for this version: from its heading to the next heading.
  const escaped = version.replace(/\./g, "\\.");
  const entry = new RegExp(`<h4>\\s*${escaped}\\s*</h4>([\\s\\S]*?)(?=<h4>|$)`, "i").exec(changelog)?.[1] ?? "";
  const notes = [...entry.matchAll(/<li>([\s\S]*?)<\/li>/gi)]
    .map((m) => decodeEntities(m[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 8);
  return { version, notes };
}

/** One connected WordPress site, with the person it belongs to. */
export interface PluginInstall {
  userId: string;
  email: string;
  name: string;
  workspaceId: string;
  siteUrl: string;
  siteName: string | null;
  pluginVersion: string | null;
}

export interface PluginRecipient {
  userId: string;
  email: string;
  name: string;
  workspaceId: string;
  sites: { label: string; currentVersion: string | null; pluginsUrl: string }[];
}

function siteLabel(i: PluginInstall): string {
  try {
    return i.siteName?.trim() || new URL(i.siteUrl).hostname.replace(/^www\./, "");
  } catch {
    return i.siteName?.trim() || i.siteUrl;
  }
}

function pluginsUrl(siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/wp-admin/plugins.php`;
}

/** People with at least one connected site on an older plugin, sites grouped. */
export function pluginUpdateRecipients(installs: PluginInstall[], latest: string): PluginRecipient[] {
  const byUser = new Map<string, PluginRecipient>();
  for (const i of installs) {
    if (!isOlderVersion(i.pluginVersion, latest)) continue;
    const r = byUser.get(i.userId) ?? { userId: i.userId, email: i.email, name: i.name, workspaceId: i.workspaceId, sites: [] };
    if (!r.sites.some((s) => s.pluginsUrl === pluginsUrl(i.siteUrl))) {
      r.sites.push({ label: siteLabel(i), currentVersion: isVersion(i.pluginVersion) ? i.pluginVersion : null, pluginsUrl: pluginsUrl(i.siteUrl) });
    }
    byUser.set(i.userId, r);
  }
  return [...byUser.values()];
}

/** A person who uses the Android app, with the last version it reported. */
export interface AppUser {
  userId: string;
  email: string;
  name: string;
  workspaceId: string;
  version: string | null;
}

export function appUpdateRecipients(users: AppUser[], latest: string): AppUser[] {
  return users.filter((u) => isOlderVersion(u.version, latest));
}

/**
 * Who may be emailed now: not told about this version yet, not emailed
 * about any update in the last few days, and not unsubscribed.
 */
export function eligibleForUpdateEmail<T extends { userId: string; email: string }>(
  recipients: T[],
  state: { notified: Set<string>; recentlyNotified: Set<string>; optedOut: Set<string> },
): T[] {
  return recipients.filter(
    (r) => !state.notified.has(r.userId) && !state.recentlyNotified.has(r.userId) && !state.optedOut.has(r.email.trim().toLowerCase()),
  );
}
