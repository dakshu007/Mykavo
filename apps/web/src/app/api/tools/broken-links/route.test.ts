import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Route test with the network replaced: safeFetch serves the page, and the
 * per-link status checks (status-check.ts uses global fetch with manual
 * redirects) hit a stubbed fetch. The SSRF guard is mocked to block one host.
 */

const pages = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();
/** url -> [HEAD status, GET status, location?] */
const links = new Map<string, { head: number; get?: number; location?: string } | "dns-fail">();
const methods: string[] = [];

vi.mock("@/lib/security/ssrf", async () => {
  const actual = await vi.importActual<typeof import("@mykavo/shared/ssrf")>("@mykavo/shared/ssrf");
  return {
    ...actual,
    safeFetch: vi.fn(async (url: string) => {
      if (url.includes("blocked.internal")) throw new actual.UnsafeUrlError("BLOCKED_HOST", "x");
      const p = pages.get(url);
      if (!p) return { finalUrl: url, status: 404, headers: new Headers(), body: "", bodyBytes: 0, redirectChain: [], responseTimeMs: 1 };
      return { finalUrl: url, status: p.status, headers: new Headers(p.headers ?? { "content-type": "text/html" }), body: p.body, bodyBytes: p.body.length, redirectChain: [], responseTimeMs: 1 };
    }),
    assertSafeUrl: vi.fn(async (u: string | URL) => {
      const url = new URL(u);
      if (url.hostname === "10.0.0.1") throw new actual.UnsafeUrlError("BLOCKED_IP", "x");
      return url;
    }),
  };
});

beforeEach(() => {
  pages.clear();
  links.clear();
  methods.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      methods.push(`${init.method} ${url}`);
      const l = links.get(url);
      if (l === "dns-fail") throw new TypeError("fetch failed");
      if (!l) return new Response(null, { status: 200 });
      const status = init.method === "GET" && l.get !== undefined ? l.get : l.head;
      return new Response(null, { status, headers: l.location ? { location: l.location } : {} });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function post(body: unknown) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  });
}

describe("POST /api/tools/broken-links", () => {
  it("checks every link and classifies broken, unverified, redirect and ok", async () => {
    pages.set("https://example.com/", {
      status: 200,
      body: `
        <a href="/ok">OK</a>
        <a href="/gone">Gone</a>
        <a href="/head-only-404">Head 404</a>
        <a href="https://linkedin.example/in/x">Profile</a>
        <a href="/old">Old</a>
        <a href="https://nope.invalid/">Dead domain</a>
        <a href="http://10.0.0.1/admin">Router</a>
        <a href="mailto:a@b.com">Mail</a>`,
    });
    links.set("https://example.com/gone", { head: 404 });
    links.set("https://example.com/head-only-404", { head: 404, get: 200 });
    links.set("https://linkedin.example/in/x", { head: 403 });
    links.set("https://example.com/old", { head: 301, location: "/new" });
    links.set("https://nope.invalid/", "dns-fail");

    const { POST } = await import("./route");
    const res = await POST(post({ url: "example.com" }));
    expect(res.status).toBe(200);
    const { report } = await res.json();

    const byText = Object.fromEntries(
      (report.results as Array<{ text: string; outcome: string; finalUrl: string | null }>).map((r) => [r.text, r]),
    );
    expect(byText.OK.outcome).toBe("ok");
    expect(byText.Gone.outcome).toBe("broken");
    expect(byText["Head 404"].outcome).toBe("ok"); // GET confirmation overrules a HEAD-only 404
    expect(byText.Profile.outcome).toBe("unverified");
    expect(byText.Old).toMatchObject({ outcome: "redirect", finalUrl: "https://example.com/new" });
    expect(byText["Dead domain"].outcome).toBe("broken");
    expect(byText.Router.outcome).toBe("unverified");
    expect(byText.Mail).toBeUndefined();
    expect(report.results[0].outcome).toBe("broken");
    expect(report).toMatchObject({ totalLinks: 7, checkedLinks: 7, capped: false, internalCount: 4, externalCount: 3 });
    expect(methods).toContain("GET https://example.com/gone");
  });

  it("caps at 100 links", async () => {
    const body = Array.from({ length: 130 }, (_, i) => `<a href="/p${i}">P${i}</a>`).join("");
    pages.set("https://example.com/many", { status: 200, body });
    const { POST } = await import("./route");
    const { report } = await (await POST(post({ url: "https://example.com/many" }))).json();
    expect(report).toMatchObject({ totalLinks: 130, checkedLinks: 100, capped: true });
  });

  it("maps SSRF errors, error pages and empty input to 400", async () => {
    const { POST } = await import("./route");
    const blocked = await POST(post({ url: "http://blocked.internal/" }));
    expect(blocked.status).toBe(400);
    expect((await blocked.json()).error).toBe("This host can't be checked.");
    const missing = await POST(post({ url: "https://example.com/missing" }));
    expect(missing.status).toBe(400);
    expect((await missing.json()).error).toMatch(/HTTP 404/);
    expect((await POST(post({ url: "" }))).status).toBe(400);
  });
});
