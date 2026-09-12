import { describe, expect, it } from "vitest";
import {
  registrableDomain,
  parseRdap,
  assessExpiry,
  blockingStatuses,
  rdapUrl,
  EXPIRY_RULES,
} from "./domain-expiry";

describe("registrableDomain", () => {
  it("strips subdomains", () => {
    expect(registrableDomain("shop.example.com")).toBe("example.com");
    expect(registrableDomain("a.b.c.example.com")).toBe("example.com");
    expect(registrableDomain("example.com")).toBe("example.com");
  });

  it("keeps three labels for known multi-part suffixes", () => {
    expect(registrableDomain("www.example.co.uk")).toBe("example.co.uk");
    expect(registrableDomain("jpfitness.co.in")).toBe("jpfitness.co.in");
    expect(registrableDomain("shop.example.com.au")).toBe("example.com.au");
  });

  it("normalises case and a trailing dot", () => {
    expect(registrableDomain("WWW.Example.COM.")).toBe("example.com");
  });

  it("returns null for things with no registration to look up", () => {
    for (const input of ["", "localhost", "192.168.1.1", "::1", "co.uk", "not a host"]) {
      expect(registrableDomain(input), input).toBeNull();
    }
  });
});

describe("parseRdap", () => {
  const response = {
    events: [
      { eventAction: "registration", eventDate: "2015-04-02T00:00:00Z" },
      { eventAction: "expiration", eventDate: "2027-04-02T00:00:00Z" },
      { eventAction: "last changed", eventDate: "2026-04-02T00:00:00Z" },
    ],
    entities: [
      { roles: ["technical"], vcardArray: ["vcard", [["fn", {}, "text", "Not The Registrar"]]] },
      { roles: ["registrar"], vcardArray: ["vcard", [["fn", {}, "text", "Example Registrar, Inc."]]] },
    ],
    status: ["client transfer prohibited", "server delete prohibited"],
  };

  it("reads the expiry date, registrar and statuses", () => {
    const parsed = parseRdap("example.com", response);
    expect(parsed.expiresAt?.toISOString()).toBe("2027-04-02T00:00:00.000Z");
    expect(parsed.registrar).toBe("Example Registrar, Inc.");
    expect(parsed.statuses).toHaveLength(2);
  });

  it("takes the expiration event, not registration or last-changed", () => {
    expect(parseRdap("example.com", response).expiresAt?.getUTCFullYear()).toBe(2027);
  });

  // Registries differ in what they include. A missing registrar must not cost
  // us the expiry date sitting right next to it.
  it("survives every shape of missing or malformed field", () => {
    for (const payload of [null, undefined, "text", 42, [], {}, { events: "no" }, { entities: {} }]) {
      const parsed = parseRdap("example.com", payload);
      expect(parsed.domain).toBe("example.com");
      expect(parsed.expiresAt).toBeNull();
    }
  });

  it("keeps the date when the registrar entity is unusable", () => {
    const parsed = parseRdap("example.com", {
      events: [{ eventAction: "expiration", eventDate: "2027-01-01T00:00:00Z" }],
      entities: [{ roles: ["registrar"] }],
    });
    expect(parsed.expiresAt).not.toBeNull();
    expect(parsed.registrar).toBeNull();
  });

  it("ignores an unparseable date rather than storing Invalid Date", () => {
    const parsed = parseRdap("example.com", {
      events: [{ eventAction: "expiration", eventDate: "not a date" }],
    });
    expect(parsed.expiresAt).toBeNull();
  });
});

describe("assessExpiry", () => {
  const now = new Date("2026-09-12T00:00:00Z");
  const inDays = (n: number) => new Date(now.getTime() + n * 86_400_000);

  it("says nothing when there is no date", () => {
    expect(assessExpiry(null, now)).toEqual({ daysRemaining: null, urgency: "ok", message: "" });
  });

  it("stays quiet on a domain that is comfortably in date", () => {
    const result = assessExpiry(inDays(200), now);
    expect(result.urgency).toBe("ok");
    expect(result.message).toBe("");
  });

  it("escalates as the date approaches", () => {
    expect(assessExpiry(inDays(45), now).urgency).toBe("notice");
    expect(assessExpiry(inDays(25), now).urgency).toBe("warning");
    expect(assessExpiry(inDays(7), now).urgency).toBe("critical");
    expect(assessExpiry(inDays(-3), now).urgency).toBe("expired");
  });

  it("puts each threshold on the urgent side of its boundary", () => {
    expect(assessExpiry(inDays(EXPIRY_RULES.criticalDays), now).urgency).toBe("critical");
    expect(assessExpiry(inDays(EXPIRY_RULES.warningDays), now).urgency).toBe("warning");
    expect(assessExpiry(inDays(EXPIRY_RULES.noticeDays), now).urgency).toBe("notice");
    expect(assessExpiry(inDays(EXPIRY_RULES.noticeDays + 1), now).urgency).toBe("ok");
  });

  it("counts days remaining", () => {
    expect(assessExpiry(inDays(30), now).daysRemaining).toBe(30);
    expect(assessExpiry(inDays(-5), now).daysRemaining).toBe(-5);
  });

  it("uses singular wording at one day", () => {
    expect(assessExpiry(inDays(1), now).message).toContain("1 day.");
  });
});

describe("blockingStatuses", () => {
  it("picks out the states that already restrict the domain", () => {
    expect(blockingStatuses(["client transfer prohibited", "clientHold"])).toEqual(["clientHold"]);
    expect(blockingStatuses(["redemption period"])).toEqual(["redemption period"]);
  });

  it("returns nothing for an ordinary healthy domain", () => {
    expect(blockingStatuses(["client transfer prohibited", "server delete prohibited"])).toEqual([]);
  });
});

describe("rdapUrl", () => {
  it("builds a bootstrap URL and escapes the domain", () => {
    expect(rdapUrl("example.com")).toBe("https://rdap.org/domain/example.com");
    expect(rdapUrl("a/b")).toBe("https://rdap.org/domain/a%2Fb");
  });
});
