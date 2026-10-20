/**
 * When a change is the SAME condition already reported.
 *
 * Every scan compares against the approved baseline, so until someone
 * approves, fixes or ignores a change, every scan finds it again. Creating a
 * new event each time filled the Changes list with copies (1,523 events for
 * 524 real conditions in one week). An event is a repeat when an open or
 * ignored event has the same page, baseline and condition key.
 *
 * The key is the change type, its severity and its new value. Visual changes
 * leave the value out (the percentage drifts a little on every scan) but keep
 * the severity, so a page that gets visibly worse still raises a new event.
 */
export interface ChangeConditionInput {
  changeType: string;
  category: string;
  severity: string;
  currentValue: string | null;
}

export function changeConditionKey(c: ChangeConditionInput): string {
  const value = c.category === "VISUAL" ? "" : (c.currentValue ?? "");
  return `${c.changeType}|${c.severity}|${value}`;
}

/** Statuses that mean "already known": still open, or deliberately ignored. */
export const KNOWN_CHANGE_STATUSES = ["NEW", "REVIEWED", "IGNORED"] as const;
