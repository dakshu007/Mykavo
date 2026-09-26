import { Prisma, prisma } from "@mykavo/database";
import { slugify } from "./slugify";
import { authorView, staticAuthorView, type AuthorView } from "./blog-authors";
import { logger } from "./logger";

/**
 * Author lookups for the public blog. Every query is guarded: if the
 * blog_author table does not exist yet (its migration is applied by hand)
 * or the lookup fails, the blog falls back to the static profile rather
 * than failing the page.
 */

/** The profile for a post's author field (case-insensitive name match). */
export async function resolveAuthor(authorName: string): Promise<AuthorView | null> {
  try {
    const row = await prisma.blogAuthor.findFirst({
      where: { name: { equals: authorName.trim(), mode: "insensitive" } },
    });
    if (row) return authorView(row);
  } catch (err) {
    logger.warn("blog author lookup failed - using the static profile", {
      authorName,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return staticAuthorView(authorName);
}

/**
 * For listing many posts at once: the name to show for a post's author
 * field. A database author is shown as written; otherwise the static
 * profile's name, or the field itself.
 */
export async function authorNameResolver(): Promise<(authorName: string) => string> {
  let known = new Set<string>();
  try {
    const rows = await prisma.blogAuthor.findMany({ select: { name: true } });
    known = new Set(rows.map((r) => r.name.toLowerCase()));
  } catch {
    // No table yet: static profiles only.
  }
  return (authorName) =>
    known.has(authorName.trim().toLowerCase()) ? authorName : (staticAuthorView(authorName)?.name ?? authorName);
}

/** Author names for the post editor's picker. */
export async function authorNames(): Promise<string[]> {
  try {
    const rows = await prisma.blogAuthor.findMany({ select: { name: true }, orderBy: { name: "asc" } });
    return rows.map((r) => r.name);
  } catch {
    return [];
  }
}

/** A slug no other author has: "dakshesh-b", then "dakshesh-b-2"... */
export async function uniqueAuthorSlug(name: string, exceptId?: string): Promise<string> {
  const base = slugify(name) || "author";
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const taken = await prisma.blogAuthor.findFirst({
      where: { slug: candidate, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export function isNameConflict(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
