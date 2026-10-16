import { beforeEach, describe, expect, it, vi } from "vitest";

type Status = "PENDING" | "DISCOVERING" | "BASELINING" | "ACTIVE" | "PAUSED" | "ERROR";
type Where = {
  id: string;
  status: Status | { in: Status[] };
  baselines?: { none: { status: "ACTIVE" } };
  scans?: { none: { status: { in: string[] } } };
};
type Data = { status: Status; url?: string; normalizedUrl?: string };

// One website row plus whether it has an ACTIVE baseline: enough to evaluate
// the filters the route sends to updateMany.
const site = {
  id: "web1",
  url: "https://example.com/",
  normalizedUrl: "https://example.com/",
  status: "PENDING" as Status,
  hasBaseline: false,
  hasFinishedScan: false,
};
const updateMany = vi.fn(async ({ where, data }: { where: Where; data: Data }) => {
  const statusOk = typeof where.status === "string" ? site.status === where.status : where.status.in.includes(site.status);
  const baselineOk = !where.baselines || !site.hasBaseline;
  const scanOk = !where.scans || !site.hasFinishedScan;
  if (where.id !== site.id || !statusOk || !baselineOk || !scanOk) return { count: 0 };
  Object.assign(site, data);
  return { count: 1 };
});
vi.mock("@mykavo/database", () => ({
  prisma: { website: { updateMany: (a: { where: Where; data: Data }) => updateMany(a) } },
}));

vi.mock("@/lib/api-auth", () => ({
  getApiContext: async () => ({ workspace: { id: "ws1" }, role: "OWNER" }),
  requireRole: () => null,
  getOwnedWebsite: async () => ({ ...site }),
}));
vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: () => ({ allowed: true, retryAfterSeconds: 0 }),
}));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

class DiscoveryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
type Discovery = { pages: { url: string; source: string }[]; warnings: string[]; truncated: boolean; finalUrl: string };
const discover = vi.fn<() => Promise<Discovery>>();
vi.mock("@/lib/discovery", () => ({ discoverPages: () => discover(), DiscoveryError }));

const { POST } = await import("./route");

const run = () =>
  POST(new Request("https://mykavo.app/api/websites/web1/discover", { method: "POST" }), {
    params: Promise.resolve({ id: "web1" }),
  });

const found = (finalUrl = "https://www.example.com/"): Discovery => ({
  pages: [{ url: finalUrl, source: "homepage" }],
  warnings: [],
  truncated: false,
  finalUrl,
});

function reset(status: Status, hasBaseline: boolean, hasFinishedScan = false) {
  Object.assign(site, {
    url: "https://example.com/",
    normalizedUrl: "https://example.com/",
    status,
    hasBaseline,
    hasFinishedScan,
  });
}

describe("POST /api/websites/[id]/discover", () => {
  beforeEach(() => {
    updateMany.mockClear();
    discover.mockReset();
  });

  it("moves a website being set up to PENDING and adopts the redirected homepage", async () => {
    reset("PENDING", false);
    discover.mockResolvedValue(found());
    const res = await run();
    expect(res.status).toBe(200);
    expect((await res.json()).pages).toHaveLength(1);
    expect(site.status).toBe("PENDING");
    expect(site.url).toBe("https://www.example.com/");
    expect(site.normalizedUrl).not.toBe("https://example.com/");
  });

  it("marks a website being set up ERROR when discovery fails, and a retry recovers it", async () => {
    reset("PENDING", false);
    discover.mockRejectedValue(new DiscoveryError("HOMEPAGE_UNREACHABLE", "The website could not be reached."));
    expect((await run()).status).toBe(400);
    expect(site.status).toBe("ERROR");

    discover.mockReset();
    discover.mockResolvedValue(found("https://example.com/"));
    expect((await run()).status).toBe(200);
    expect(site.status).toBe("PENDING");
  });

  it.each<[Status, boolean]>([
    ["ACTIVE", true],
    ["PAUSED", true],
    ["PAUSED", false],
    ["ERROR", true],
    ["BASELINING", true],
  ])("leaves a %s website (baseline: %s) untouched and still returns pages", async (status, hasBaseline) => {
    reset(status, hasBaseline);
    discover.mockResolvedValue(found());
    const res = await run();
    expect(res.status).toBe(200);
    expect((await res.json()).pages).toHaveLength(1);
    expect(site).toMatchObject({ status, url: "https://example.com/", normalizedUrl: "https://example.com/" });
    // Only the claim was attempted; nothing was written.
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it("leaves an ERROR website that was monitored before alone, even with no baseline left", async () => {
    reset("ERROR", false, true);
    discover.mockResolvedValue(found());
    const res = await run();
    expect(res.status).toBe(200);
    expect(site.status).toBe("ERROR");
  });

  it("keeps a monitored site's pages on www after the homepage starts redirecting there", async () => {
    reset("ACTIVE", true, true);
    discover.mockResolvedValue(found("https://www.example.com/"));
    const body = await (await run()).json();
    expect(body.pages).toHaveLength(1);
    expect(body.warnings).toEqual([]);
    expect(site.url).toBe("https://example.com/");
  });

  it("drops pages on a different host a monitored site now redirects to, and says why", async () => {
    reset("ACTIVE", true, true);
    discover.mockResolvedValue(found("https://other.net/"));
    const body = await (await run()).json();
    expect(body.pages).toHaveLength(0);
    expect(body.warnings[0]).toContain("other.net");
    expect(site.url).toBe("https://example.com/");
  });

  it("does not mark a paused website ERROR when discovery fails", async () => {
    reset("PAUSED", true);
    discover.mockRejectedValue(new DiscoveryError("HOMEPAGE_ERROR_STATUS", "The homepage returned HTTP 500."));
    expect((await run()).status).toBe(400);
    expect(site.status).toBe("PAUSED");
  });

  it("does not overwrite a pause made while discovery was running", async () => {
    reset("PENDING", false);
    discover.mockImplementation(async () => {
      site.status = "PAUSED";
      return found();
    });
    expect((await run()).status).toBe(200);
    expect(site).toMatchObject({ status: "PAUSED", url: "https://example.com/" });
  });
});
