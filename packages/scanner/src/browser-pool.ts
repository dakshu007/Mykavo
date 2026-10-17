/**
 * Controlled Playwright browser concurrency (spec §42). One pool per worker
 * process: caps concurrent pages, restarts the browser after N uses to
 * bound memory growth, and shuts down gracefully.
 *
 * Every browser it launches sends ALL traffic through the loopback egress
 * proxy (egress-proxy.ts), which connects only to SSRF-vetted addresses.
 * scan-page.ts adds per-request routing on top; the proxy is the backstop
 * for what routing cannot see and for DNS rebinding.
 */

import { chromium, type Browser } from "playwright";
import { startEgressProxy, type EgressProxy } from "./egress-proxy";

/**
 * Chromium flags shared by every scan browser. WebRTC may only use proxied
 * transports, so STUN/ICE cannot be used to probe internal UDP/TCP
 * endpoints around the proxy.
 */
export const SCAN_BROWSER_ARGS = [
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
];

export interface BrowserPoolOptions {
  /** Max concurrently open pages. Default 3. */
  maxConcurrentPages?: number;
  /** Restart the browser after this many pages. Default 50. */
  restartAfterPages?: number;
}

export class BrowserPool {
  private browser: Browser | null = null;
  private egress: Promise<EgressProxy> | null = null;
  private pagesSinceLaunch = 0;
  private active = 0;
  private waiters: Array<() => void> = [];
  private closed = false;
  private readonly maxConcurrentPages: number;
  private readonly restartAfterPages: number;

  constructor(options: BrowserPoolOptions = {}) {
    this.maxConcurrentPages = options.maxConcurrentPages ?? 3;
    this.restartAfterPages = options.restartAfterPages ?? 50;
  }

  private async ensureBrowser(): Promise<Browser> {
    if (this.browser?.isConnected() && this.pagesSinceLaunch < this.restartAfterPages) {
      return this.browser;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
    }
    // One proxy per pool, reused across browser restarts. A failed start is
    // forgotten so the next scan retries it rather than failing forever.
    if (!this.egress) {
      const starting = startEgressProxy();
      starting.catch(() => {
        if (this.egress === starting) this.egress = null;
      });
      this.egress = starting;
    }
    const egress = await this.egress;
    this.browser = await chromium.launch({
      headless: true,
      args: SCAN_BROWSER_ARGS,
      // Playwright adds <-loopback> to the bypass list, so even loopback
      // URLs go to the proxy (which refuses them) instead of direct.
      proxy: { server: egress.server },
    });
    this.pagesSinceLaunch = 0;
    return this.browser;
  }

  /** Acquire a concurrency slot, run `fn` with the browser, release. */
  async withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
    if (this.closed) throw new Error("Browser pool is closed");

    if (this.active >= this.maxConcurrentPages) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.active++;
    try {
      const browser = await this.ensureBrowser();
      this.pagesSinceLaunch++;
      return await fn(browser);
    } finally {
      this.active--;
      this.waiters.shift()?.();
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
    if (this.egress) {
      const egress = await this.egress.catch(() => null);
      await egress?.close().catch(() => {});
      this.egress = null;
    }
  }
}
