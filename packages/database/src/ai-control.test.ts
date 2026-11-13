/**
 * The AI kill switch against a real database (needs DATABASE_URL, like the
 * other database suites).
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { AI_PAUSED_KEY, getAiPauseState, isAiPaused, setAiPaused } from "./ai-control";

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.appSetting.deleteMany({ where: { key: AI_PAUSED_KEY } });
});

afterAll(async () => {
  await prisma.appSetting.deleteMany({ where: { key: AI_PAUSED_KEY } });
  await prisma.$disconnect();
});

describe("AI kill switch", () => {
  it("is off until someone turns it on", async () => {
    expect(await isAiPaused(prisma)).toBe(false);
  });

  it("pauses and resumes, remembering who did it", async () => {
    await setAiPaused(prisma, true, "owner@mykavo.app");
    expect(await getAiPauseState(prisma)).toMatchObject({ paused: true, updatedBy: "owner@mykavo.app" });
    await setAiPaused(prisma, false, "ops@mykavo.app");
    expect(await getAiPauseState(prisma)).toMatchObject({ paused: false, updatedBy: "ops@mykavo.app" });
  });

  it("fails closed when the switch cannot be read", async () => {
    const broken = {
      appSetting: {
        findUnique: async () => {
          throw new Error("connection refused");
        },
      },
    } as unknown as Pick<PrismaClient, "appSetting">;
    expect(await isAiPaused(broken)).toBe(true);
  });
});
