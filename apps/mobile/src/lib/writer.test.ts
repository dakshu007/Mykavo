import { describe, expect, it } from "vitest";

import { canAnalyse, canWrite, draftState, jobFinished, popularityLabel, postsLeftLabel } from "./writer";
import type { WpDraftView } from "./types";

const draft = (over: Partial<WpDraftView>): WpDraftView => ({
  status: "delivered",
  editUrl: null,
  error: null,
  queuedAt: "2026-11-13T00:00:00Z",
  deliveredAt: null,
  outdated: false,
  postVersion: 1,
  ...over,
});

describe("AI Writer helpers", () => {
  it("labels the post allowance", () => {
    expect(postsLeftLabel({ postsLeft: null })).toBe("Unlimited posts");
    expect(postsLeftLabel({ postsLeft: 0 })).toBe("No posts left");
    expect(postsLeftLabel({ postsLeft: 1 })).toBe("1 post left");
    expect(postsLeftLabel({ postsLeft: 7 })).toBe("7 posts left");
  });

  it("refuses to write when blocked or out of posts", () => {
    expect(canWrite({ postsLeft: 3, blocked: null })).toBe(true);
    expect(canWrite({ postsLeft: null, blocked: null })).toBe(true);
    expect(canWrite({ postsLeft: 0, blocked: null })).toBe(false);
    expect(canWrite({ postsLeft: 3, blocked: "Payment failed" })).toBe(false);
    expect(canAnalyse({ reportsLeft: 0, blocked: null })).toBe(false);
  });

  it("maps a WordPress draft to a button state", () => {
    expect(draftState(null)).toBe("none");
    expect(draftState(draft({ status: "queued" }))).toBe("waiting");
    expect(draftState(draft({ status: "failed" }))).toBe("failed");
    expect(draftState(draft({}))).toBe("saved");
    expect(draftState(draft({ outdated: true }))).toBe("outdated");
  });

  it("knows when a job has finished", () => {
    expect(jobFinished("done")).toBe(true);
    expect(jobFinished("failed")).toBe(true);
    expect(jobFinished("running")).toBe(false);
    expect(jobFinished("queued")).toBe(false);
  });

  it("words popularity", () => {
    expect(popularityLabel(80)).toBe("High demand");
    expect(popularityLabel(40)).toBe("Steady demand");
    expect(popularityLabel(10)).toBe("Niche");
  });
});
