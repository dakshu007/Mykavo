import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

/** Network replaced by canned pages so input validation and SSRF error mapping run as in production. */
const pages = new Map<string, { status: number; body: string }>();

vi.mock("@/lib/security/ssrf", async () => {
  const actual = await vi.importActual<typeof import("@mykavo/shared/ssrf")>("@mykavo/shared/ssrf");
  return {
    ...actual,
    safeFetch: vi.fn(async (url: string) => {
      if (url.includes("blocked.internal")) throw new actual.UnsafeUrlError("BLOCKED_HOST", "x");
      const p = pages.get(url) ?? { status: 404, body: "" };
      return { finalUrl: url, status: p.status, headers: new Headers(), body: p.body, bodyBytes: p.body.length, redirectChain: [], responseTimeMs: 1 };
    }),
  };
});

function post(body: unknown) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  pages.clear();
});

describe("POST /api/tools/analytics-tags", () => {
  it("reports GA4 and GTM IDs with warnings", async () => {
    pages.set("https://example.com/", {
      status: 200,
      body: `<script async src="https://www.googletagmanager.com/gtag/js?id=G-ROUTE1234"></script><script>gtag("config","G-ROUTE1234");</script><script>(function(w,d,s,l,i){})(window,document,"script","dataLayer","GTM-ROUTE12");</script>`,
    });
    const res = await POST(post({ url: "example.com" }));
    expect(res.status).toBe(200);
    const { report } = await res.json();
    expect(report.finalUrl).toBe("https://example.com/");
    expect(report.tags.map((t: { key: string }) => t.key)).toEqual(["ga4", "gtm"]);
    expect(report.warnings.some((w: { text: string }) => w.text.includes("counted twice"))).toBe(true);
  });

  it("maps SSRF errors to a friendly 400 and rejects empty input", async () => {
    const blocked = await POST(post({ url: "http://blocked.internal/" }));
    expect(blocked.status).toBe(400);
    expect((await blocked.json()).error).toBe("This host can't be checked.");
    expect((await POST(post({ url: "" }))).status).toBe(400);
  });
});
