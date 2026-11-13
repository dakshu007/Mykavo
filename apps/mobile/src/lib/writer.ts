/**
 * Small, pure helpers for the AI Writer screens, kept out of the components
 * so they are unit-tested.
 */

import type { WpDraftView, WriterAllowance } from "./types";

/** "12 posts left", "Unlimited posts", "No posts left". */
export function postsLeftLabel(a: Pick<WriterAllowance, "postsLeft">): string {
  if (a.postsLeft === null) return "Unlimited posts";
  if (a.postsLeft === 0) return "No posts left";
  return `${a.postsLeft} ${a.postsLeft === 1 ? "post" : "posts"} left`;
}

export function canWrite(a: Pick<WriterAllowance, "postsLeft" | "blocked">): boolean {
  return !a.blocked && (a.postsLeft === null || a.postsLeft > 0);
}

export function canAnalyse(a: Pick<WriterAllowance, "reportsLeft" | "blocked">): boolean {
  return !a.blocked && (a.reportsLeft === null || a.reportsLeft > 0);
}

export type DraftState = "none" | "sending" | "waiting" | "saved" | "outdated" | "failed";

/** What the WordPress button on a post should say and do. */
export function draftState(draft: WpDraftView | null): DraftState {
  if (!draft) return "none";
  if (draft.status === "failed") return "failed";
  if (draft.status === "queued") return "waiting";
  return draft.outdated ? "outdated" : "saved";
}

/** A job is finished once it is done or failed; anything else is still running. */
export function jobFinished(status: string): boolean {
  return status === "done" || status === "failed";
}

/** Popularity 0-100 as a word, for the idea cards. */
export function popularityLabel(n: number): string {
  if (n >= 70) return "High demand";
  if (n >= 40) return "Steady demand";
  return "Niche";
}
