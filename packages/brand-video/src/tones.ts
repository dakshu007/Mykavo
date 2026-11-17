import { z } from "zod";

export const VIDEO_TONES = ["professional", "friendly", "bold", "premium"] as const;
export type VideoTone = (typeof VIDEO_TONES)[number];

/** What the owner asks for when the AI writes a video's scenes. */
export const videoScriptInput = z.object({
  durationSec: z.union([z.literal(30), z.literal(60)]),
  tone: z.enum(VIDEO_TONES).default("professional"),
  /** What the owner wants the video to focus on (optional). */
  notes: z.string().trim().max(400).default(""),
});
export type VideoScriptInput = z.infer<typeof videoScriptInput>;
