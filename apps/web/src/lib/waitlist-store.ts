/**
 * Waitlist persistence. Phase 1: Prisma-backed (WaitlistEntry table),
 * replacing the Phase 0 file store behind the same interface.
 */

import { prisma, Prisma } from "@mykavo/database";

export interface WaitlistEntry {
  email: string;
  source: string;
  createdAt: string;
}

export interface WaitlistStore {
  add(entry: WaitlistEntry): Promise<{ created: boolean }>;
}

class PrismaWaitlistStore implements WaitlistStore {
  async add(entry: WaitlistEntry): Promise<{ created: boolean }> {
    try {
      await prisma.waitlistEntry.create({
        data: { email: entry.email, source: entry.source },
      });
      return { created: true };
    } catch (err) {
      // Unique violation on email → already on the list; not an error.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return { created: false };
      }
      throw err;
    }
  }
}

let store: WaitlistStore | null = null;

export function getWaitlistStore(): WaitlistStore {
  if (!store) store = new PrismaWaitlistStore();
  return store;
}
