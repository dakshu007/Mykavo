import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Route-level tests for the Canonical Tag Checker. The network is replaced by
 * canned pages so the wiring (input validation, the second SSRF-guarded fetch
 * of the canonical target, SSRF error mapping) runs exactly as in production.
 */

interface CannedPage {
  status: number;
  body?: string;
  headers?: Record<string, string>;
  /** Simulate a server-side redirect: safeFetch follows it and reports the chain. */
  redirectTo?: string;
}

const pages = new Map<string, CannedPage>();

const ssrf = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock("@/lib/security/ssrf", async () => {
  const actual = await vi.importActual<typeof import("@mykavo/shared/ssrf")>("@mykavo/shared/ssrf");
  return {
    ...actual,
    safeFetch: vi.fn(async (url: string) => {
      ssrf.calls.push(url);
      if (url.includes("blocked.internal")) throw new actual.UnsafeUrlError("BLOCKED_HOST", "x");
      const redirectChain: Array<{ url: string; status: number }> = [];
      let current = url;
      let p = pages.get(current);
      while (p?.redirectTo) {
        redirectChain.push({ url: current, status: p.status });
        current = p.redirectTo;
        if (current.includes("blocked.internal")) throw new actual.UnsafeUrlError("BLOCKED_HOST", "x");
        p = pages.get(current);
      }
      const body = p?.body ?? "";
      return {
        finalUrl: current,
        status: p?.status ?? 404,
        headers: new Headers(p?.headers ?? {}),
        body,
        bodyBytes: body.length,
        redirectChain,
        responseTimeMs: 1,
      };
    }),
    assertSafeUrl: vi.fn(async (u: string) => new URL(u)),
  };
});

function post(body: unknown) {
  return new Request("http://localhost/api/tools/canonical", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  });
}

const head = (inner: string) => `<html><head><title>x</title>${inner}</head><body><p>hi</p></body></html>`;

async function check(url: string) {
  const { POST } = await import("./route");
  const res = await POST(post({ url }));
  return { res, data: (await res.json()) as { report?: Record<string, unknown> & { issues: Array<{ level: string; message: string }> }; error?: string } };
}

function messages(report: { issues: Array<{ message: string }> }): string {
  return report.issues.map((i) => i.message).join("\n");
}

beforeEach(() => {
  pages.clear();
  ssrf.calls.length = 0;
});

describe("POST /api/tools/canonical", () => {
  it("accepts a self-referencing canonical without fetching it again", async () => {
    pages.set("https://example.com/pricing", {
      status: 200,
      body: head('<link rel="canonical" href="https://example.com/pricing">'),
    });
    const { res, data } = await check("example.com/pricing");
    expect(res.status).toBe(200);
    expect(data.report).toMatchObject({ verdict: "self", canonical: "https://example.com/pricing", target: null });
    expect(data.report?.issues.filter((i) => i.level === "error")).toEqual([]);
    expect(ssrf.calls).toEqual(["https://example.com/pricing"]);
  });

  it("fetches a canonical that points elsewhere through safeFetch and reports a redirecting target", async () => {
    pages.set("https://example.com/a", { status: 200, body: head('<link rel="canonical" href="https://example.com/old">') });
    pages.set("https://example.com/old", { status: 301, redirectTo: "https://example.com/new" });
    pages.set("https://example.com/new", { status: 200, body: head('<link rel="canonical" href="https://example.com/new">') });
    const { data } = await check("https://example.com/a");
    expect(ssrf.calls).toEqual(["https://example.com/a", "https://example.com/old"]);
    expect(data.report).toMatchObject({
      verdict: "other",
      target: { url: "https://example.com/old", finalUrl: "https://example.com/new", status: 200, redirectCount: 1, canonicalState: "self" },
    });
    expect(messages(data.report!)).toContain("The canonical URL redirects");
  });

  it("flags a canonical target that returns 404", async () => {
    pages.set("https://example.com/a", { status: 200, body: head('<link rel="canonical" href="/gone">') });
    const { data } = await check("https://example.com/a");
    expect(data.report).toMatchObject({ verdict: "other", target: { status: 404 } });
    const text = messages(data.report!);
    expect(text).toContain("returns HTTP 404");
    expect(text).toContain("relative URL");
  });

  it("flags a canonical target that is noindex", async () => {
    pages.set("https://example.com/a", { status: 200, body: head('<link rel="canonical" href="https://example.com/b">') });
    pages.set("https://example.com/b", { status: 200, body: head(""), headers: { "x-robots-tag": "noindex" } });
    const { data } = await check("https://example.com/a");
    expect(data.report).toMatchObject({ target: { noindex: true, canonicalState: "missing" } });
    expect(messages(data.report!)).toContain("The canonical URL is noindex");
  });

  it("reports multiple canonical tags that disagree as conflicting", async () => {
    pages.set("https://example.com/a", {
      status: 200,
      body: head('<link rel="canonical" href="https://example.com/a"><link rel="canonical" href="https://example.com/b">'),
    });
    const { data } = await check("https://example.com/a");
    expect(data.report?.verdict).toBe("conflicting");
    expect(data.report?.declared).toHaveLength(2);
    expect(messages(data.report!)).toContain("2 different URLs");
  });

  it("reports an HTTP Link header that disagrees with the HTML tag", async () => {
    pages.set("https://example.com/a", {
      status: 200,
      body: head('<link rel="canonical" href="https://example.com/a">'),
      headers: { link: '<https://example.com/other>; rel="canonical"' },
    });
    const { data } = await check("https://example.com/a");
    expect(data.report?.verdict).toBe("conflicting");
    expect(data.report?.declared).toEqual([
      expect.objectContaining({ source: "html", resolved: "https://example.com/a" }),
      expect.objectContaining({ source: "header", resolved: "https://example.com/other" }),
    ]);
    expect(messages(data.report!)).toContain("The HTTP Link header says the canonical is https://example.com/other");
  });

  it("reports a missing canonical", async () => {
    pages.set("https://example.com/a", { status: 200, body: head("") });
    const { data } = await check("https://example.com/a");
    expect(data.report).toMatchObject({ verdict: "missing", canonical: null, declared: [] });
  });

  it("maps SSRF errors to a friendly 400 and rejects empty input", async () => {
    const blocked = await check("http://blocked.internal/");
    expect(blocked.res.status).toBe(400);
    expect(blocked.data.error).toBe("This host can't be checked.");
    const { POST } = await import("./route");
    expect((await POST(post({ url: "" }))).status).toBe(400);
  });

  it("reports a blocked canonical target inside the result instead of failing the request", async () => {
    pages.set("https://example.com/a", { status: 200, body: head('<link rel="canonical" href="http://blocked.internal/x">') });
    const { res, data } = await check("https://example.com/a");
    expect(res.status).toBe(200);
    expect(data.report).toMatchObject({ target: { status: null, error: "This host can't be checked." } });
    expect(messages(data.report!)).toContain("We couldn't check the canonical URL: This host can't be checked.");
  });
});
