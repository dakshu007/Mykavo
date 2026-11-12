import { describe, expect, it } from "vitest";
import { buildCalendar, publishingStreak, slotOf, summarize, utcDay, withDisplay, type BoardPost } from "./blog-board";

const NOW = Date.parse("2026-11-12T10:00:00Z");

function post(id: string, publishedAt: string | null, status: "DRAFT" | "PUBLISHED" = "PUBLISHED"): BoardPost {
  return { id, slug: id, title: `Post ${id}`, status, publishedAt, updatedAt: "2026-11-12T00:00:00Z" };
}

describe("blog board", () => {
  const rows = withDisplay(
    [
      post("a", "2026-11-12T04:30:00Z"),
      post("b", "2026-11-11T12:30:00Z"),
      post("c", "2026-11-10T04:30:00Z"),
      post("d", "2026-11-08T04:30:00Z"),
      post("s", "2026-11-12T12:30:00Z"),
      post("t", "2026-11-14T04:30:00Z"),
      post("x", null, "DRAFT"),
    ],
    NOW,
  );

  it("splits slots at noon UTC", () => {
    expect(slotOf("2026-11-12T04:30:00Z")).toBe("morning");
    expect(slotOf("2026-11-12T12:30:00Z")).toBe("evening");
  });

  it("counts live, scheduled and drafts", () => {
    const s = summarize(rows, NOW);
    expect(s).toMatchObject({ live: 4, scheduled: 2, drafts: 1, last30: 4 });
    expect(s.nextScheduled?.title).toBe("Post s");
    expect(s.lastPublished).toBe(Date.parse("2026-11-12T04:30:00Z"));
  });

  it("counts the streak back from today and stops at a gap", () => {
    expect(publishingStreak(rows, NOW)).toBe(3);
  });

  it("does not break the streak on a today with no post yet", () => {
    const later = withDisplay([post("b", "2026-11-11T12:30:00Z"), post("c", "2026-11-10T04:30:00Z")], NOW);
    expect(publishingStreak(later, NOW)).toBe(2);
  });

  it("places posts in calendar slots", () => {
    const days = buildCalendar(rows, NOW, 7, 3);
    expect(days).toHaveLength(10);
    const today = days.find((d) => d.isToday)!;
    expect(today.day).toBe(utcDay(NOW));
    expect(today.morning.state).toBe("live");
    expect(today.evening.state).toBe("scheduled");
    const future = days.find((d) => d.day === Date.parse("2026-11-14T00:00:00Z"))!;
    expect(future.isFuture).toBe(true);
    expect(future.morning.state).toBe("scheduled");
  });
});
