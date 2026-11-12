import { postDisplayStatus, type PostDisplayStatus } from "@/lib/blog-schedule";

/**
 * Pure helpers behind the admin blog page: the publishing calendar, the
 * streak and the readouts. Every day boundary is UTC, because posts are
 * scheduled in UTC (the morning slot is 04:30, the evening slot 12:30), so
 * the calendar shows the same day for everyone who opens it.
 */

export interface BoardPost {
  id: string;
  slug: string;
  title: string;
  status: "DRAFT" | "PUBLISHED";
  /** ISO string, or null for a draft that was never given a date. */
  publishedAt: string | null;
  updatedAt: string;
}

export interface BoardRow extends BoardPost {
  display: PostDisplayStatus;
}

export type Slot = "morning" | "evening";

/** Morning before 12:00 UTC, evening after. */
export function slotOf(iso: string): Slot {
  return new Date(iso).getUTCHours() < 12 ? "morning" : "evening";
}

const DAY = 86_400_000;

/** Midnight UTC of the day `ms` falls in. */
export function utcDay(ms: number): number {
  return Math.floor(ms / DAY) * DAY;
}

export function withDisplay(posts: BoardPost[], now: number): BoardRow[] {
  return posts.map((p) => ({ ...p, display: postDisplayStatus(p.status, p.publishedAt, now) }));
}

export interface CalendarDay {
  /** Midnight UTC. */
  day: number;
  isToday: boolean;
  isFuture: boolean;
  morning: SlotCell;
  evening: SlotCell;
}

export interface SlotCell {
  state: "live" | "scheduled" | "empty";
  titles: string[];
}

/**
 * `past` days up to and including today, then `ahead` days after it. Each
 * day has a morning and an evening cell: live, scheduled or empty.
 */
export function buildCalendar(rows: BoardRow[], now: number, past = 28, ahead = 7): CalendarDay[] {
  const today = utcDay(now);
  const first = today - (past - 1) * DAY;
  const days: CalendarDay[] = [];
  for (let i = 0; i < past + ahead; i++) {
    const day = first + i * DAY;
    days.push({
      day,
      isToday: day === today,
      isFuture: day > today,
      morning: { state: "empty", titles: [] },
      evening: { state: "empty", titles: [] },
    });
  }
  for (const r of rows) {
    if (r.display === "DRAFT" || !r.publishedAt) continue;
    const at = new Date(r.publishedAt).getTime();
    const idx = Math.floor((utcDay(at) - first) / DAY);
    if (idx < 0 || idx >= days.length) continue;
    const cell = days[idx][slotOf(r.publishedAt)];
    cell.titles.push(r.title);
    // A live post wins over a scheduled one in the same slot.
    if (r.display === "PUBLISHED") cell.state = "live";
    else if (cell.state === "empty") cell.state = "scheduled";
  }
  return days;
}

/**
 * Consecutive UTC days with at least one live post, counting back from
 * today. Today without a post yet does not break the streak (the day is not
 * over), so the count then starts from yesterday.
 */
export function publishingStreak(rows: BoardRow[], now: number): number {
  const days = new Set<number>();
  for (const r of rows) {
    if (r.display === "PUBLISHED" && r.publishedAt) days.add(utcDay(new Date(r.publishedAt).getTime()));
  }
  let day = utcDay(now);
  if (!days.has(day)) day -= DAY;
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day -= DAY;
  }
  return streak;
}

export interface BoardSummary {
  live: number;
  scheduled: number;
  drafts: number;
  last30: number;
  lastPublished: number | null;
  nextScheduled: { at: number; title: string } | null;
}

export function summarize(rows: BoardRow[], now: number): BoardSummary {
  let live = 0;
  let scheduled = 0;
  let drafts = 0;
  let last30 = 0;
  let lastPublished: number | null = null;
  let nextScheduled: BoardSummary["nextScheduled"] = null;
  for (const r of rows) {
    if (r.display === "DRAFT") {
      drafts++;
      continue;
    }
    const at = r.publishedAt ? new Date(r.publishedAt).getTime() : 0;
    if (r.display === "SCHEDULED") {
      scheduled++;
      if (!nextScheduled || at < nextScheduled.at) nextScheduled = { at, title: r.title };
      continue;
    }
    live++;
    if (at >= now - 30 * DAY) last30++;
    if (lastPublished === null || at > lastPublished) lastPublished = at;
  }
  return { live, scheduled, drafts, last30, lastPublished, nextScheduled };
}
