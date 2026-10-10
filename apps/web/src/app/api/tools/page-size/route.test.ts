import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Route test with the network replaced: every fetch (page and resources)
 * goes through the mocked safeFetch, so the SSRF error mapping and the
 * per-resource failure handling run exactly as in production.
 */

const pages = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();
const fetched: string[] = [];

vi.mock("@/lib/security/ssrf", async () => {
  const actual = await vi.importActual<typeof import("@mykavo/shared/ssrf")>("@mykavo/shared/ssrf");
  return {
    ...actual,
    safeFetch: vi.fn(async (url: string) => {
      fetched.push(url);
      if (url.includes("blocked.internal")) throw new actual.UnsafeUrlError("BLOCKED_HOST", "x");
      if (url.endsWith("/huge.png")) throw new actual.UnsafeUrlError("RESPONSE_TOO_LARGE", "x");
      if (url.endsWith("/slow.js")) throw new actual.UnsafeUrlError("TIMEOUT", "x");
      const p = pages.get(url);
      if (!p) return { finalUrl: url, status: 404, headers: new Headers(), body: "", bodyBytes: 0, redirectChain: [], responseTimeMs: 1 };
      return { finalUrl: url, status: p.status, headers: new Headers(p.headers ?? {}), body: p.body, bodyBytes: p.body.length, redirectChain: [], responseTimeMs: 1 };
    }),
  };
});

beforeEach(() => {
  pages.clear();
  fetched.length = 0;
});

function post(body: unknown) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  });
}

describe("POST /api/tools/page-size", () => {
  it("measures referenced resources and reports failures as unknown size", async () => {
    pages.set("https://example.com/", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "content-encoding": "gzip", "content-length": "40" },
      body: `<link rel="stylesheet" href="/site.css"><script src="/app.js"></script><script src="/slow.js"></script>
        <img src="/hero.jpg"><img src="/huge.png"><script src="https://cdn.third.com/x.js"></script><img src="/missing.png">`,
    });
    pages.set("https://example.com/site.css", { status: 200, body: "c".repeat(2000) });
    pages.set("https://example.com/app.js", { status: 200, body: "j".repeat(5000) });
    pages.set("https://example.com/hero.jpg", { status: 200, body: "i".repeat(9000) });
    pages.set("https://cdn.third.com/x.js", { status: 200, body: "t".repeat(1000) });

    const { POST } = await import("./route");
    const res = await POST(post({ url: "example.com" }));
    expect(res.status).toBe(200);
    const { report } = await res.json();

    expect(report.requests).toBe(8);
    expect(report.thirdPartyRequests).toBe(1);
    expect(report.measured).toBe(4);
    expect(report.unknown).toBe(3);
    expect(report.html.transferBytes).toBe(40);
    expect(report.heaviest[0].url).toBe("https://example.com/hero.jpg");
    const notes = Object.fromEntries((report.resources as Array<{ url: string; note: string | null }>).map((r) => [r.url, r.note]));
    expect(notes["https://example.com/huge.png"]).toMatch(/Larger than 5 MB/);
    expect(notes["https://example.com/slow.js"]).toBe("Timed out");
    expect(notes["https://example.com/missing.png"]).toBe("Returned HTTP 404");
  });

  it("only downloads the first 40 resources", async () => {
    const body = Array.from({ length: 55 }, (_, i) => `<img src="/i${i}.png">`).join("");
    pages.set("https://example.com/gallery", { status: 200, headers: { "content-type": "text/html" }, body });
    const { POST } = await import("./route");
    const { report } = await (await POST(post({ url: "https://example.com/gallery" }))).json();
    expect(fetched.length).toBe(1 + 40);
    expect(report).toMatchObject({ requests: 56, capped: true });
  });

  it("maps SSRF errors, non-HTML and empty input to 400", async () => {
    pages.set("https://example.com/file.pdf", { status: 200, headers: { "content-type": "application/pdf" }, body: "%PDF" });
    const { POST } = await import("./route");
    const blocked = await POST(post({ url: "http://blocked.internal/" }));
    expect(blocked.status).toBe(400);
    expect((await blocked.json()).error).toBe("This host can't be checked.");
    expect((await POST(post({ url: "https://example.com/file.pdf" }))).status).toBe(400);
    expect((await POST(post({ url: "" }))).status).toBe(400);
  });
});
