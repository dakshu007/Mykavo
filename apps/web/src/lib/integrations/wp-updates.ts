/**
 * WordPress update events from the MyKavo plugin ("Safe Updates"). When a
 * plugin, theme or WordPress itself updates - by hand or automatically - or a
 * plugin is activated or deactivated, or the theme is switched, the plugin
 * reports what changed, and MyKavo runs a deploy check against the approved
 * baseline so the owner learns whether it broke anything.
 * Pure helpers; unit-tested.
 */

import { z } from "zod";

export const updateItemSchema = z.object({
  type: z.enum(["plugin", "theme", "core", "translation"]),
  name: z.string().trim().min(1).max(100),
  from: z.string().trim().max(40).nullable().optional(),
  to: z.string().trim().max(40).nullable().optional(),
  // Optional: pre-release builds of the plugin only reported updates.
  action: z.enum(["update", "activate", "deactivate", "switch"]).optional(),
});

export const updateEventSchema = z.object({
  trigger: z.enum(["manual", "auto"]),
  items: z.array(updateItemSchema).min(1).max(50),
});

export type UpdateItem = z.infer<typeof updateItemSchema>;

/** The scan note column is shown in emails and history - keep it short. */
export const NOTE_MAX = 140;

function describeAction(item: UpdateItem): string | null {
  switch (item.action) {
    case "activate":
      return `Activated ${item.name}`;
    case "deactivate":
      return `Deactivated ${item.name}`;
    case "switch":
      return `Switched theme to ${item.name}`;
    default:
      return null;
  }
}

function describe(item: UpdateItem): string {
  const name = item.type === "core" ? "WordPress" : item.name;
  if (item.type === "translation") return `${name} translations`;
  if (item.from && item.to && item.from !== item.to) return `${name} ${item.from} → ${item.to}`;
  if (item.to) return `${name} ${item.to}`;
  return name;
}

/**
 * "Updated WooCommerce 8.1.0 → 8.2.0 and 2 more" - what the verdict email and
 * scan history say, so the owner knows which update a result belongs to.
 */
export function buildUpdateNote(items: UpdateItem[], trigger: "manual" | "auto"): string {
  // Code updates first: a translation refresh is never the headline.
  const ordered = [...items].sort(
    (a, b) => Number(a.type === "translation") - Number(b.type === "translation"),
  );
  const lead = trigger === "auto" ? "Auto-updated" : "Updated";
  const head = describeAction(ordered[0]!) ?? `${lead} ${describe(ordered[0]!)}`;
  const rest = ordered.length - 1;
  let note = rest > 0 ? `${head} and ${rest} more` : head;
  if (note.length > NOTE_MAX) note = `${note.slice(0, NOTE_MAX - 3)}...`;
  return note;
}
