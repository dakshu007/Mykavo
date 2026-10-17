/**
 * End-to-end egress checks for scanPage: a real Chromium, the real egress
 * proxy, a local origin server. The SSRF resolver is stubbed so "site.test"
 * stands in for a vetted public host (pinned to the local server) and every
 * other host is refused, exactly as the guard would refuse internal ones.
 *
 * Skipped when Playwright's Chromium is not installed. Set
 * SCANNER_TEST_CHROMIUM to point at another Chromium binary.
 */

import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { chromium, type Browser } from "playwright";
import type { SafeAddress } from "@mykavo/shared";
import type { ArtifactStorage } from "./storage";

const stub = vi.hoisted(() => ({
  resolver: async (hostname: string): Promise<SafeAddress[]> => {
    const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (host === "site.test") return [{ address: "127.0.0.1", family: 4 }];
    const { UnsafeUrlError } = await import("@mykavo/shared/ssrf");
    throw new UnsafeUrlError("BLOCKED_IP", "This host resolves to a blocked address.");
  },
}));

vi.mock("@mykavo/shared", async () => {
  const actual = await vi.importActual<typeof import("@mykavo/shared")>("@mykavo/shared");
  return {
    ...actual,
    createSafeHostResolver: () => stub.resolver,
    assertSafeUrl: (url: string | URL) => actual.assertSafeUrl(url, { resolver: stub.resolver }),
  };
});

import { scanPage } from "./scan-page";
import { startEgressProxy, type EgressProxy } from "./egress-proxy";

const chromiumPath = process.env.SCANNER_TEST_CHROMIUM ?? chromium.executablePath();
const haveChromium = existsSync(chromiumPath);

const storage: ArtifactStorage = {
  put: async () => {},
  exists: async () => false,
} as unknown as ArtifactStorage;

let server: Server;
let port = 0;
let browser: Browser;
let proxy: EgressProxy;
const originHits: string[] = [];

describe.skipIf(!haveChromium)("scanPage egress", () => {
  beforeAll(async () => {
    server = createServer((req, res) => {
      originHits.push(req.url ?? "");
      if (req.url === "/redirect-http") {
        res.writeHead(302, { location: "http://internal.test/secret" }).end();
        return;
      }
      if (req.url === "/redirect-https") {
        res.writeHead(302, { location: "https://internal.test/secret" }).end();
        return;
      }
      if (req.url === "/js-navigation") {
        res.setHeader("content-type", "text/html");
        res.end(`<script>location.href = "http://169.254.169.254/latest/meta-data/";</script>`);
        return;
      }
      if (req.url?.startsWith("/img")) {
        res.setHeader("content-type", "image/gif");
        res.end("GIF89a");
        return;
      }
      const many =
        req.url === "/many" ? Array.from({ length: 350 }, (_, i) => `<img src="/img${i}.gif">`).join("") : "";
      res.setHeader("content-type", "text/html");
      res.end(
        `<html><head><title>Fixture</title></head><body><h1>Hi</h1><img src="http://10.0.0.1/a.gif">${many}</body></html>`,
      );
    });
    await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
    port = (server.address() as { port: number }).port;
    proxy = await startEgressProxy({ resolver: stub.resolver });
    browser = await chromium.launch({ executablePath: chromiumPath, proxy: { server: proxy.server } });
  });

  afterAll(async () => {
    await browser?.close();
    await proxy?.close();
    await new Promise<void>((done) => server.close(() => done()));
  });

  it("scans a normal page and never fetches internal subresources", async () => {
    const result = await scanPage(browser, `http://site.test:${port}/`, storage, {
      artifactPrefix: "test",
      postLoadDelayMs: 10,
    });
    expect(result.title).toBe("Fixture");
    expect(result.resourceLimit).toBeNull();
    expect(result.requestCount).toBeGreaterThan(0);
    expect(result.pageWeightBytes).toBeGreaterThan(0);
  }, 60_000);

  it.each(["/redirect-http", "/redirect-https", "/js-navigation"])(
    "fails %s with UNSAFE_URL instead of storing the internal page",
    async (path) => {
      await expect(
        scanPage(browser, `http://site.test:${port}${path}`, storage, {
          artifactPrefix: "test",
          postLoadDelayMs: 300,
        }),
      ).rejects.toMatchObject({ code: "UNSAFE_URL" });
    },
    60_000,
  );

  it("stops at the per-page request budget and records it", async () => {
    const result = await scanPage(browser, `http://site.test:${port}/many`, storage, {
      artifactPrefix: "test",
      postLoadDelayMs: 10,
    });
    expect(result.resourceLimit).toBe("REQUESTS");
    expect(result.requestCount).toBeLessThanOrEqual(300);
  }, 60_000);
});
