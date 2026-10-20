import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { prisma } from "@mykavo/database";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * The one door to the Claude API. Every AI feature goes through
 * `generateStructured`, which:
 *
 *   - refuses before calling when the month's global budget is spent
 *     (AI_MONTHLY_BUDGET_USD, default $10, summed from ai_insight.costMicroUsd),
 *   - asks Claude Haiku 5.5 with thinking off and low effort, for a JSON
 *     answer shaped by a zod schema,
 *   - prices the call from its token usage, so the caller can store the cost
 *     with the result and the next budget check sees it.
 *
 * Calls that cost money but give nothing usable (a refusal, an unparseable
 * answer) are recorded as kind "failed" so they still count against the
 * budget.
 *
 * Two requests racing past the budget check can overshoot it by a call each,
 * a fraction of a cent. That is accepted rather than locking.
 */

export const AI_MODEL = "claude-haiku-5-5";

/** USD per million tokens for Haiku 5.5 (prompts under 100K tokens). */
const INPUT_USD_PER_MTOK = 0.1;
const OUTPUT_USD_PER_MTOK = 0.5;

const DEFAULT_MONTHLY_BUDGET_USD = 10;

export type AiErrorCode = "not_configured" | "budget_exhausted" | "quota_exhausted" | "refused" | "failed";

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export function aiConfigured(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) throw new AiError("not_configured", "AI is not configured.");
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 30_000 });
  return client;
}

/** A call's price in millionths of a dollar, rounded up so the budget never undercounts. */
export function costMicroUsd(usage: { inputTokens: number; outputTokens: number }): number {
  // USD per MTok is exactly micro-USD per token.
  return Math.ceil(usage.inputTokens * INPUT_USD_PER_MTOK + usage.outputTokens * OUTPUT_USD_PER_MTOK);
}

export function monthlyBudgetMicroUsd(raw: string | undefined = env.AI_MONTHLY_BUDGET_USD): number {
  const usd = raw === undefined || raw.trim() === "" ? DEFAULT_MONTHLY_BUDGET_USD : Number(raw);
  if (!Number.isFinite(usd) || usd < 0) return DEFAULT_MONTHLY_BUDGET_USD * 1_000_000;
  return Math.floor(usd * 1_000_000);
}

export function startOfUtcMonth(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Everything spent on AI this calendar month (UTC), across all workspaces. */
export async function monthSpendMicroUsd(now: Date = new Date()): Promise<number> {
  const agg = await prisma.aiInsight.aggregate({
    where: { createdAt: { gte: startOfUtcMonth(now) } },
    _sum: { costMicroUsd: true },
  });
  return agg._sum.costMicroUsd ?? 0;
}

export async function assertBudgetLeft(now: Date = new Date()): Promise<void> {
  if ((await monthSpendMicroUsd(now)) >= monthlyBudgetMicroUsd()) {
    throw new AiError("budget_exhausted", "AI insights are paused until next month.");
  }
}

export interface StructuredResult<T> {
  data: T;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: number;
}

/**
 * One structured call. `data` is the untrusted, scanned-site material: it is
 * sent as a delimited JSON block and the system prompt says to treat it only
 * as data. The budget is checked first; the caller stores the result (and
 * with it the cost).
 */
export async function generateStructured<S extends z.ZodType>(params: {
  schema: S;
  system: string;
  instruction: string;
  data: unknown;
  maxTokens: number;
  workspaceId: string;
}): Promise<StructuredResult<z.infer<S>>> {
  const anthropic = getClient();
  await assertBudgetLeft();

  let response;
  try {
    response = await anthropic.messages.parse({
      model: AI_MODEL,
      max_tokens: params.maxTokens,
      thinking: { type: "disabled" },
      output_config: { effort: "low", format: zodOutputFormat(params.schema) },
      system: params.system,
      messages: [
        {
          role: "user",
          content: `${params.instruction}\n\n<site_data>\n${JSON.stringify(params.data, null, 2)}\n</site_data>`,
        },
      ],
    });
  } catch (err) {
    logger.error("ai call failed", {
      workspaceId: params.workspaceId,
      status: err instanceof Anthropic.APIError ? err.status : undefined,
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AiError("failed", "The AI service could not be reached. Try again in a minute.");
  }

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const cost = costMicroUsd({ inputTokens, outputTokens });

  if (response.stop_reason === "refusal" || response.parsed_output == null) {
    await recordFailedCall(params.workspaceId, response.model, inputTokens, outputTokens, cost);
    logger.warn("ai call gave no usable answer", {
      workspaceId: params.workspaceId,
      stopReason: response.stop_reason,
    });
    throw new AiError(
      response.stop_reason === "refusal" ? "refused" : "failed",
      "The AI could not explain this one. Try again later.",
    );
  }

  return {
    data: response.parsed_output as z.infer<S>,
    model: response.model,
    inputTokens,
    outputTokens,
    costMicroUsd: cost,
  };
}

/** Keeps the cost of a wasted call on the books so the budget stays honest. */
export async function recordFailedCall(
  workspaceId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cost: number,
): Promise<void> {
  try {
    await prisma.aiInsight.create({
      data: { workspaceId, kind: "failed", content: {}, model, inputTokens, outputTokens, costMicroUsd: cost },
    });
  } catch (err) {
    logger.error("ai failed-call record not saved", {
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Prisma's unique-constraint error: another request stored the same insight first. */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}
