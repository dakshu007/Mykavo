/**
 * Plugin Health (Starter, Pro, Agency): the plugin uploads the site's
 * installed plugins once a day; MyKavo checks each against WordPress.org on
 * a weekly sweep (apps/worker/src/wp-plugin-health.ts) and answers with the
 * ones that are closed or have had no release in over two years. Pure;
 * unit-tested.
 */

import { z } from "zod";
import { WP_PLUGIN_SLUG_RE, isFlaggedWpPluginStatus } from "@mykavo/shared";

export const MAX_PLUGINS = 300;

export const pluginInventorySchema = z.object({
  plugins: z
    .array(
      z.object({
        slug: z.string().trim().toLowerCase().regex(WP_PLUGIN_SLUG_RE),
        name: z.string().trim().min(1).max(200),
        version: z.string().trim().max(60),
        active: z.boolean(),
      }),
    )
    .max(MAX_PLUGINS),
});

export type InventoryPlugin = z.infer<typeof pluginInventorySchema>["plugins"][number];

/** One entry per slug; the last one wins, like a re-scan of the folder would. */
export function dedupePlugins(plugins: InventoryPlugin[]): InventoryPlugin[] {
  const bySlug = new Map<string, InventoryPlugin>();
  for (const p of plugins) bySlug.set(p.slug, p);
  return [...bySlug.values()];
}

export interface InventoryRow {
  slug: string;
  name: string;
  version: string;
  active: boolean;
}

export interface InventoryDiff {
  create: InventoryPlugin[];
  update: InventoryPlugin[];
  remove: string[];
}

/** What to write: new plugins, changed ones, and slugs no longer installed. */
export function diffInventory(existing: InventoryRow[], uploaded: InventoryPlugin[]): InventoryDiff {
  const known = new Map(existing.map((r) => [r.slug, r]));
  const present = new Set(uploaded.map((p) => p.slug));
  const create: InventoryPlugin[] = [];
  const update: InventoryPlugin[] = [];
  for (const p of uploaded) {
    const row = known.get(p.slug);
    if (!row) create.push(p);
    else if (row.name !== p.name || row.version !== p.version || row.active !== p.active) update.push(p);
  }
  return { create, update, remove: existing.map((r) => r.slug).filter((s) => !present.has(s)) };
}

export interface FlaggedPlugin {
  slug: string;
  name: string;
  status: "closed" | "outdated";
  lastUpdated: string | null;
  reason: string;
}

/** The flagged plugins the plugin shows, closed first, then by name. */
export function flaggedPlugins(
  rows: Array<{ slug: string; name: string; wporgStatus: string; lastUpdated: Date | null; reason: string | null }>,
): FlaggedPlugin[] {
  const out: FlaggedPlugin[] = [];
  for (const r of rows) {
    if (!isFlaggedWpPluginStatus(r.wporgStatus)) continue;
    out.push({
      slug: r.slug,
      name: r.name,
      status: r.wporgStatus,
      lastUpdated: r.lastUpdated ? r.lastUpdated.toISOString().slice(0, 10) : null,
      reason:
        r.reason ??
        (r.wporgStatus === "closed" ? "Closed on WordPress.org." : "Not updated on WordPress.org in over 2 years."),
    });
  }
  return out.sort(
    (a, b) => Number(a.status !== "closed") - Number(b.status !== "closed") || a.name.localeCompare(b.name),
  );
}
