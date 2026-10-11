import { describe, expect, it, vi } from "vitest";

vi.mock("@mykavo/database", () => ({ prisma: {}, isMissingTableError: () => false }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { checkStatus } = await import("./wp-update-history");

describe("checkStatus", () => {
  it("marks an update checked when a scan ran for it", () => {
    expect(checkStatus({ scanId: "scan1", reason: null })).toEqual({ checked: true, label: "Checked" });
  });

  it("says why an update was not checked", () => {
    expect(checkStatus({ scanId: null, reason: "PLAN" }).label).toMatch(/come with Pro/);
    expect(checkStatus({ scanId: null, reason: "NO_BASELINE" }).label).toMatch(/baseline/);
    expect(checkStatus({ scanId: null, reason: "QUOTA" }).label).toMatch(/limit/);
    expect(checkStatus({ scanId: null, reason: "SOMETHING_NEW" })).toEqual({
      checked: false,
      label: "Not checked - the check could not start",
    });
  });
});
