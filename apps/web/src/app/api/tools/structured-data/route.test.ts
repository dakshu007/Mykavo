import { beforeEach, describe, expect, it, vi } from "vitest";

/** Route-level test with the network replaced by canned pages. */

const pages = new Map<string, { status: number; body: string }>();

vi.mock("@/lib/security/ssrf", async () => {
  const actual = await vi.importActual<typeof import("@mykavo/shared/ssrf")>("@mykavo/shared/ssrf");
  return {
    ...actual,
    safeFetch: vi.fn(async (url: string) => {
      if (url.includes("blocked.internal")) throw new actual.UnsafeUrlError("BLOCKED_HOST", "x");
      if (url.includes("explode.example")) throw new Error("boom");
      const p = pages.get(url) ?? { status: 404, body: "" };
      return { finalUrl: url, status: p.status, headers: new Headers(), body: p.body, bodyBytes: p.body.length, redirectChain: [], responseTimeMs: 1 };
    }),
  };
});

function post(body: unknown) {
  return new Request("http://localhost/api/tools/structured-data", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  });
}

beforeEach(() => pages.clear());

describe("POST /api/tools/structured-data", () => {
  it("parses JSON-LD, reports invalid blocks and counts microdata", async () => {
    pages.set("https://shop.example/mug", {
      status: 200,
      body: [
        `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Mug","offers":{"@type":"Offer","price":"9","priceCurrency":"USD","availability":"https://schema.org/InStock"}}</script>`,
        `<script type="application/ld+json">{ broken </script>`,
        `<div itemscope itemtype="https://schema.org/Review"></div>`,
      ].join(""),
    });
    const { POST } = await import("./route");
    const res = await POST(post({ url: "https://shop.example/mug" }));
    expect(res.status).toBe(200);
    const { report } = await res.json();
    expect(report.jsonLd.totalBlocks).toBe(2);
    expect(report.jsonLd.entities[0]).toMatchObject({ shortTypes: ["Product"], status: "ok" });
    expect(report.jsonLd.blocks[1].valid).toBe(false);
    expect(report.microdata).toEqual({ count: 1, types: [{ type: "Review", count: 1 }] });
    expect(report.summary.invalidBlocks).toBe(1);
  });

  it("maps SSRF errors to a friendly 400, rejects bad input and hides unexpected errors", async () => {
    const { POST } = await import("./route");
    const blocked = await POST(post({ url: "http://blocked.internal/" }));
    expect(blocked.status).toBe(400);
    expect((await blocked.json()).error).toBe("This host can't be checked.");
    expect((await POST(post({ url: "" }))).status).toBe(400);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failed = await POST(post({ url: "https://explode.example/" }));
    expect(failed.status).toBe(500);
    expect((await failed.json()).error).not.toContain("boom");
    spy.mockRestore();
  });
});
