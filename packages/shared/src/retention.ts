/**
 * Plan-based history retention windows (days) — the single source of truth,
 * shared by the web plan config (apps/web/src/config/plans.ts) and the worker's
 * retention sweep. It lives in @fluxen/shared because the worker cannot import
 * web modules, yet both must agree on the window. Spec §37 (centralized limits),
 * §60 / §91 (retention & cost control).
 */
export const PLAN_HISTORY_DAYS = {
  free: 30,
  pro: 365,
} as const;

/** Retention window in days for a plan id (defaults to the free window). */
export function historyDaysForPlan(planId: string): number {
  return planId === "pro" ? PLAN_HISTORY_DAYS.pro : PLAN_HISTORY_DAYS.free;
}
