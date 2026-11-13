import { getAiPauseState, prisma } from "@mykavo/database";
import { aiConfigured, agentBudgetMicroUsd, monthSpendMicroUsd, monthlyBudgetMicroUsd } from "./client";

/** What the admin AI controls card shows: the kill switch and both spend pools. */
export interface AiControlsData {
  configured: boolean;
  paused: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  pools: { id: "core" | "agent"; label: string; detail: string; spentUsd: number; capUsd: number }[];
}

export async function loadAiControls(now: Date = new Date()): Promise<AiControlsData> {
  const [state, core, agent] = await Promise.all([
    getAiPauseState(prisma),
    monthSpendMicroUsd("core", now),
    monthSpendMicroUsd("agent", now),
  ]);
  return {
    configured: aiConfigured(),
    paused: state.paused,
    updatedAt: state.updatedAt?.toISOString() ?? null,
    updatedBy: state.updatedBy,
    pools: [
      {
        id: "core",
        label: "Explanations and weekly notes",
        detail: "AI_MONTHLY_BUDGET_USD",
        spentUsd: core / 1_000_000,
        capUsd: monthlyBudgetMicroUsd() / 1_000_000,
      },
      {
        id: "agent",
        label: "Newer AI features",
        detail: "AI_AGENT_MONTHLY_BUDGET_USD",
        spentUsd: agent / 1_000_000,
        capUsd: agentBudgetMicroUsd() / 1_000_000,
      },
    ],
  };
}
