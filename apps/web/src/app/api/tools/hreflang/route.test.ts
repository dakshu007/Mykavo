import { beforeEach, describe, expect, it, vi } from "vitest";

const pages = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();

vi.mock("@/lib/security/ssrf", async () => {
  const actual = await vi.importActual<typeof import("@mykavo/shared/ssrf")>("@mykavo/shared/ssrf");
  return {
    ...actual,
    safeFetch: vi.fn(async (url: string) => {
      if (url.includes("blocked.internal")) throw new actual.UnsafeUrlError("BLOCKED_HOST", "x");
      const p = pages.get(url);
      if (!p) return { finalUrl: url, status: 404, headers: new Headers(), body: "", bodyBytes: 0, redirectChain: [], responseTimeMs: 1 };
      return { finalUrl: url, status: p.status, headers: new Headers(p.headers ?? {}), body: p.body, bodyBytes: p.body.length, redirectChain: [], responseTimeMs: 1 };
    }),
  };
});

const tags = (self: string) =>
  `<link rel="alternate" hreflang="en" href="https://e.com/"><link rel="alternate" hreflang="de" href="https://e.com/de/"><link rel="alternate" hreflang="fr" href="https://e.com/fr/"><link rel="canonical" href="${self}">`;

function post(url: string) {
  return new Request("http://localhost/api/tools/hreflang", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify({ url }),
  });
}

beforeEach(() => pages.clear());

describe("POST /api/tools/hreflang", () => {
  it("checks every alternate: self, return link, missing return link, noindex", async () => {
    pages.set("https://e.com/", { status: 200, body: tags("https://e.com/") });
    pages.set("https://e.com/de/", { status: 200, body: tags("https://e.com/de/") });
    pages.set("https://e.com/fr/", { status: 200, body: `<meta name="robots" content="noindex">` });
    const { POST } = await import("./route");
    const { report } = await (await POST(post("https://e.com/"))).json();
    const by = Object.fromEntries(report.alternates.map((a: { hreflang: string }) => [a.hreflang, a]));
    expect(by.en).toMatchObject({ self: true, returnLink: true });
    expect(by.de).toMatchObject({ fetched: true, status: 200, returnLink: true, noindex: false, canonicalElsewhere: false });
    expect(by.fr).toMatchObject({ returnLink: false, noindex: true });
    expect(report.issues.join(" ")).toContain("doesn't link back");
    expect(report.notes.join(" ")).toContain("x-default");
  });

  it("returns an empty set for a page without hreflang and maps SSRF errors", async () => {
    pages.set("https://plain.example/", { status: 200, body: "<title>x</title>" });
    const { POST } = await import("./route");
    const { report } = await (await POST(post("https://plain.example/"))).json();
    expect(report.alternates).toEqual([]);
    const blocked = await POST(post("http://blocked.internal/"));
    expect(blocked.status).toBe(400);
  });
});
