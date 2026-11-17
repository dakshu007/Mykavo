import { getAgentRollout, getAiPauseState, prisma, type AgentRolloutMode } from "@mykavo/database";
import { aiConfigured, agentBudgetMicroUsd, monthSpendMicroUsd, monthlyBudgetMicroUsd } from "./client";

/** What the admin AI controls card shows: the kill switch and both spend pools. */
export interface AiControlsData {
  configured: boolean;
  paused: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  pools: { id: "core" | "agent"; label: string; detail: string; spentUsd: number; capUsd: number }[];
  /** Who can use the AI Keyword Agent. */
  rollout: { mode: AgentRolloutMode; betaEmails: string[] };
}

export async function loadAiControls(now: Date = new Date()): Promise<AiControlsData> {
  const [state, core, agent, rollout] = await Promise.all([
    getAiPauseState(prisma),
    monthSpendMicroUsd("core", now),
    monthSpendMicroUsd("agent", now),
    getAgentRollout(prisma),
  ]);
  return {
    configured: aiConfigured(),
    paused: state.paused,
    updatedAt: state.updatedAt?.toISOString() ?? null,
    updatedBy: state.updatedBy,
    rollout: { mode: rollout.mode, betaEmails: rollout.betaEmails },
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
        label: "AI Keyword Agent",
        detail: "AI_AGENT_MONTHLY_BUDGET_USD",
        spentUsd: agent / 1_000_000,
        capUsd: agentBudgetMicroUsd() / 1_000_000,
      },
    ],
  };
}
