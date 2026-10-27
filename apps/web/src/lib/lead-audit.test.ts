import { describe, expect, it } from "vitest";
import { LEAD_AUDIT_LIMITS, leadAuditRefusal } from "./lead-audit";

const none = { email: 0, ip: 0, host: 0, day: 0, queued: 0 };

describe("leadAuditRefusal", () => {
  it("accepts a first request", () => {
    expect(leadAuditRefusal(none)).toBeNull();
  });

  it("refuses at each limit", () => {
    expect(leadAuditRefusal({ ...none, email: LEAD_AUDIT_LIMITS.perEmail })).toMatch(/this address/);
    expect(leadAuditRefusal({ ...none, host: LEAD_AUDIT_LIMITS.perHost })).toMatch(/This site/);
    expect(leadAuditRefusal({ ...none, ip: LEAD_AUDIT_LIMITS.perIp })).toMatch(/a lot of audits today/);
    expect(leadAuditRefusal({ ...none, queued: LEAD_AUDIT_LIMITS.maxQueued })).toMatch(/right now/);
    expect(leadAuditRefusal({ ...none, day: LEAD_AUDIT_LIMITS.perDay })).toMatch(/right now/);
  });

  it("allows up to one below each limit", () => {
    expect(
      leadAuditRefusal({
        email: LEAD_AUDIT_LIMITS.perEmail - 1,
        ip: LEAD_AUDIT_LIMITS.perIp - 1,
        host: LEAD_AUDIT_LIMITS.perHost - 1,
        day: LEAD_AUDIT_LIMITS.perDay - 1,
        queued: LEAD_AUDIT_LIMITS.maxQueued - 1,
      }),
    ).toBeNull();
  });
});
