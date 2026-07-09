import { z } from "zod";

/**
 * Shared validation + limits for conversion element monitoring (Phase 9,
 * spec §23). Used by the CRUD routes and the client form.
 */

/** Cap elements per page to bound per-scan work (spec §43). */
export const MAX_ELEMENTS_PER_PAGE = 20;

export const IMPORTANCE_VALUES = ["NORMAL", "IMPORTANT", "CRITICAL"] as const;

const importance = z.enum(IMPORTANCE_VALUES);

/**
 * A CSS selector handed to document.querySelector at scan time. We can't fully
 * validate it without a DOM, so reject only gross mistakes (empty, a pasted CSS
 * rule block, control characters). An unmatchable selector just reports the
 * element as "not found" on the next scan.
 */
const selector = z
  .string()
  .trim()
  .min(1)
  .max(1000)
  .refine((s) => !/[{}\n\r]/.test(s), "Enter a single CSS selector, not a CSS rule.");

export const createElementSchema = z.object({
  name: z.string().trim().min(1).max(120),
  selector,
  importance: importance.default("IMPORTANT"),
  expectedExistence: z.boolean().default(true),
  expectedVisibility: z.boolean().default(true),
  expectedText: z.string().trim().max(1000).optional(),
  expectedHref: z.string().trim().max(2048).optional(),
});

export const updateElementSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  selector: selector.optional(),
  importance: importance.optional(),
  expectedExistence: z.boolean().optional(),
  expectedVisibility: z.boolean().optional(),
  expectedText: z.string().trim().max(1000).nullable().optional(),
  expectedHref: z.string().trim().max(2048).nullable().optional(),
  enabled: z.boolean().optional(),
});

export type CreateElementInput = z.infer<typeof createElementSchema>;
export type UpdateElementInput = z.infer<typeof updateElementSchema>;

/** Empty string → null (an unset pin); undefined stays undefined (unchanged). */
export function normalizePin(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value ? value : null;
}
