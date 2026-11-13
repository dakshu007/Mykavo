import { describe, expect, it } from "vitest";
import { isInFlight, liveDone, liveSignature, parseLiveQuery } from "./live-status";

describe("live status", () => {
  it("treats QUEUED and RUNNING as in flight, everything else as finished", () => {
    expect(isInFlight("QUEUED")).toBe(true);
    expect(isInFlight("RUNNING")).toBe(true);
    for (const s of ["COMPLETED", "PARTIAL", "FAILED"]) expect(isInFlight(s)).toBe(false);
    expect(liveDone([{ status: "COMPLETED", progress: 5 }, { status: "FAILED", progress: 0 }])).toBe(true);
    expect(liveDone([{ status: "COMPLETED", progress: 5 }, { status: "RUNNING", progress: 1 }])).toBe(false);
  });

  it("status pages ignore progress; progress pages move as pages finish", () => {
    const a = [{ status: "RUNNING", progress: 2 }];
    const b = [{ status: "RUNNING", progress: 3 }];
    expect(liveSignature(a, "status")).toBe(liveSignature(b, "status"));
    expect(liveSignature(a, "progress")).not.toBe(liveSignature(b, "progress"));
    expect(liveSignature(a, "status")).not.toBe(liveSignature([{ status: "COMPLETED", progress: 2 }], "status"));
  });

  it("buckets audit progress so a fast crawl does not re-render every poll", () => {
    const at = (n: number) => liveSignature([{ status: "RUNNING", progress: n }], "progress", 25);
    expect(at(3)).toBe(at(24));
    expect(at(24)).not.toBe(at(25));
  });

  it("parses scan and audit queries and rejects anything else", () => {
    expect(parseLiveQuery(new URLSearchParams("scan=abc_1"))).toEqual({ kind: "scan", ids: ["abc_1"] });
    expect(parseLiveQuery(new URLSearchParams("audits=a,b,a"))).toEqual({ kind: "audits", ids: ["a", "b"] });
    expect(parseLiveQuery(new URLSearchParams(""))).toBeNull();
    expect(parseLiveQuery(new URLSearchParams("scan=../etc"))).toBeNull();
    expect(parseLiveQuery(new URLSearchParams("audits=ok,'drop"))).toBeNull();
    const many = Array.from({ length: 30 }, (_, i) => `a${i}`).join(",");
    expect(parseLiveQuery(new URLSearchParams(`audits=${many}`))?.ids).toHaveLength(20);
  });
});
