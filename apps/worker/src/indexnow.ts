/**
 * Daily IndexNow submission for mykavo.app (see @mykavo/shared indexnow).
 * Reads the live sitemap - the same list Google gets - and sends Bing the
 * pages modified in the last ~day; on Sundays it sends every page, which
 * covers pages whose sitemap entry has no date. Costs no database egress:
 * the sitemap comes from the website, not from Postgres directly.
 */

import { INDEXNOW_ENDPOINT, indexNowPayload, parseSitemap, urlsToSubmit } from "@mykavo/shared";
import { logger } from "./logger";

const TIMEOUT_MS = 30_000;
/** A little over a day, so a late or skipped run doesn't leave a gap. */
const DAILY_WINDOW_MS = 30 * 60 * 60 * 1000;

export async function runIndexNowSubmit(now = new Date()): Promise<{ submitted: number; full: boolean }> {
  const siteUrl = (process.env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");
  const host = new URL(siteUrl).host;
  const full = now.getUTCDay() === 0;

  const sitemap = await fetch(`${siteUrl}/sitemap.xml`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!sitemap.ok) throw new Error(`sitemap fetch failed: ${sitemap.status}`);
  const urls = urlsToSubmit(parseSitemap(await sitemap.text()), {
    host,
    since: full ? null : new Date(now.getTime() - DAILY_WINDOW_MS),
  });
  if (urls.length === 0) {
    logger.info("indexnow: nothing changed", { full });
    return { submitted: 0, full };
  }

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(indexNowPayload(host, urls)),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // 200 and 202 both mean accepted (202: key validation still pending).
  if (res.status !== 200 && res.status !== 202) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`IndexNow refused the submission: ${res.status} ${detail}`);
  }
  await res.body?.cancel().catch(() => {});
  logger.info("indexnow: submitted", { urls: urls.length, full, status: res.status });
  return { submitted: urls.length, full };
}
