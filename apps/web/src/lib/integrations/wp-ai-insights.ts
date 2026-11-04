/**
 * AI Insights for the WordPress plugin: the history query. Pure; unit-tested.
 */

import { z } from "zod";

export const AI_HISTORY_MAX_DAYS = 365;
export const AI_HISTORY_DEFAULT_DAYS = 90;

export const aiBotsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(AI_HISTORY_MAX_DAYS).default(AI_HISTORY_DEFAULT_DAYS),
});

/** The first UTC day of an N-day history ending today (today counts as one). */
export function historySince(days: number, now: Date = new Date()): Date {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(today - (days - 1) * 86_400_000);
}
