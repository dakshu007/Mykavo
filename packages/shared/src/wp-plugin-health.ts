/**
 * WordPress Plugin Health: what WordPress.org says about a plugin installed
 * on a connected site. Pure - the worker does the lookups (one a second) and
 * stores the result on each wp_plugin_inventory row.
 *
 *   closed    - WordPress.org closed the plugin (often for security).
 *   outdated  - no release in over two years.
 *   ok        - listed and maintained.
 *   unknown   - not on WordPress.org at all: premium and custom plugins.
 *               Never flagged, never alerted on.
 */

export type WpPluginStatus = "ok" | "closed" | "outdated" | "unknown";

export interface WpPluginVerdict {
  status: WpPluginStatus;
  /** WordPress.org last_updated as YYYY-MM-DD, when known. */
  lastUpdated: string | null;
  /** Plain words for the owner when flagged; null otherwise. */
  reason: string | null;
}

/** No release for this long counts as outdated. */
export const WP_PLUGIN_OUTDATED_DAYS = 730;

/** A plugin folder name as the plugin reports it: lowercase [a-z0-9_-]. */
export const WP_PLUGIN_SLUG_RE = /^[a-z0-9_-]{1,100}$/;

/** WordPress.org plugin information API for one slug, without the long sections. */
export function wpOrgPluginInfoUrl(slug: string): string {
  return (
    "https://api.wordpress.org/plugins/info/1.2/?action=plugin_information" +
    `&request%5Bslug%5D=${encodeURIComponent(slug)}&request%5Bfields%5D%5Bsections%5D=0`
  );
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** "2024-10-22 4:55pm GMT" (or a bare date) to "2024-10-22"; null when unreadable. */
export function parseWpOrgDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const day = `${m[1]}-${m[2]}-${m[3]}`;
  const parsed = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day ? null : day;
}

/**
 * Classify one WordPress.org answer. Returns null when the answer says
 * nothing about the plugin (rate limited, server error, not JSON): keep what
 * was known and try again on a later run.
 */
export function classifyWpOrgPlugin(httpStatus: number, json: unknown, now: Date = new Date()): WpPluginVerdict | null {
  const body = asRecord(json);
  if (body) {
    const error = typeof body.error === "string" ? body.error.toLowerCase() : null;
    if (error === "closed" || body.closed === true) {
      const closedOn = parseWpOrgDate(body.closed_date);
      const why = typeof body.reason_text === "string" && body.reason_text.trim() ? body.reason_text.trim().slice(0, 80) : null;
      const reason =
        "Closed on WordPress.org" +
        (closedOn ? ` on ${closedOn}` : "") +
        (why ? ` (${why})` : "") +
        ". It gets no more updates, including security fixes.";
      return { status: "closed", lastUpdated: parseWpOrgDate(body.last_updated), reason };
    }
    if (error) {
      // "Plugin not found.": premium or custom, not ours to judge.
      return /not found/.test(error) || httpStatus === 404 ? { status: "unknown", lastUpdated: null, reason: null } : null;
    }
  }
  if (httpStatus === 404) return { status: "unknown", lastUpdated: null, reason: null };
  if (httpStatus < 200 || httpStatus >= 300 || !body) return null;
  if (typeof body.slug !== "string") return null;

  const lastUpdated = parseWpOrgDate(body.last_updated);
  if (lastUpdated) {
    const ageDays = (now.getTime() - new Date(`${lastUpdated}T00:00:00Z`).getTime()) / 86_400_000;
    if (ageDays > WP_PLUGIN_OUTDATED_DAYS) {
      const years = Math.floor(ageDays / 365);
      return {
        status: "outdated",
        lastUpdated,
        reason: `Not updated on WordPress.org in over ${years} years (last release ${lastUpdated}).`,
      };
    }
  }
  return { status: "ok", lastUpdated, reason: null };
}

/** Flagged statuses: the only ones shown as risky or emailed about. */
export function isFlaggedWpPluginStatus(status: string): status is "closed" | "outdated" {
  return status === "closed" || status === "outdated";
}
