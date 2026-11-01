import { describe, expect, it } from "vitest";
import { summarizeAuditLeads, type RawAuditLead } from "./audit-leads";

const now = new Date("2026-11-01T12:00:00Z");
const d = (iso: string) => new Date(iso);

function lead(over: Partial<RawAuditLead>): RawAuditLead {
  return {
    id: over.id ?? "l1",
    email: "a@x.com",
    host: "x.com",
    status: "COMPLETED",
    pagesCrawled: 10,
    healthScore: 90,
    errorCount: 0,
    emailedAt: d("2026-10-30T10:05:00Z"),
    errorMessage: null,
    createdAt: d("2026-10-30T10:00:00Z"),
    ...over,
  };
}

const isInternal = (e: string) => e.endsWith("@mykavo.app");

describe("summarizeAuditLeads", () => {
  it("counts requests, emailed, failed and the last 7 days", () => {
    const s = summarizeAuditLeads(
      [
        lead({ id: "1" }),
        lead({ id: "2", email: "b@y.com", status: "FAILED", emailedAt: null }),
        lead({ id: "3", email: "c@z.com", createdAt: d("2026-10-01T00:00:00Z") }),
      ],
      [],
      { includeInternal: false, isInternal, now },
    );
    expect(s).toMatchObject({ total: 3, last7d: 2, emailed: 2, failed: 1, signedUpAfter: 0 });
    expect(s.recent.map((r) => r.id)).toEqual(["1", "2", "3"]);
  });

  it("marks a signup only when the account came after the audit", () => {
    const s = summarizeAuditLeads(
      [lead({ id: "1", email: "New@X.com" }), lead({ id: "2", email: "old@y.com" })],
      [
        { id: "u1", email: "new@x.com", createdAt: d("2026-10-30T11:00:00Z") },
        { id: "u2", email: "old@y.com", createdAt: d("2026-09-01T00:00:00Z") },
      ],
      { includeInternal: false, isInternal, now },
    );
    expect(s.signedUpAfter).toBe(1);
    const byId = Object.fromEntries(s.recent.map((r) => [r.id, r]));
    expect(byId["1"]).toMatchObject({ userId: "u1", signedUpAfter: true });
    expect(byId["2"]).toMatchObject({ userId: "u2", signedUpAfter: false });
  });

  it("hides team requests unless asked", () => {
    const leads = [lead({ id: "1", email: "me@mykavo.app" }), lead({ id: "2" })];
    expect(summarizeAuditLeads(leads, [], { includeInternal: false, isInternal, now }).total).toBe(1);
    expect(summarizeAuditLeads(leads, [], { includeInternal: true, isInternal, now }).total).toBe(2);
  });
});
