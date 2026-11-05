/**
 * WordPress plugin 1.3.0 paid features, decided by MyKavo: which features the
 * connected site's plan includes (GET /api/wp/v1/status `features`) and
 * whether the plugin should put a plugin back after the check that followed
 * its update (GET /api/wp/v1/scans `rollback`). The plugin only shows these
 * and carries them out. Pure; unit-tested.
 */

import type { Plan } from "@/config/plans";

export interface SiteFeatures {
  autoRollback: boolean;
  aiInsights: boolean;
  pluginHealth: boolean;
  checkoutGuard: boolean;
  updateWindows: boolean;
  /** Plugin 1.3.0 Reports tab (white-label client reports). */
  clientReports: boolean;
  /** Plugin 1.3.0 MCP card (ChatGPT, Claude). */
  aiAssistants: boolean;
}

export function siteFeatures(limits: Plan["limits"]): SiteFeatures {
  return {
    autoRollback: limits.wpAutoRollback,
    aiInsights: limits.wpAiInsights,
    pluginHealth: limits.wpPluginHealth,
    checkoutGuard: limits.conversionElementMonitoring,
    updateWindows: limits.wpUpdateWindows,
    clientReports: limits.whiteLabelReports,
    aiAssistants: limits.aiAssistants,
  };
}

export interface RollbackAdvice {
  recommended: boolean;
  reason: string;
}

export interface RollbackInput {
  /** The plan includes automatic rollback (wpAutoRollback). */
  planAllows: boolean;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED";
  /** CRITICAL change events the scan created. */
  criticalChanges: number;
  /**
   * Every update report linked to the scan was a rollback. A check after a
   * rollback never recommends another one: that could undo the fix, or loop.
   */
  followsRollback: boolean;
}

/** Whether the plugin should roll back the update a deploy check followed. */
export function rollbackAdvice(input: RollbackInput): RollbackAdvice {
  if (input.followsRollback) {
    return { recommended: false, reason: "This check ran after a rollback" };
  }
  if (input.status === "QUEUED" || input.status === "RUNNING") {
    return { recommended: false, reason: "The check after this update is still running" };
  }
  if (input.status === "FAILED") {
    return { recommended: false, reason: "The check after this update did not finish" };
  }
  if (input.criticalChanges === 0) {
    return { recommended: false, reason: "No critical change found after this update" };
  }
  if (!input.planAllows) {
    return {
      recommended: false,
      reason: "Critical change found after this update. Automatic rollback is included in Pro and Agency.",
    };
  }
  return { recommended: true, reason: "Critical change found after this update" };
}

/** True when the update report's items are all rollbacks. */
export function isRollbackReport(items: unknown): boolean {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.every(
    (item) =>
      item !== null && typeof item === "object" && (item as { action?: unknown }).action === "rollback",
  );
}
