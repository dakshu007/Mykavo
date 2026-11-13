/**
 * The AI kill switch against a real database (needs DATABASE_URL, like the
 * other database suites).
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  AGENT_ROLLOUT_KEY,
  AI_PAUSED_KEY,
  getAgentRollout,
  getAiPauseState,
  isAiPaused,
  rolloutAllows,
  setAgentRollout,
  setAiPaused,
} from "./ai-control";

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.appSetting.deleteMany({ where: { key: { in: [AI_PAUSED_KEY, AGENT_ROLLOUT_KEY] } } });
});

afterAll(async () => {
  await prisma.appSetting.deleteMany({ where: { key: { in: [AI_PAUSED_KEY, AGENT_ROLLOUT_KEY] } } });
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

describe("AI Keyword Agent rollout", () => {
  it("starts as admins only and saves a cleaned beta list", async () => {
    expect((await getAgentRollout(prisma)).mode).toBe("admins");
    await setAgentRollout(prisma, { mode: "beta", betaEmails: [" Bas@Example.com ", "bas@example.com", "nonsense"] }, "owner@mykavo.app");
    expect(await getAgentRollout(prisma)).toMatchObject({ mode: "beta", betaEmails: ["bas@example.com"], updatedBy: "owner@mykavo.app" });
  });

  it("allows beta users only with a verified email, and everyone when launched", () => {
    const beta = { mode: "beta" as const, betaEmails: ["bas@example.com"] };
    expect(rolloutAllows(beta, "BAS@example.com", true)).toBe(true);
    expect(rolloutAllows(beta, "bas@example.com", false)).toBe(false);
    expect(rolloutAllows(beta, "other@example.com", true)).toBe(false);
    expect(rolloutAllows({ mode: "admins", betaEmails: ["bas@example.com"] }, "bas@example.com", true)).toBe(false);
    expect(rolloutAllows({ mode: "everyone", betaEmails: [] }, null, false)).toBe(true);
  });

  it("fails closed to admins only", async () => {
    const broken = { appSetting: { findUnique: async () => { throw new Error("down"); } } } as unknown as Pick<PrismaClient, "appSetting">;
    expect((await getAgentRollout(broken)).mode).toBe("admins");
  });
});
