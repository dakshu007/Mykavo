/**
 * Model ids and prices for the keyword agent, in one place so a price or
 * name change is one edit (spec round 3). USD per million tokens equals
 * micro-USD per token, which keeps the arithmetic exact.
 */

export const MODELS = {
  /** Cheap steps: reading the site, seeds, tidying. */
  fast: "claude-haiku-5-5",
  /** Research analysis and writing, on every plan. */
  writer: "claude-sonnet-5-5",
} as const;

export type AgentModel = (typeof MODELS)[keyof typeof MODELS];

interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
}

const PRICES: Record<string, ModelPrice> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.4 },
};

/** $10 per 1,000 web searches, billed on top of tokens. */
export const WEB_SEARCH_MICRO_USD = 10_000;

export interface CallUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  webSearches?: number;
}

/**
 * What one call cost, in micro-USD, rounded up so budgets never undercount.
 * An unknown model is priced as the most expensive one rather than as free.
 */
export function callCostMicroUsd(model: string, usage: CallUsage): number {
  const price = PRICES[model] ?? PRICES["claude-opus-5-5"]!;
  const tokens =
    usage.inputTokens * price.input +
    usage.outputTokens * price.output +
    (usage.cacheCreationTokens ?? 0) * price.input * 1.25 +
    (usage.cacheReadTokens ?? 0) * price.cacheRead;
  return Math.ceil(tokens) + (usage.webSearches ?? 0) * WEB_SEARCH_MICRO_USD;
}

/** Features whose spend counts against the agent's own monthly cap. */
export const AGENT_FEATURE = "keyword_agent";

/** AI_AGENT_MONTHLY_BUDGET_USD, default $0: the agent cannot spend until set. */
export function agentBudgetMicroUsd(raw: string | undefined): number {
  const usd = raw === undefined || raw.trim() === "" ? 0 : Number(raw);
  if (!Number.isFinite(usd) || usd < 0) return 0;
  return Math.floor(usd * 1_000_000);
}
