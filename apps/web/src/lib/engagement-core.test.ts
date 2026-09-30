import { describe, expect, it } from "vitest";
import {
  engagementTotals,
  indexEvents,
  openStateFor,
  sortByEngagement,
  type PersonEngagement,
} from "./engagement-core";

const person = (over: Partial<PersonEngagement>): PersonEngagement => ({
  userId: "u",
  name: "A",
  email: "a@x.com",
  signedUpAt: "2026-09-01T00:00:00Z",
  plan: "free",
  paid: false,
  websites: 0,
  emails: [],
  ...over,
});

describe("indexEvents", () => {
  const index = indexEvents([
    { email: "Bas@modyn.com", event: "delivered", subject: "Your first days", date: "d" },
    { email: "bas@modyn.com", event: "opened", subject: "Your first days", date: "d" },
    { email: "kris@x.com", event: "delivered", subject: "Your first days", date: "d" },
    { email: "kris@x.com", event: "loadedByProxy", subject: "Your first days", date: "d" },
    { email: "ann@x.com", event: "clicks", subject: "Pro offer", date: "d" },
  ]);

  it("records opens per address and subject, case-insensitively on the address", () => {
    expect(openStateFor(index, "bas@modyn.com", "Your first days")?.opened).toBe(true);
  });

  it("does not count Apple's privacy proxy loads as opens", () => {
    const kris = openStateFor(index, "kris@x.com", "Your first days");
    expect(kris?.delivered).toBe(true);
    expect(kris?.opened).toBe(false);
  });

  it("treats a click as an open", () => {
    expect(openStateFor(index, "ann@x.com", "Pro offer")).toEqual({ delivered: false, opened: true, clicked: true });
  });

  it("returns null when the provider logged nothing - unknown, not unopened", () => {
    expect(openStateFor(index, "bas@modyn.com", "Welcome to MyKavo")).toBeNull();
  });
});

describe("engagementTotals", () => {
  it("counts people reached, openers, clickers and who paid after opening", () => {
    const t = engagementTotals([
      person({ emails: [{ label: "W", subject: "s", sentAt: "t", failed: false, opened: true, clicked: true }], paid: true }),
      person({ emails: [{ label: "W", subject: "s", sentAt: "t", failed: false, opened: false, clicked: false }] }),
      person({ emails: [{ label: "W", subject: "s", sentAt: null, failed: true, opened: null, clicked: null }] }),
      person({ paid: true }),
    ]);
    expect(t).toEqual({
      people: 4,
      reached: 2,
      openedPeople: 1,
      clickedPeople: 1,
      paidPeople: 2,
      paidAfterOpening: 1,
      emailsSent: 2,
    });
  });
});

describe("sortByEngagement", () => {
  it("puts paying customers first, then clickers, then openers", () => {
    const opener = person({ userId: "o", emails: [{ label: "", subject: "", sentAt: "", failed: false, opened: true, clicked: false }] });
    const payer = person({ userId: "p", paid: true });
    const quiet = person({ userId: "q", signedUpAt: "2026-09-30T00:00:00Z" });
    expect(sortByEngagement([quiet, opener, payer]).map((p) => p.userId)).toEqual(["p", "o", "q"]);
  });
});
