import { afterEach, describe, expect, it, vi } from "vitest";
import { createCheckoutSession } from "./dodo-api";

function mockFetch() {
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
    new Response(JSON.stringify({ checkout_url: "https://checkout.dodopayments.com/session/x" }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof mockFetch>): Record<string, unknown> {
  return JSON.parse(String(fetchMock.mock.calls[0]![1].body)) as Record<string, unknown>;
}

const base = {
  productId: "pdt_pro",
  email: "sam@example.com",
  metadata: { checkoutToken: "t", kind: "pro" },
  returnUrl: "https://mykavo.app/dashboard/billing?checkout=success",
};

afterEach(() => vi.unstubAllGlobals());

describe("createCheckoutSession", () => {
  it("pre-applies a campaign code and hides the code box so codes can't stack", async () => {
    const fetchMock = mockFetch();
    await createCheckoutSession({ ...base, discountCodes: ["SPOOKY30"] });
    const body = sentBody(fetchMock);
    expect(body.discount_codes).toEqual(["SPOOKY30"]);
    expect(body.feature_flags).toEqual({ allow_discount_code: false });
  });

  it("leaves the code box alone without a campaign", async () => {
    const fetchMock = mockFetch();
    await createCheckoutSession(base);
    const body = sentBody(fetchMock);
    expect(body).not.toHaveProperty("discount_codes");
    expect(body).not.toHaveProperty("feature_flags");
  });
});
