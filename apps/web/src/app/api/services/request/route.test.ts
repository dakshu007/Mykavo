import { beforeEach, describe, expect, it, vi } from "vitest";

interface CreateArgs {
  data: Record<string, unknown>;
}
interface FindArgs {
  where: { id: string; website: { workspaceId: string } };
}
interface EmailArgs {
  to: string[];
  subject: string;
  html: string;
  headers?: Record<string, string>;
}

const create = vi.fn<(args: CreateArgs) => Promise<{ id: string }>>(async () => ({ id: "req_123" }));
const findFirst = vi.fn<(args: FindArgs) => Promise<unknown>>(async () => null);
const sendEmail = vi.fn<(args: EmailArgs) => Promise<{ ok: boolean; provider: string }>>(
  async () => ({ ok: true, provider: "console" }),
);
const getApiContext = vi.fn<() => Promise<unknown>>(async () => null);

vi.mock("@mykavo/database", () => ({
  prisma: {
    serviceRequest: { create: (args: CreateArgs) => create(args) },
    changeEvent: { findFirst: (args: FindArgs) => findFirst(args) },
  },
}));
vi.mock("@mykavo/email", () => ({ sendEmail: (args: EmailArgs) => sendEmail(args) }));
vi.mock("@/lib/api-auth", () => ({ getApiContext: () => getApiContext() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { GET, POST } = await import("./route");

let ipCounter = 0;
/** A fresh IP per request so the shared in-memory limiter never leaks between tests. */
function nextIp(): string {
  ipCounter += 1;
  return `203.0.113.${ipCounter}`;
}

function post(body: unknown, ip = nextIp()): Promise<Response> {
  return POST(
    new Request("https://mykavo.app/api/services/request", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

function get(query: string, ip = nextIp()): Promise<Response> {
  return GET(
    new Request(`https://mykavo.app/api/services/request${query}`, {
      headers: { "x-forwarded-for": ip },
    }),
  );
}

const VALID = {
  name: "Sam Rivera",
  email: "sam@example.com",
  websiteUrl: "https://example.com",
  message: "Our contact form stopped sending after the theme update.",
  urgency: "today",
  platform: "wordpress",
};

const CTX = {
  userId: "user_1",
  userEmail: "owner@example.com",
  workspace: { id: "ws_1", name: "Owner's Workspace" },
  role: "OWNER",
};

const CHANGE = {
  id: "chg12345678",
  title: "Contact form missing",
  severity: "CRITICAL",
  detectedAt: new Date("2026-10-10T12:00:00Z"),
  website: { url: "https://example.com" },
  monitoredPage: { url: "https://example.com/contact" },
};

beforeEach(() => {
  create.mockClear();
  findFirst.mockReset();
  findFirst.mockResolvedValue(null);
  sendEmail.mockReset();
  sendEmail.mockResolvedValue({ ok: true, provider: "console" });
  getApiContext.mockReset();
  getApiContext.mockResolvedValue(null);
});

describe("POST /api/services/request", () => {
  it("saves a public request and emails the team with reply-to set", async () => {
    const res = await post(VALID);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(create).toHaveBeenCalledTimes(1);
    const saved = create.mock.calls[0]?.[0].data;
    expect(saved).toMatchObject({
      name: "Sam Rivera",
      email: "sam@example.com",
      websiteUrl: "https://example.com",
      urgency: "today",
      platform: "wordpress",
      kind: "fix",
      changeEventId: null,
      userId: null,
      workspaceId: null,
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = sendEmail.mock.calls[0]?.[0];
    expect(mail?.to).toEqual(["support@mykavo.app"]);
    expect(mail?.replyTo).toBe("sam@example.com");
  });

  it("still succeeds when the email fails, because the request is saved", async () => {
    sendEmail.mockResolvedValue({ ok: false, provider: "noop" });
    const res = await post(VALID);
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);

    sendEmail.mockRejectedValue(new Error("network down"));
    const res2 = await post(VALID);
    expect(res2.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("returns 500 and sends nothing when the request cannot be saved", async () => {
    create.mockRejectedValueOnce(new Error("db down"));
    const res = await post(VALID);
    expect(res.status).toBe(500);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("rejects invalid input with a readable message", async () => {
    const res = await post({ ...VALID, websiteUrl: "javascript:alert(1)" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/website address/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON", async () => {
    const res = await post("not json");
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("answers a filled honeypot with a silent 200 and stores nothing", async () => {
    const res = await post({ ...VALID, company_website_url: "http://spam.example" });
    expect(res.status).toBe(200);
    expect(create).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("rate limits repeated submissions from one connection", async () => {
    const ip = nextIp();
    for (let i = 0; i < 5; i += 1) expect((await post(VALID, ip)).status).toBe(200);
    const blocked = await post(VALID, ip);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).not.toBeNull();
  });

  it("links the change, user and workspace when the change belongs to the signed-in workspace", async () => {
    getApiContext.mockResolvedValue(CTX);
    findFirst.mockResolvedValue(CHANGE);
    const res = await post({ ...VALID, changeEventId: CHANGE.id });
    expect(res.status).toBe(200);
    expect(findFirst.mock.calls[0]?.[0].where).toEqual({
      id: CHANGE.id,
      website: { workspaceId: "ws_1" },
    });
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      changeEventId: CHANGE.id,
      userId: "user_1",
      workspaceId: "ws_1",
    });
    expect(sendEmail.mock.calls[0]?.[0].html).toContain(`/dashboard/changes/${CHANGE.id}`);
  });

  it("drops a change id from another workspace but keeps the request", async () => {
    getApiContext.mockResolvedValue(CTX);
    findFirst.mockResolvedValue(null);
    const res = await post({ ...VALID, changeEventId: "chgothers999" });
    expect(res.status).toBe(200);
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      changeEventId: null,
      userId: "user_1",
      workspaceId: "ws_1",
    });
  });

  it("ignores a change id from a signed-out visitor without looking it up", async () => {
    const res = await post({ ...VALID, changeEventId: CHANGE.id });
    expect(res.status).toBe(200);
    expect(findFirst).not.toHaveBeenCalled();
    expect(create.mock.calls[0]?.[0].data).toMatchObject({ changeEventId: null, userId: null });
  });

  it("still saves the request if the session lookup throws", async () => {
    getApiContext.mockRejectedValue(new Error("auth down"));
    const res = await post(VALID);
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/services/request", () => {
  it("returns 404 for a missing or malformed change id", async () => {
    expect((await get("")).status).toBe(404);
    expect((await get("?change=%3Cscript%3E")).status).toBe(404);
    expect(getApiContext).not.toHaveBeenCalled();
  });

  it("returns 401 when signed out", async () => {
    const res = await get(`?change=${CHANGE.id}`);
    expect(res.status).toBe(401);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 for a change outside the workspace", async () => {
    getApiContext.mockResolvedValue(CTX);
    const res = await get(`?change=${CHANGE.id}`);
    expect(res.status).toBe(404);
    expect(findFirst.mock.calls[0]?.[0].where.website.workspaceId).toBe("ws_1");
  });

  it("returns the prefill for the owner's change", async () => {
    getApiContext.mockResolvedValue(CTX);
    findFirst.mockResolvedValue(CHANGE);
    const res = await get(`?change=${CHANGE.id}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = (await res.json()) as Record<string, string>;
    expect(body.changeId).toBe(CHANGE.id);
    expect(body.websiteUrl).toBe("https://example.com");
    expect(body.title).toBe("Contact form missing");
    expect(body.email).toBe("owner@example.com");
    expect(body.message).toContain("Page: https://example.com/contact");
  });
});
