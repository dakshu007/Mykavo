import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton — survives Next.js dev-server hot reloads
 * without exhausting database connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
export {
  setSnapshotAsBaseline,
  createInitialBaselinesForScan,
} from "./baseline";
export {
  applyChangeAction,
  changeActionData,
  updateBaselineFromSnapshot,
  OPEN_STATUSES,
  type ChangeAction,
} from "./changes";
export {
  findExpiredSnapshots,
  deleteSnapshots,
  deleteExpiredChangeEvents,
  type ExpiredSnapshot,
} from "./retention";
export {
  recordHealthCheck,
  getLatestHealthCheck,
  getLatestHealthChecksForWorkspace,
  findOpenHealthIncident,
  openHealthIncident,
  resolveHealthIncident,
  markHealthIncidentNotified,
  getUptimeStats,
  getDailyHealthRollups,
  getResponseTimeSeries,
  getRecentHealthIncidents,
  deleteExpiredHealthChecks,
  type HealthCheckInput,
  type LatestHealthCheckSummary,
  type UptimeStats,
  type DailyHealthRollup,
  type ResponseTimeBucket,
} from "./health";
export {
  getWorkspaceEntitlement,
  upgradeWorkspaceToPro,
  downgradeWorkspaceToFree,
  findWorkspaceByDodoSubscription,
  applyWebsiteAddon,
  revokeWebsiteAddon,
  findWorkspaceByAddonSubscription,
  listActiveWebsiteAddons,
  getWorkspaceAddonWebsites,
  createCheckoutIntent,
  consumeCheckoutIntent,
  type Entitlement,
  type UpgradeInput,
  type WebsiteAddonInput,
  type ActiveWebsiteAddon,
  type ConsumedIntent,
} from "./subscription";
