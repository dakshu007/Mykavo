import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({
  DODO_API_KEY: "test-key",
  DODO_PRODUCT_ID: "pdt_pro",
  dodoApiBase: () => "https://test.dodopayments.com",
}));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { getLiveCampaign, judgeDiscount, clearCampaignCache } = await import("./campaign-server");
const { campaignsForYear } = await import("@/config/campaign");

const now = new Date("2026-10-25T12:00:00Z");
const halloween = campaignsForYear(2026)[0]!;
const good = {
  code: "SPOOKY30",
  type: "percentage",
  amount: 3000,
  starts_at: "2026-10-19T18:30:00Z",
  expires_at: "2026-11-05T18:30:00Z",
  restricted_to: ["pdt_pro", "pdt_agency"],
};

function dodoReturns(status: number, body: unknown = {}) {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", f);
  return f;
}

beforeEach(() => clearCampaignCache());
afterEach(() => vi.unstubAllGlobals());

describe("judgeDiscount", () => {
  it("accepts the code as created in Dodo", () => {
    expect(judgeDiscount(halloween, good, now)).toMatchObject({ live: true });
  });

  it("refuses a different percent, an expired or future code, or one not on Pro", () => {
    expect(judgeDiscount(halloween, { ...good, amount: 2000 }, now).live).toBe(false);
    expect(judgeDiscount(halloween, { ...good, expires_at: "2026-10-24T00:00:00Z" }, now).live).toBe(false);
    expect(judgeDiscount(halloween, { ...good, starts_at: "2026-10-26T00:00:00Z" }, now).live).toBe(false);
    expect(judgeDiscount(halloween, { ...good, restricted_to: ["pdt_other"] }, now).live).toBe(false);
  });
});

describe("getLiveCampaign", () => {
  it("is null outside the calendar window without asking Dodo", async () => {
    const f = dodoReturns(200, good);
    expect(await getLiveCampaign(new Date("2027-11-10T00:00:00Z"))).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("ends at the code's expiry when that comes first", async () => {
    dodoReturns(200, { ...good, expires_at: "2026-10-28T00:00:00Z" });
    const c = await getLiveCampaign(now);
    expect(c?.endsAt.toISOString()).toBe("2026-10-28T00:00:00.000Z");
  });

  it("hides the offer when the code doesn't exist in Dodo", async () => {
    dodoReturns(404);
    expect(await getLiveCampaign(now)).toBeNull();
  });

  it("trusts the calendar when Dodo can't be asked", async () => {
    dodoReturns(403);
    expect((await getLiveCampaign(now))?.code).toBe("SPOOKY30");
  });

  it("asks Dodo once per five minutes", async () => {
    const f = dodoReturns(200, good);
    await getLiveCampaign(now);
    await getLiveCampaign(new Date(now.getTime() + 60_000));
    expect(f).toHaveBeenCalledTimes(1);
  });
});
