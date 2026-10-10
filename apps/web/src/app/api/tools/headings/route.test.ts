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
  return new Request("http://localhost/api/tools/headings", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  });
}

beforeEach(() => pages.clear());

describe("POST /api/tools/headings", () => {
  it("returns the outline, counts and issues for a page", async () => {
    pages.set("https://example.com/", {
      status: 200,
      body: `<title>Example</title><h1>Example</h1><h2>Plans</h2><h4>Skipped</h4><script>"<h1>x</h1>"</script>`,
    });
    const { POST } = await import("./route");
    const res = await POST(post({ url: "example.com" }));
    expect(res.status).toBe(200);
    const { report } = await res.json();
    expect(report.headings.map((h: { level: number }) => h.level)).toEqual([1, 2, 4]);
    expect(report.counts["1"]).toBe(1);
    expect(report.titleVsH1).toBe("identical");
    expect(report.issues.map((i: { id: string }) => i.id)).toEqual(["skipped-level"]);
  });

  it("maps SSRF errors to a friendly 400, rejects bad input and hides unexpected errors", async () => {
    const { POST } = await import("./route");
    const blocked = await POST(post({ url: "http://blocked.internal/" }));
    expect(blocked.status).toBe(400);
    expect((await blocked.json()).error).toBe("This host can't be checked.");
    expect((await POST(post({ url: "" }))).status).toBe(400);
    expect((await POST(post({ nope: 1 }))).status).toBe(400);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failed = await POST(post({ url: "https://explode.example/" }));
    expect(failed.status).toBe(500);
    expect((await failed.json()).error).not.toContain("boom");
    spy.mockRestore();
  });
});
