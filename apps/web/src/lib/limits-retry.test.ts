import { describe, expect, it, vi } from "vitest";

vi.mock("@mykavo/database", () => ({ prisma: {}, isMissingTableError: () => false }));
vi.mock("@/lib/billing/subscription", () => ({ getWorkspacePlan: vi.fn(), getEffectiveWebsiteLimit: vi.fn() }));
vi.mock("@/lib/team", () => ({ hasSeatAvailable: vi.fn() }));

const { retryIn } = await import("./limits");

describe("retryIn", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  it("counts hours until the oldest use leaves the 24-hour window", () => {
    expect(retryIn(new Date("2026-10-02T02:00:00Z"), now)).toBe("in about 14 hours");
    expect(retryIn(new Date("2026-10-01T12:30:00Z"), now)).toBe("within the hour");
    expect(retryIn(new Date("2026-10-01T13:10:00Z"), now)).toBe("in about 2 hours");
  });
});
