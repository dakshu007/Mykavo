import { z } from "zod";

/** URL-safe slug: lowercase alphanumeric segments separated by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Empty/whitespace-only optional strings are stored as null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const blogPostInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(200)
    .regex(SLUG_PATTERN, "Slug may only contain lowercase letters, numbers, and hyphens."),
  excerpt: optionalText(500),
  content: z.string().max(200_000),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  authorName: z.string().trim().min(1).max(120).default("Fluxen Team"),
  seoTitle: optionalText(200),
  seoDescription: optionalText(320),
});

export type BlogPostInput = z.infer<typeof blogPostInputSchema>;
