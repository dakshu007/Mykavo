/**
 * Controlled Playwright browser concurrency (spec §42). One pool per worker
 * process: caps concurrent pages, restarts the browser after N uses to
 * bound memory growth, and shuts down gracefully.
 */

import { chromium, type Browser } from "playwright";

export interface BrowserPoolOptions {
  /** Max concurrently open pages. Default 3. */
  maxConcurrentPages?: number;
  /** Restart the browser after this many pages. Default 50. */
  restartAfterPages?: number;
}

export class BrowserPool {
  private browser: Browser | null = null;
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
    this.browser = await chromium.launch({
      headless: true,
      args: ["--disable-gpu", "--disable-dev-shm-usage"],
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
  }
}
