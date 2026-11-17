import { getAgentRollout, getAiPauseState, getVideoRollout, prisma, type AgentRolloutMode } from "@mykavo/database";
import { VIDEO_FEATURE } from "@mykavo/brand-video/pure";
import { agentBudgetMicroUsd as budgetFrom } from "@mykavo/keyword-agent/pure";
import { env } from "@/lib/env";
import { aiConfigured, agentBudgetMicroUsd, monthSpendMicroUsd, monthlyBudgetMicroUsd } from "./client";

/** What the admin AI controls card shows: the kill switch and both spend pools. */
export interface AiControlsData {
  configured: boolean;
  paused: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  pools: { id: "core" | "agent" | "video"; label: string; detail: string; spentUsd: number; capUsd: number }[];
  /** Who can use the AI Keyword Agent. */
  rollout: { mode: AgentRolloutMode; betaEmails: string[] };
  /** Who can use Brand Video. */
  videoRollout: { mode: AgentRolloutMode; betaEmails: string[] };
}

export async function loadAiControls(now: Date = new Date()): Promise<AiControlsData> {
  const [state, core, agent, rollout, videoRollout, video] = await Promise.all([
    getAiPauseState(prisma),
    monthSpendMicroUsd("core", now),
    monthSpendMicroUsd("agent", now),
    getAgentRollout(prisma),
    getVideoRollout(prisma),
    prisma.aiUsage.aggregate({
      where: { feature: VIDEO_FEATURE, createdAt: { gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) } },
      _sum: { costMicroUsd: true },
    }),
  ]);
  return {
    configured: aiConfigured(),
    paused: state.paused,
    updatedAt: state.updatedAt?.toISOString() ?? null,
    updatedBy: state.updatedBy,
    rollout: { mode: rollout.mode, betaEmails: rollout.betaEmails },
    videoRollout: { mode: videoRollout.mode, betaEmails: videoRollout.betaEmails },
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
      {
        id: "video",
        label: "Brand video scripts",
        detail: "AI_VIDEO_MONTHLY_BUDGET_USD",
        spentUsd: (video._sum.costMicroUsd ?? 0) / 1_000_000,
        capUsd: budgetFrom(env.AI_VIDEO_MONTHLY_BUDGET_USD) / 1_000_000,
      },
    ],
  };
}
