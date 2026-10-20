import { describe, expect, it } from "vitest";
import {
  activeCampaign,
  campaignEndsLabel,
  campaignPrice,
  campaignWindows,
  campaignsForYear,
  countdownParts,
  formatUsd,
} from "./campaign";

const ist = (iso: string) => new Date(`${iso}+05:30`);

describe("Halloween every year", () => {
  it("runs a month before Halloween through the end of 31 October", () => {
    const h = campaignsForYear(2027).find((c) => c.id === "halloween-2027")!;
    expect(h.startsAt).toEqual(ist("2027-10-01T00:00:00"));
    expect(h.endsAt).toEqual(ist("2027-11-01T00:00:00"));
    expect(h).toMatchObject({ code: "SPOOKY30", percent: 30, cycles: 3 });
  });

  it("keeps 2026 on the Dodo code's own dates", () => {
    const h = campaignsForYear(2026)[0]!;
    expect(h.startsAt).toEqual(ist("2026-10-20T00:00:00"));
    expect(h.endsAt).toEqual(ist("2026-11-06T00:00:00"));
  });

  it("is on inside the window and off outside it, every year", () => {
    expect(activeCampaign(ist("2026-10-19T23:59:59"))).toBeNull();
    expect(activeCampaign(ist("2026-10-20T00:00:00"))?.id).toBe("halloween-2026");
    expect(activeCampaign(ist("2026-11-05T23:59:59"))?.id).toBe("halloween-2026");
    expect(activeCampaign(ist("2026-11-06T00:00:00"))).toBeNull();

    expect(activeCampaign(ist("2027-09-30T23:59:59"))).toBeNull();
    expect(activeCampaign(ist("2027-10-15T12:00:00"))?.id).toBe("halloween-2027");
    expect(activeCampaign(ist("2027-10-31T23:59:59"))?.id).toBe("halloween-2027");
    expect(activeCampaign(ist("2027-11-01T00:00:00"))).toBeNull();
    expect(activeCampaign(ist("2031-10-05T00:00:00"))?.id).toBe("halloween-2031");
  });

  it("gives the boot script the same windows", () => {
    const windows = campaignWindows(2026, 3);
    const t = ist("2028-10-10T00:00:00").getTime();
    expect(windows.some(([s, e]) => t >= s && t < e)).toBe(true);
    const off = ist("2028-12-10T00:00:00").getTime();
    expect(windows.some(([s, e]) => off >= s && off < e)).toBe(false);
  });
});

describe("prices", () => {
  it("takes the percent off to the cent", () => {
    expect(campaignPrice(20, 30)).toBe(14);
    expect(campaignPrice(79, 30)).toBe(55.3);
    expect(formatUsd(14)).toBe("$14");
    expect(formatUsd(55.3)).toBe("$55.30");
  });
});

describe("countdown", () => {
  const end = ist("2026-11-06T00:00:00");
  it("splits the time left and stops at zero", () => {
    const now = new Date(end.getTime() - (2 * 86_400 + 3 * 3_600 + 4 * 60 + 5) * 1000);
    expect(countdownParts(end, now)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5, done: false });
    expect(countdownParts(end, end).done).toBe(true);
  });

  it("labels the last days", () => {
    const h = campaignsForYear(2026)[0]!;
    const e = h.endsAt.getTime();
    expect(campaignEndsLabel(h, new Date(e - 5 * 86_400_000 + 1))).toBe("Ends in 5 days");
    expect(campaignEndsLabel(h, new Date(e - 30 * 3_600_000))).toBe("Ends tomorrow");
    expect(campaignEndsLabel(h, new Date(e - 3_600_000))).toBe("Ends today");
  });
});
