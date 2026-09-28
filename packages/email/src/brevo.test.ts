import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { marketingProvider, sendCreditsLeft, sendMarketingEmail, sendViaBrevo } from "./brevo";
import { membership, pushContacts, type Audience, type AudienceKey, type SyncContact } from "./brevo-sync";
import { campaignEmail, toBrevoTags } from "./templates";

type Call = { url: string; method: string; body: unknown; key: string | null };
let calls: Call[] = [];
let respond: (c: Call) => { status: number; body: unknown } = () => ({ status: 201, body: {} });

beforeEach(() => {
  calls = [];
  vi.stubEnv("BREVO_API_KEY", "test-key");
  vi.stubEnv("BREVO_SENDER_EMAIL", "hello@mykavo.app");
  vi.stubGlobal("fetch", async (url: URL | string, init: RequestInit = {}) => {
    const c: Call = {
      url: String(url),
      method: init.method ?? "GET",
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      key: new Headers(init.headers).get("api-key"),
    };
    calls.push(c);
    const r = respond(c);
    return new Response(JSON.stringify(r.body), { status: r.status });
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  respond = () => ({ status: 201, body: {} });
});

describe("routing", () => {
  it("uses Brevo once it has a key and a sender, and Resend otherwise", () => {
    expect(marketingProvider({ BREVO_API_KEY: "k", BREVO_SENDER_EMAIL: "a@b.co" })).toBe("brevo");
    expect(marketingProvider({ BREVO_API_KEY: "k" })).toBe("resend");
    expect(marketingProvider({})).toBe("resend");
    expect(marketingProvider({ BREVO_API_KEY: "k", BREVO_SENDER_EMAIL: "a@b.co", MARKETING_EMAIL_PROVIDER: "resend" })).toBe("resend");
  });

  it("sends promotional mail through Brevo's API with the MyKavo sender, headers and tags", async () => {
    respond = () => ({ status: 201, body: { messageId: "<m1>" } });
    const r = await sendMarketingEmail(
      { to: ["ana@example.com"], subject: "S", html: "<p>h</p>", text: "t", headers: { "List-Unsubscribe": "<https://x>" } },
      ["lifecycle"],
    );
    expect(r).toEqual({ ok: true, provider: "brevo", id: "<m1>" });
    expect(calls[0].url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(calls[0].key).toBe("test-key");
    expect(calls[0].body).toMatchObject({
      sender: { name: "MyKavo", email: "hello@mykavo.app" },
      to: [{ email: "ana@example.com" }],
      subject: "S",
      headers: { "List-Unsubscribe": "<https://x>" },
      tags: ["mykavo", "lifecycle"],
    });
  });

  it("reports Brevo's own error message instead of throwing", async () => {
    respond = () => ({ status: 400, body: { code: "invalid_parameter", message: "sender is not valid" } });
    const r = await sendViaBrevo({ to: ["a@b.co"], subject: "S", html: "<p>x</p>" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("sender is not valid");
  });

  it("reads today's send credits from the plan", () => {
    expect(sendCreditsLeft({ email: "x", plan: [{ type: "free", credits: 212, creditsType: "sendLimit" }] })).toBe(212);
    expect(sendCreditsLeft({ email: "x", plan: [] })).toBeNull();
  });
});

const audiences = Object.fromEntries(
  (["all", "free", "paid", "no_website"] as AudienceKey[]).map((k, i) => [k, { key: k, id: 100 + i, name: k, subscribers: 0 }]),
) as Record<AudienceKey, Audience>;

const contact = (over: Partial<SyncContact>): SyncContact => ({
  email: "a@example.com",
  userId: "u1",
  firstName: "Ana",
  lastName: "Lopez",
  plan: "free",
  paid: false,
  websites: 1,
  signedUpAt: new Date("2026-09-01T00:00:00Z"),
  optedOut: false,
  ...over,
});

describe("contact sync", () => {
  it("puts each account in exactly the lists it belongs in", () => {
    expect(membership({ paid: false, websites: 0 })).toEqual(["all", "free", "no_website"]);
    expect(membership({ paid: true, websites: 3 })).toEqual(["all", "paid"]);
  });

  it("imports by list group, blocklists opt-outs, and removes people from lists they left", async () => {
    const res = await pushContacts(
      [
        contact({ email: "free@x.co" }),
        contact({ email: "new@x.co", websites: 0 }),
        contact({ email: "pro@x.co", paid: true, plan: "pro" }),
        contact({ email: "gone@x.co", optedOut: true }),
      ],
      audiences,
    );
    expect(res).toEqual({ contacts: 3, blocklisted: 1 });
    const imports = calls.filter((c) => c.url.endsWith("/contacts/import")).map((c) => c.body as { listIds: number[]; emailBlacklist?: boolean; jsonBody: { email: string; attributes: Record<string, unknown> }[] });
    expect(imports.map((i) => [i.listIds, i.jsonBody.map((j) => j.email), Boolean(i.emailBlacklist)])).toEqual([
      [[100, 101], ["free@x.co"], false],
      [[100, 101, 103], ["new@x.co"], false],
      [[100, 102], ["pro@x.co"], false],
      [[100], ["gone@x.co"], true],
    ]);
    expect(imports[2].jsonBody[0].attributes).toMatchObject({ FIRSTNAME: "Ana", EXT_ID: "u1", MYKAVO_PLAN: "pro", MYKAVO_WEBSITES: 1, MYKAVO_SIGNUP: "2026-09-01" });
    const removals = calls.filter((c) => c.url.includes("/contacts/remove")).map((c) => [c.url.match(/lists\/(\d+)/)?.[1], (c.body as { emails: string[] }).emails]);
    expect(removals).toEqual([
      ["101", ["pro@x.co"]],
      ["102", ["free@x.co", "new@x.co"]],
      ["103", ["free@x.co", "pro@x.co"]],
    ]);
  });
});

describe("campaign email", () => {
  const d = { heading: "Hi {firstName}", body: "Hello {firstName},\n\nNews <b>here</b>.", buttonLabel: "Open", buttonUrl: "https://mykavo.app/dashboard" };

  it("uses Brevo's contact and unsubscribe tags when sending", () => {
    const html = campaignEmail(d, { kind: "brevo" });
    expect(html).toContain('Hi {{ contact.FIRSTNAME | default : "there" }}');
    expect(html).toContain("{{ unsubscribe }}");
    expect(html).toContain("News &lt;b&gt;here&lt;/b&gt;.");
  });

  it("previews with a real name and escapes it", () => {
    const html = campaignEmail(d, { kind: "preview", firstName: "<Ana>" });
    expect(html).toContain("Hi &lt;Ana&gt;");
    expect(html).not.toContain("{{");
  });
});

describe("campaign subject lines", () => {
  it("personalise {firstName} with Brevo's contact tag", () => {
    expect(toBrevoTags("{firstName}, news")).toBe('{{ contact.FIRSTNAME | default : "there" }}, news');
    expect(toBrevoTags("No name here")).toBe("No name here");
  });
});
