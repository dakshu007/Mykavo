import { describe, expect, it } from "vitest";
import {
  CAMPAIGNS,
  activeCampaign,
  campaignEndsLabel,
  campaignPrice,
  formatUsd,
} from "./campaign";

const halloween = CAMPAIGNS.find((c) => c.id === "halloween-2026")!;

describe("activeCampaign", () => {
  it("runs from the start instant up to, not including, the end", () => {
    expect(activeCampaign(new Date(halloween.startsAt.getTime() - 1))).toBeNull();
    expect(activeCampaign(halloween.startsAt)?.id).toBe("halloween-2026");
    expect(activeCampaign(new Date(halloween.endsAt.getTime() - 1))?.id).toBe("halloween-2026");
    expect(activeCampaign(halloween.endsAt)).toBeNull();
  });

  it("matches the code configured in Dodo", () => {
    expect(halloween).toMatchObject({ code: "SPOOKY30", percent: 30, cycles: 3 });
  });
});

describe("campaignPrice", () => {
  it("takes the percent off to the cent", () => {
    expect(campaignPrice(20, 30)).toBe(14);
    expect(campaignPrice(79, 30)).toBe(55.3);
  });
});

describe("formatUsd", () => {
  it("keeps whole dollars whole and shows cents otherwise", () => {
    expect(formatUsd(14)).toBe("$14");
    expect(formatUsd(55.3)).toBe("$55.30");
  });
});

describe("campaignEndsLabel", () => {
  const end = halloween.endsAt.getTime();
  it("counts down in days, then tomorrow, then today", () => {
    expect(campaignEndsLabel(halloween, new Date(end - 5 * 86_400_000 + 1))).toBe("Ends in 5 days");
    expect(campaignEndsLabel(halloween, new Date(end - 30 * 3_600_000))).toBe("Ends tomorrow");
    expect(campaignEndsLabel(halloween, new Date(end - 3_600_000))).toBe("Ends today");
  });
});
