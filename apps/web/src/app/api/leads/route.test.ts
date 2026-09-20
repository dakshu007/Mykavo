import { describe, expect, it, vi, beforeEach } from "vitest";

const recordLead = vi.fn(async (_lead: unknown) => ({ stored: true }));
vi.mock("@/lib/lead-sheet", () => ({
  recordLead: (lead: unknown) => recordLead(lead),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { POST } = await import("./route");

let ipCounter = 0;
/** A fresh IP per test, so the shared rate limiter cannot leak between them. */
function nextIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

function post(body: unknown, ip = nextIp()): Promise<Response> {
  return POST(
    new Request("https://mykavo.app/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

const VALID = {
  kind: "demo",
  name: "Alex Morgan",
  email: "Alex@Agency.COM",
  company: "Morgan Digital",
};

describe("POST /api/leads", () => {
  beforeEach(() => recordLead.mockClear());

  it("accepts a valid submission and normalises the email", async () => {
    const res = await post(VALID);
    expect(res.status).toBe(200);
    expect(recordLead).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "demo", email: "alex@agency.com" }),
    );
  });

  it("rejects an invalid email with a message a person can act on", async () => {
    const res = await post({ kind: "demo", name: "A", email: "nope" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Enter a valid email address" });
    expect(recordLead).not.toHaveBeenCalled();
  });

  it("rejects an unknown lead kind", async () => {
    const res = await post({ kind: "newsletter", name: "A", email: "a@b.com" });
    expect(res.status).toBe(400);
    expect(recordLead).not.toHaveBeenCalled();
  });

  /**
   * The honeypot must answer 200 and record nothing.
   *
   * Validating the field instead returned a 400 naming it - which tells the
   * next bot exactly which input to leave alone, and defeats the trap. That
   * is not hypothetical: it is what the first implementation did, and only a
   * live request against the running route revealed it.
   */
  it("answers a filled honeypot with a silent 200 and stores nothing", async () => {
    const res = await post({ ...VALID, company_website_url: "http://spam.example" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(recordLead).not.toHaveBeenCalled();
  });

  it("does not name the honeypot field in any response", async () => {
    const res = await post({ ...VALID, company_website_url: "http://spam.example" });
    expect(JSON.stringify(await res.json())).not.toContain("company_website_url");
  });

  it("rate limits one IP without affecting another", async () => {
    const noisy = nextIp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await post(VALID, noisy)).status);
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);

    // A different visitor is unaffected by the noisy one.
    expect((await post(VALID, nextIp())).status).toBe(200);
  });

  it("caps oversized fields rather than forwarding them", async () => {
    const res = await post({ ...VALID, message: "x".repeat(5000) });
    expect(res.status).toBe(400);
    expect(recordLead).not.toHaveBeenCalled();
  });
});
