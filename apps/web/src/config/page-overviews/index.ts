import { PAGE_OVERVIEWS } from "./pages";
import { TOOL_OVERVIEWS } from "./tools";
import type { PageOverview } from "./types";

export type { PageOverview };

/** The overview for a path like "/tools/meta-tag-checker", or null. */
export function pageOverview(path: string): PageOverview | null {
  return TOOL_OVERVIEWS[path] ?? PAGE_OVERVIEWS[path] ?? null;
}

/** Every path that has an overview (tests and sitemap checks). */
export function overviewPaths(): string[] {
  return [...Object.keys(TOOL_OVERVIEWS), ...Object.keys(PAGE_OVERVIEWS)];
}
