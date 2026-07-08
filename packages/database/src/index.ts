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
  updateBaselineFromSnapshot,
  OPEN_STATUSES,
  type ChangeAction,
} from "./changes";
