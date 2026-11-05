import { describe, expect, it } from "vitest";
import { buildReportSummary } from "./wp-reports";

describe("buildReportSummary", () => {
  const now = new Date("2026-11-05T12:00:00Z");

  it("counts rollbacks apart from updates and floors uptime", () => {
    const s = buildReportSummary({
      updates: [
        { items: [{ type: "plugin", name: "A", action: "update" }] },
        { items: [{ type: "plugin", name: "A", action: "rollback" }] },
        { items: [] },
      ],
      uptimePercent: 99.96,
      sslValidTo: new Date("2026-12-05T18:00:00Z"),
      changesCaught: 6,
      aiVisits: 1840,
      now,
    });
    expect(s).toEqual({ updates: 2, rollbacks: 1, uptimePermille: 999, sslDaysLeft: 30, changesCaught: 6, aiVisits: 1840 });
  });

  it("leaves out uptime and SSL when nothing was measured", () => {
    const s = buildReportSummary({ updates: [], uptimePercent: null, sslValidTo: null, changesCaught: 0, aiVisits: 0, now });
    expect(s).toEqual({ updates: 0, rollbacks: 0, changesCaught: 0, aiVisits: 0 });
  });
});
