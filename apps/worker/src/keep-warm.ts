/**
 * Keeps the web app's serverless function warm.
 *
 * Netlify runs the whole Next.js app in one function and shuts it down when
 * idle. The next dashboard click then waits for a cold start - seconds of a
 * page that looks frozen. The worker is always on, so every few minutes it
 * requests /api/warm, which boots the function and touches the database.
 *
 * APP_URL is our own configured origin, never user input. Off with
 * KEEP_WARM=off, and never in local development (http URLs).
 */

import { logger } from "./logger";

const INTERVAL_MS = 4 * 60 * 1000;
const TIMEOUT_MS = 20_000;

export function startKeepWarm(): () => void {
  const appUrl = process.env.APP_URL;
  if (process.env.KEEP_WARM === "off" || !appUrl || !appUrl.startsWith("https://")) {
    return () => {};
  }
  const target = new URL("/api/warm", appUrl).href;
  let failures = 0;

  async function ping(): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const startedAt = Date.now();
    try {
      const res = await fetch(target, {
        signal: controller.signal,
        headers: { "user-agent": "MyKavoWorker/keep-warm" },
      });
      await res.body?.cancel();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ms = Date.now() - startedAt;
      // A slow ping means the function was cold (or the app is struggling).
      if (ms > 3000 || failures > 0) logger.info("keep-warm ping", { ms, recoveredAfter: failures });
      failures = 0;
    } catch (err) {
      failures++;
      // Only log the first failure and then every tenth, not every 4 minutes.
      if (failures === 1 || failures % 10 === 0) {
        logger.warn("keep-warm ping failed", {
          failures,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      clearTimeout(timer);
    }
  }

  void ping();
  const interval = setInterval(() => void ping(), INTERVAL_MS);
  interval.unref?.();
  return () => clearInterval(interval);
}
