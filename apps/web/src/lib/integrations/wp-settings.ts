/**
 * Settings MyKavo keeps for a connected WordPress site (site_connection.
 * settings, JSON). Today: the automatic update window (Agency), the hours
 * WordPress may run automatic updates in. MyKavo stores and serves it; the
 * plugin applies it. Pure; unit-tested.
 */

import { z } from "zod";

/** A real IANA zone the runtime knows (also accepts "UTC"). */
export function isValidTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * The window opens at startHour on each of `days` and closes at endHour,
 * in `timezone`. An endHour at or before startHour runs past midnight into
 * the next day (22 to 4). The two may not be equal. An empty `days` list
 * holds nothing back (the plugin then lets updates run at any time).
 */
export const updateWindowSchema = z
  .object({
    enabled: z.boolean(),
    /** 0 = Sunday ... 6 = Saturday. */
    days: z.array(z.number().int().min(0).max(6)).max(7),
    /** First hour of the window, 0-23. */
    startHour: z.number().int().min(0).max(23),
    /** Hour the window closes, 1-24 (24 = midnight at the end of the day). */
    endHour: z.number().int().min(1).max(24),
    timezone: z.string().trim().min(1).max(64).refine(isValidTimeZone, "Unknown time zone."),
  })
  .superRefine((w, ctx) => {
    if (w.endHour === w.startHour) {
      ctx.addIssue({ code: "custom", path: ["endHour"], message: "The window must end at a different hour than it starts." });
    }
  })
  .transform((w) => ({ ...w, days: [...new Set(w.days)].sort((a, b) => a - b) }));

export type UpdateWindow = z.infer<typeof updateWindowSchema>;

export const putSettingsSchema = z.object({
  updateWindow: updateWindowSchema.nullable(),
});

export interface SiteSettings {
  updateWindow: UpdateWindow | null;
}

/** Read the stored JSON defensively: anything unreadable counts as unset. */
export function parseSiteSettings(value: unknown): SiteSettings {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const parsed = updateWindowSchema.safeParse(record.updateWindow);
  return { updateWindow: parsed.success ? parsed.data : null };
}

/** The stored JSON with the window replaced, keeping any other keys. */
export function withUpdateWindow(value: unknown, updateWindow: UpdateWindow | null): Record<string, unknown> {
  const record = value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
  if (updateWindow) record.updateWindow = updateWindow;
  else delete record.updateWindow;
  return record;
}
