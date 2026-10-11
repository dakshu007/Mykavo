/**
 * "Finish connecting WordPress" - who is stuck, and where to send them.
 *
 * Pressing Connect in the WordPress plugin opens MyKavo's consent screen and
 * records a wordpress_connect_started activity event. The plugin's connect
 * link lives for an hour (HANDSHAKE_TTL in the plugin), so an attempt that
 * is more than an hour old and still has no connection behind it will not
 * finish on its own: that person gets one email saying how to finish.
 *
 * Pure functions only - the worker reads the rows and sends.
 */

/** How long the plugin keeps a Connect press valid; reminders wait this out. */
export const WORDPRESS_CONNECT_WAIT_MS = 60 * 60 * 1000;
/** Attempts older than this are not chased: whoever made them has moved on. */
export const WORDPRESS_CONNECT_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;

export interface ConnectAttempt {
  userId: string;
  workspaceId: string;
  /** The site's home URL, as the plugin reported it. */
  siteUrl: string;
  /** The wp-admin screen the plugin asked to return to, when recorded. */
  adminUrl: string | null;
  at: Date;
}

/** "WWW.Example.com" -> "example.com", the way sites are matched everywhere. */
export function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function hostOfUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? bareHost(u.hostname) : null;
  } catch {
    return null;
  }
}

/**
 * The plugin's screen in the site's wp-admin. Prefers the admin address the
 * plugin sent (right for WordPress installed in a subfolder), and only when
 * it is on the same site; otherwise the standard location under the site.
 */
export function wordpressPluginUrl(siteUrl: string, adminUrl: string | null): string | null {
  const host = hostOfUrl(siteUrl);
  if (!host) return null;
  if (adminUrl && hostOfUrl(adminUrl) === host) {
    const admin = new URL(adminUrl);
    const i = admin.pathname.indexOf("/wp-admin/");
    if (i !== -1) return `${admin.origin}${admin.pathname.slice(0, i)}/wp-admin/admin.php?page=mykavo`;
  }
  const site = new URL(siteUrl);
  return `${site.origin}${site.pathname.replace(/\/+$/, "")}/wp-admin/admin.php?page=mykavo`;
}

/**
 * One reminder per workspace at most: the latest attempt whose site is still
 * not connected. A workspace is left alone while anyone in it pressed
 * Connect within the last hour (they may be mid-way through), once its
 * reminder was sent, and when every site it tried is connected by now.
 */
export function pickConnectReminders(
  attempts: ConnectAttempt[],
  opts: {
    now: Date;
    /** Hosts (bareHost) with a live WordPress connection, per workspace. */
    connectedHosts: Map<string, Set<string>>;
    /** Workspaces that already got this email. */
    alreadySent: Set<string>;
  },
): ConnectAttempt[] {
  const byWorkspace = new Map<string, ConnectAttempt[]>();
  for (const a of attempts) {
    const list = byWorkspace.get(a.workspaceId) ?? [];
    list.push(a);
    byWorkspace.set(a.workspaceId, list);
  }

  const now = opts.now.getTime();
  const out: ConnectAttempt[] = [];
  for (const [workspaceId, list] of byWorkspace) {
    if (opts.alreadySent.has(workspaceId)) continue;
    if (list.some((a) => now - a.at.getTime() < WORDPRESS_CONNECT_WAIT_MS)) continue;
    const connected = opts.connectedHosts.get(workspaceId) ?? new Set<string>();
    const stuck = list
      .filter((a) => now - a.at.getTime() <= WORDPRESS_CONNECT_LOOKBACK_MS)
      .filter((a) => {
        const host = hostOfUrl(a.siteUrl);
        return host !== null && !connected.has(host);
      })
      .sort((x, y) => y.at.getTime() - x.at.getTime());
    if (stuck[0]) out.push(stuck[0]);
  }
  // Oldest first, so a small budget reaches the people waiting longest.
  return out.sort((x, y) => x.at.getTime() - y.at.getTime());
}
