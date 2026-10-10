import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";

/**
 * Route-level tests for the four new free tools. The network is replaced by
 * canned responses so the wiring (input validation, SSRF error mapping, the
 * extra robots.txt / style.css fetches, TLS handling) is exercised exactly as
 * in production, without depending on a live site.
 */

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
    assertSafeUrl: vi.fn(async (u: string) => new URL(u)),
  };
});

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async (host: string) => (host === "rebind.example" ? [{ address: "93.184.215.14" }, { address: "10.0.0.5" }] : [{ address: "93.184.215.14" }])),
}));

const tlsCert = {
  subject: { CN: "example.com" },
  issuer: { CN: "R11", O: "Let's Encrypt" },
  valid_from: "Sep  1 00:00:00 2026 GMT",
  valid_to: "Nov 30 00:00:00 2099 GMT",
  subjectaltname: "DNS:example.com, DNS:www.example.com",
};
const connect = vi.fn();
vi.mock("node:tls", () => ({ connect: (...args: unknown[]) => connect(...args) }));

function post(body: unknown) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  pages.clear();
  connect.mockReset();
});

describe("POST /api/tools/noindex", () => {
  it("finds a header noindex and a robots.txt block", async () => {
    pages.set("https://example.com/secret", { status: 200, body: "<title>x</title>", headers: { "x-robots-tag": "noindex" } });
    pages.set("https://example.com/robots.txt", { status: 200, body: "User-agent: *\nDisallow: /secret" });
    const { POST } = await import("./noindex/route");
    const res = await POST(post({ url: "example.com/secret" }));
    const { report } = await res.json();
    expect(report.verdict).toBe("noindex");
    expect(report.robotsTxt).toMatchObject({ blocked: true, rule: "Disallow: /secret" });
  });

  it("maps SSRF errors to a friendly 400 and rejects empty input", async () => {
    const { POST } = await import("./noindex/route");
    const blocked = await POST(post({ url: "http://blocked.internal/" }));
    expect(blocked.status).toBe(400);
    expect((await blocked.json()).error).toBe("This host can't be checked.");
    expect((await POST(post({ url: "" }))).status).toBe(400);
  });
});

describe("POST /api/tools/robots-txt", () => {
  it("reports per-crawler verdicts, the deciding line and warnings", async () => {
    pages.set("https://example.com/robots.txt", {
      status: 200,
      body: "User-agent: *\nDisallow: /cart\n\nUser-agent: GPTBot\nDisallow: /\n",
    });
    const { POST } = await import("./robots-txt/route");
    const { report } = await (await POST(post({ url: "https://example.com/cart?id=1" }))).json();
    const by = Object.fromEntries(report.results.map((r: { agent: string }) => [r.agent, r]));
    expect(by.Googlebot).toMatchObject({ allowed: false, rule: "Disallow: /cart", line: 2 });
    expect(by.GPTBot).toMatchObject({ allowed: false, rule: "Disallow: /", line: 5 });
    expect(report.warnings.join(" ")).toContain("No Sitemap");
  });

  it("treats a missing robots.txt as allow-all", async () => {
    const { POST } = await import("./robots-txt/route");
    const { report } = await (await POST(post({ url: "https://nofile.example/" }))).json();
    expect(report.effect).toBe("allow-all");
    expect(report.results.every((r: { allowed: boolean }) => r.allowed)).toBe(true);
  });
});

describe("POST /api/tools/wordpress-detect", () => {
  it("detects theme header (via style.css), parent theme and plugins", async () => {
    pages.set("https://shop.example/", {
      status: 200,
      body: `<link href="/wp-content/themes/storefront-child/style.css"><link href="/wp-content/themes/storefront-child/a.css"><script src="/wp-content/plugins/woocommerce/x.js"></script><script src="/wp-includes/js/wp-embed.js"></script>`,
    });
    pages.set("https://shop.example/wp-content/themes/storefront-child/style.css", {
      status: 200,
      body: "/*\nTheme Name: Storefront Child\nTemplate: storefront\nVersion: 2.0\n*/",
    });
    const { POST } = await import("./wordpress-detect/route");
    const { report } = await (await POST(post({ url: "https://shop.example/" }))).json();
    expect(report.isWordPress).toBe(true);
    expect(report.themes[0].header).toMatchObject({ name: "Storefront Child", template: "storefront", version: "2.0" });
    expect(report.plugins.map((p: { name: string }) => p.name)).toEqual(["WooCommerce"]);
  });
});

describe("POST /api/tools/ssl-certificate", () => {
  function fakeSocket(authorized: boolean, error: string | null) {
    const s = new EventEmitter() as EventEmitter & Record<string, unknown>;
    Object.assign(s, {
      authorized,
      authorizationError: error,
      getPeerCertificate: () => tlsCert,
      getProtocol: () => "TLSv1.3",
      destroy: vi.fn(),
    });
    setTimeout(() => s.emit("secureConnect"), 0);
    return s;
  }

  it("connects to the vetted IP on 443 with SNI and summarizes the certificate", async () => {
    connect.mockImplementation(() => fakeSocket(true, null));
    const { POST } = await import("./ssl-certificate/route");
    const { report } = await (await POST(post({ url: "www.example.com" }))).json();
    expect(connect).toHaveBeenCalledWith(expect.objectContaining({ host: "93.184.215.14", port: 443, servername: "www.example.com" }));
    expect(report).toMatchObject({ trusted: true, protocol: "TLSv1.3", certificate: { coversHostname: true, status: "ok" } });
  });

  it("reports an untrusted chain in plain English", async () => {
    connect.mockImplementation(() => fakeSocket(false, "UNABLE_TO_VERIFY_LEAF_SIGNATURE"));
    const { POST } = await import("./ssl-certificate/route");
    const { report } = await (await POST(post({ url: "example.com" }))).json();
    expect(report.trusted).toBe(false);
    expect(report.trustErrorText).toContain("intermediate");
  });

  it("refuses a host whose DNS includes a private address, before connecting", async () => {
    const { POST } = await import("./ssl-certificate/route");
    const res = await POST(post({ url: "rebind.example" }));
    expect(res.status).toBe(400);
    expect(connect).not.toHaveBeenCalled();
  });

  it("explains a failed handshake", async () => {
    connect.mockImplementation(() => {
      const s = new EventEmitter() as EventEmitter & { destroy: () => void };
      s.destroy = vi.fn();
      setTimeout(() => s.emit("error", new Error("ECONNREFUSED")), 0);
      return s;
    });
    const { POST } = await import("./ssl-certificate/route");
    const res = await POST(post({ url: "example.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("port 443");
  });
});
