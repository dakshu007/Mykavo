import {
  OPEN_STATUSES,
  type ChangeCategory,
  type ChangeSeverity,
  type Prisma,
} from "@fluxen/database";

/**
 * Shared filter parsing for the changes list page and the CSV export route,
 * so both interpret ?severity/&category/&status/&website identically.
 * Unknown values are treated as "no filter" (never an error) — filter links
 * are user-editable URLs.
 */

export const CHANGE_SEVERITIES: ChangeSeverity[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
];

export const CHANGE_CATEGORIES: ChangeCategory[] = [
  "AVAILABILITY",
  "VISUAL",
  "SEO",
  "CONTENT",
  "LINKS",
  "SCRIPT",
  "PERFORMANCE",
  "CONVERSION",
];

export type ChangeFilterParams = {
  severity?: string;
  status?: string;
  category?: string;
  website?: string;
};

export interface ParsedChangeFilters {
  severity?: ChangeSeverity;
  category?: ChangeCategory;
  websiteId?: string;
  /** `?status=all` widens the list from open (NEW/REVIEWED) to everything. */
  showResolved: boolean;
}

export function parseChangeFilters(params: ChangeFilterParams): ParsedChangeFilters {
  return {
    severity: CHANGE_SEVERITIES.includes(params.severity as ChangeSeverity)
      ? (params.severity as ChangeSeverity)
      : undefined,
    category: CHANGE_CATEGORIES.includes(params.category as ChangeCategory)
      ? (params.category as ChangeCategory)
      : undefined,
    websiteId: params.website || undefined,
    showResolved: params.status === "all",
  };
}

/** Workspace-scoped Prisma `where` for the parsed filters. */
export function changeEventWhere(
  workspaceId: string,
  filters: ParsedChangeFilters,
): Prisma.ChangeEventWhereInput {
  return {
    website: { workspaceId },
    websiteId: filters.websiteId,
    severity: filters.severity,
    category: filters.category,
    status: filters.showResolved ? undefined : { in: OPEN_STATUSES },
  };
}
