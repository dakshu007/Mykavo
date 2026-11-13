import { safeFetch } from "@mykavo/shared";
import { logger } from "@/lib/logger";

/**
 * Ask a connected WordPress site to collect its queued drafts now
 * (plugin 1.3.2+, GET /wp-json/mykavo/v1/drafts/collect). The plugin then
 * pulls them from MyKavo over its own authenticated connection, so this
 * carries no secret. The ?rest_route= form works with or without pretty
 * permalinks. Best effort: when the site is slow or blocks it, the draft
 * still arrives at the next WP Admin visit or WP-Cron run.
 *
 * The site address is user-influenced, so it goes through safeFetch
 * (SSRF-checked on every hop, time and size limited).
 */
export async function pokeWordPressSite(siteUrl: string, timeoutMs = 9000): Promise<boolean> {
  const url = `${siteUrl.replace(/\/+$/, "")}/?rest_route=/mykavo/v1/drafts/collect&t=${Date.now()}`;
  try {
    const res = await safeFetch(url, { timeoutMs, maxBytes: 4096, maxRedirects: 3 });
    return res.status >= 200 && res.status < 300;
  } catch (err) {
    logger.warn("wp draft poke failed", { reason: err instanceof Error ? err.message : "unknown" });
    return false;
  }
}
