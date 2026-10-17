/**
 * Small, pure formatting helpers for the Overview page. `now` is always
 * passed in so the output is deterministic in tests and consistent across
 * one render.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Compact relative time: "just now", "12m ago", "3h ago", "2d ago", or for the
 * future "in 12m", "in 3h", "in 2d". Anything a week or more away falls back
 * to a calendar date ("Oct 3, 2026"), which reads better than "23d ago".
 */
export function formatRelative(date: Date, now: Date): string {
  const diff = now.getTime() - date.getTime();
  const future = diff < 0;
  const abs = Math.abs(diff);

  if (abs < MINUTE) return future ? "in under a minute" : "just now";
  if (abs >= 7 * DAY) {
    return date.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" });
  }

  let amount: string;
  if (abs < HOUR) amount = `${Math.floor(abs / MINUTE)}m`;
  else if (abs < DAY) amount = `${Math.floor(abs / HOUR)}h`;
  else amount = `${Math.floor(abs / DAY)}d`;

  return future ? `in ${amount}` : `${amount} ago`;
}

/** "example.com" from a URL, or the input itself when it does not parse. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** "/pricing?plan=pro" from a URL, or the input itself when it does not parse. */
export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

/** "1 website" / "3 websites". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
