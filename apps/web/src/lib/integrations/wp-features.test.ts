import { describe, expect, it } from "vitest";
import { getPlan } from "@/config/plans";
import { isRollbackReport, rollbackAdvice, siteFeatures } from "./wp-features";

describe("siteFeatures", () => {
  it("follows the plan flags", () => {
    expect(siteFeatures(getPlan("free").limits)).toEqual({
      autoRollback: false,
      aiInsights: false,
      pluginHealth: false,
      checkoutGuard: false,
      updateWindows: false,
      clientReports: false,
      aiAssistants: false,
    });
    expect(siteFeatures(getPlan("agency").limits)).toEqual({
      autoRollback: true,
      aiInsights: true,
      pluginHealth: true,
      checkoutGuard: true,
      updateWindows: true,
      clientReports: true,
      aiAssistants: true,
    });
    const starter = siteFeatures(getPlan("starter").limits);
    expect(starter.aiInsights).toBe(true);
    expect(starter.autoRollback).toBe(false);
  });
});

describe("rollbackAdvice", () => {
  const base = { planAllows: true, status: "COMPLETED" as const, criticalChanges: 1, followsRollback: false };

  it("recommends a rollback after a critical change on a plan that has it", () => {
    expect(rollbackAdvice(base)).toEqual({ recommended: true, reason: "Critical change found after this update" });
    expect(rollbackAdvice({ ...base, status: "PARTIAL" }).recommended).toBe(true);
  });

  it("never recommends one without a critical change", () => {
    expect(rollbackAdvice({ ...base, criticalChanges: 0 })).toEqual({
      recommended: false,
      reason: "No critical change found after this update",
    });
  });

  it("waits for the check to finish", () => {
    expect(rollbackAdvice({ ...base, status: "RUNNING" }).recommended).toBe(false);
    expect(rollbackAdvice({ ...base, status: "QUEUED" }).recommended).toBe(false);
    expect(rollbackAdvice({ ...base, status: "FAILED" }).recommended).toBe(false);
  });

  it("explains the plan when it does not include automatic rollback", () => {
    const advice = rollbackAdvice({ ...base, planAllows: false });
    expect(advice.recommended).toBe(false);
    expect(advice.reason).toContain("Pro and Agency");
  });

  it("never recommends rolling back a rollback", () => {
    expect(rollbackAdvice({ ...base, followsRollback: true }).recommended).toBe(false);
  });
});

describe("isRollbackReport", () => {
  it("is true only when every item is a rollback", () => {
    expect(isRollbackReport([{ action: "rollback" }])).toBe(true);
    expect(isRollbackReport([{ action: "rollback" }, { action: "update" }])).toBe(false);
    expect(isRollbackReport([])).toBe(false);
    expect(isRollbackReport(null)).toBe(false);
  });
});
