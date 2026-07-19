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

/**
 * Optional publish date from the editor - a "YYYY-MM-DD" date or full ISO
 * string. Empty means "automatic" (stamped on first publish); parsed dates
 * come back as Date. Date-only strings parse as midnight UTC, which renders
 * as the picked calendar day everywhere the site formats dates (UTC server).
 */
const publishedAtInput = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || !Number.isNaN(Date.parse(value)), {
    message: "Invalid published date.",
  })
  .transform((value) => (value === null ? null : new Date(value)));

/** Tags: trimmed, capped, deduped case-insensitively (first casing wins). */
const tagsInput = z
  .array(z.string().trim().min(1, "Tags cannot be empty.").max(40))
  .max(12, "At most 12 tags.")
  .default([])
  .transform((tags) => {
    const seen = new Set<string>();
    return tags.filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

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
  authorName: z.string().trim().min(1).max(120).default("MyKavo Team"),
  seoTitle: optionalText(200),
  seoDescription: optionalText(320),
  primaryKeyword: optionalText(120),
  secondaryKeyword: optionalText(120),
  tags: tagsInput,
  publishedAt: publishedAtInput,
});

export type BlogPostInput = z.infer<typeof blogPostInputSchema>;
