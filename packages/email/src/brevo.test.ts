import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { brevoCampaigns, brevoCreateCampaign, marketingProvider, sendCreditsLeft, sendMarketingEmail, sendViaBrevo } from "./brevo";
import { addContactNow, membership, pushContacts, type Audience, type AudienceKey, type SyncContact } from "./brevo-sync";
import { campaignEmail, fromBrevoTags, readCampaignSource, toBrevoTags } from "./templates";

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

describe("adding a signup straight away", () => {
  it("creates the contact in All, Free and No website, with its fields", async () => {
    respond = (c) => {
      if (c.url.includes("/contacts/folders?")) return { status: 200, body: { folders: [{ id: 12, name: "MyKavo" }] } };
      if (c.url.includes("/contacts/folders/12/lists")) {
        return {
          status: 200,
          body: { lists: [["MyKavo · All users", 13], ["MyKavo · Free plan", 14], ["MyKavo · Paid plans", 15], ["MyKavo · No website yet", 16]].map(([name, id]) => ({ name, id })) },
        };
      }
      return { status: 201, body: { id: 1 } };
    };
    expect(await addContactNow(contact({ email: "new@x.co", websites: 0 }))).toBe(true);
    const create = calls.find((c) => c.method === "POST" && c.url.endsWith("/v3/contacts"));
    expect(create?.body).toMatchObject({ email: "new@x.co", listIds: [13, 14, 16], updateEnabled: true, attributes: { FIRSTNAME: "Ana", MYKAVO_PLAN: "free" } });
  });

  it("waits for the first sync when the lists do not exist yet", async () => {
    respond = () => ({ status: 200, body: { folders: [] } });
    expect(await addContactNow(contact({}))).toBe(false);
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });
});

describe("campaigns on Brevo plans without campaign tags", () => {
  const input = { name: "Founder note", subject: "Hi", previewText: "", htmlContent: "<p>x</p>", listIds: [13] };

  it("tags the campaign when the plan allows it", async () => {
    respond = () => ({ status: 201, body: { id: 7 } });
    expect(await brevoCreateCampaign(input)).toBe(7);
    expect(calls).toHaveLength(1);
    expect((calls[0].body as { tag?: string }).tag).toBe("mykavo");
  });

  it("creates it untagged when Brevo refuses the tag (Free plan)", async () => {
    respond = (c) =>
      (c.body as { tag?: string }).tag
        ? { status: 405, body: { code: "method_not_allowed", message: "You are not allowed to avail tag option for your campaign" } }
        : { status: 201, body: { id: 8 } };
    expect(await brevoCreateCampaign(input)).toBe(8);
    expect(calls).toHaveLength(2);
    expect((calls[1].body as { tag?: string }).tag).toBeUndefined();
    expect((calls[1].body as { recipients: unknown }).recipients).toEqual({ listIds: [13] });
  });

  it("does not retry other failures", async () => {
    respond = () => ({ status: 400, body: { code: "invalid_parameter", message: "sender is invalid" } });
    await expect(brevoCreateCampaign(input)).rejects.toThrow("sender is invalid");
    expect(calls).toHaveLength(1);
  });

  it("lists MyKavo's campaigns by tag or by the MyKavo lists, never other brands'", async () => {
    respond = () => ({
      status: 200,
      body: {
        campaigns: [
          { id: 1, name: "tagged", status: "sent", tag: "mykavo", createdAt: "2026-09-01" },
          { id: 2, name: "untagged, our list", status: "draft", createdAt: "2026-09-02", recipients: { lists: [15] } },
          { id: 3, name: "other brand", status: "sent", createdAt: "2026-09-03", recipients: { lists: [4] } },
        ],
      },
    });
    const ids = (await brevoCampaigns(30, [13, 14, 15, 16])).map((c) => c.id);
    expect(ids).toEqual([1, 2]);
  });
});

describe("reopening a saved campaign", () => {
  const data = {
    heading: "Thanks for trying MyKavo",
    body: "Hi {firstName},\n\nOne question: what's the site you'd <hate> to break?\nJust reply.\n\nDakshesh",
    buttonLabel: "Open MyKavo",
    buttonUrl: "https://mykavo.app/dashboard",
  };

  it("reads the composer's fields back from the campaign HTML", () => {
    const html = campaignEmail(data, { kind: "brevo" });
    expect(readCampaignSource(html)).toEqual(data);
  });

  it("rebuilds drafts saved before the fields were embedded", () => {
    const legacy = campaignEmail(data, { kind: "brevo" }).replace(/<!--mykavo-campaign:[^>]*-->/, "");
    expect(readCampaignSource(legacy)).toEqual(data);
  });

  it("still reads a draft Brevo re-serialised (spacing, attribute order)", () => {
    const legacy = campaignEmail(data, { kind: "brevo" })
      .replace(/<!--mykavo-campaign:[^>]*-->/, "")
      .replace(/color:#5c6270/g, "color: #5c6270")
      .replace(/<a href="([^"]*)" style="([^"]*)">/, '<a style="$2" href="$1">');
    expect(readCampaignSource(legacy)).toEqual(data);
  });

  it("is null for HTML that is not a MyKavo campaign", () => {
    expect(readCampaignSource("<html><body><p>Hello</p></body></html>")).toBeNull();
  });

  it("keeps the fields out of what readers see", () => {
    const html = campaignEmail(data, { kind: "brevo" });
    expect(html).toMatch(/<!--mykavo-campaign:[A-Za-z0-9_-]+--><\/body>/);
    expect(html.replace(/<!--[\s\S]*?-->/g, "")).not.toContain("mykavo-campaign");
  });

  it("turns Brevo's name tag back into {firstName}", () => {
    expect(fromBrevoTags(toBrevoTags("Hi {firstName}, a question for {firstName}"))).toBe("Hi {firstName}, a question for {firstName}");
  });
});
