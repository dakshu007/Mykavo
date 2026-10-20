/**
 * When a change is the SAME condition already reported.
 *
 * Every scan compares against the approved baseline, so until someone
 * approves, fixes or ignores a change, every scan finds it again. Creating a
 * new event each time filled the Changes list with copies (1,523 events for
 * 524 real conditions in one week). An event is a repeat when an open or
 * ignored event has the same page, baseline and condition key.
 *
 * The key is the change type, its severity and its new value. Visual and
 * performance changes leave the value out (a percentage, page weight or
 * response time drifts a little on every scan: "3,084 KB" then "3,091 KB" is
 * the same condition) but keep the severity, so a page that gets visibly
 * worse or slower still raises a new event.
 */
export interface ChangeConditionInput {
  changeType: string;
  category: string;
  severity: string;
  currentValue: string | null;
}

export function changeConditionKey(c: ChangeConditionInput): string {
  const value = c.category === "VISUAL" || c.category === "PERFORMANCE" ? "" : (c.currentValue ?? "");
  return `${c.changeType}|${c.severity}|${value}`;
}

/** Statuses that mean "already known": still open, or deliberately ignored. */
export const KNOWN_CHANGE_STATUSES = ["NEW", "REVIEWED", "IGNORED"] as const;

/**
 * On a page, an approved change is known too. Approving says "this is
 * expected", but it leaves the baseline as it was, so without this every
 * later scan found the approved change again and alerted on it: 326 changes
 * on one site came straight back on the next scan after being approved.
 * Page events are matched against one baseline, so a new baseline starts
 * afresh. Site-wide events (robots.txt, sitemap, broken links) are not tied
 * to a baseline, so there an old approval must not silence a new failure.
 */
export const KNOWN_PAGE_CHANGE_STATUSES = [...KNOWN_CHANGE_STATUSES, "APPROVED"] as const;
