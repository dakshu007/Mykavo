import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SafeFetchOptions, SafeFetchResult } from "@mykavo/shared/ssrf";

// Every request the crawler makes must go through safeFetch. The mock serves
// a tiny site and records each call; global fetch is stubbed to fail loudly
// so any unguarded request breaks the test.
const site = vi.hoisted(() => ({
  calls: [] as Array<{ url: string; options: SafeFetchOptions | undefined }>,
  pages: new Map<string, { status: number; body: string; contentType?: string; location?: string }>(),
  blocked: new Set<string>(),
}));

vi.mock("@mykavo/shared/ssrf", async () => {
  const actual = await vi.importActual<typeof import("@mykavo/shared/ssrf")>("@mykavo/shared/ssrf");
  return {
    ...actual,
    safeFetch: vi.fn(async (url: string, options?: SafeFetchOptions): Promise<SafeFetchResult> => {
      site.calls.push({ url, options });
      if (site.blocked.has(url)) throw new actual.UnsafeUrlError("BLOCKED_IP", "This host resolves to a blocked address.");
      const page = site.pages.get(url) ?? { status: 404, body: "" };
      const headers = new Headers({ "content-type": page.contentType ?? "text/html" });
      if (page.location) headers.set("location", page.location);
      const wantBody = options?.readBody ? options.readBody(page.status, headers) : true;
      return {
        finalUrl: url,
        status: page.status,
        headers,
        body: wantBody ? page.body : "",
        bodyBytes: wantBody ? page.body.length : 0,
        redirectChain: [],
        responseTimeMs: 1,
      };
    }),
  };
});

import { runSiteAudit, DEFAULT_LIMITS } from "./crawl";

const ORIGIN = "https://site.example.com";

beforeEach(() => {
  site.calls.length = 0;
  site.pages.clear();
  site.blocked.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("unguarded fetch");
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runSiteAudit egress", () => {
  it("sends robots.txt, sitemaps, llms.txt, pages and probes through safeFetch only", async () => {
    site.pages.set(`${ORIGIN}/robots.txt`, {
      status: 200,
      contentType: "text/plain",
      body: "User-agent: *\nDisallow:\nSitemap: https://site.example.com/sitemap.xml\n",
    });
    site.pages.set(`${ORIGIN}/sitemap.xml`, {
      status: 200,
      contentType: "application/xml",
      body: "<urlset><url><loc>https://site.example.com/about</loc></url></urlset>",
    });
    site.pages.set(`${ORIGIN}/`, {
      status: 200,
      body: '<html><head><title>Home</title></head><body><a href="/about">About</a><a href="https://other.example.org/x">x</a></body></html>',
    });
    site.pages.set(`${ORIGIN}/about`, { status: 200, body: "<html><head><title>About</title></head><body></body></html>" });

    await runSiteAudit(`${ORIGIN}/`, { ...DEFAULT_LIMITS, maxPages: 5, concurrency: 2 });

    const urls = site.calls.map((c) => c.url);
    expect(urls).toContain(`${ORIGIN}/robots.txt`);
    expect(urls).toContain(`${ORIGIN}/sitemap.xml`);
    expect(urls).toContain(`${ORIGIN}/llms.txt`);
    expect(urls).toContain(`${ORIGIN}/`);
    expect(urls).toContain(`${ORIGIN}/about`);
    expect(urls).toContain("https://other.example.org/x");
    expect(fetch).not.toHaveBeenCalled();

    // Every call carries a size cap or skips the body entirely.
    for (const { options } of site.calls) {
      expect(options?.maxBytes !== undefined || options?.readBody !== undefined).toBe(true);
    }
    // Status probes never download bodies and never follow redirects.
    const probe = site.calls.find((c) => c.url === "https://other.example.org/x");
    expect(probe?.options?.followRedirects).toBe(false);
    expect(probe?.options?.readBody?.(200, new Headers())).toBe(false);
  });

  it("reports a page the guard refuses as a fetch error instead of fetching it", async () => {
    site.blocked.add(`${ORIGIN}/`);
    const result = await runSiteAudit(`${ORIGIN}/`, { ...DEFAULT_LIMITS, maxPages: 2 });
    const fetchErrors = result.issues.find((g) => g.checkId === "http-fetch-error");
    expect(fetchErrors?.urls[0]?.url).toBe(`${ORIGIN}/`);
    expect(fetch).not.toHaveBeenCalled();
  });
});
