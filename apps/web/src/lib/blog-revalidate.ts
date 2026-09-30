import { revalidatePath } from "next/cache";

/**
 * Refresh every cached blog page after a dashboard edit.
 *
 * The public blog is served from the CDN (ISR) rather than rendered on every
 * visit. Any post or author change can alter the index, a post, its "keep
 * reading" neighbours and an author page, so all of them are marked stale
 * together; each regenerates on its next visit. Cheap - nothing is rendered
 * until someone asks for it.
 */
export function revalidateBlog(): void {
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  revalidatePath("/blog/author/[slug]", "page");
}
