/**
 * Who is grandfathered into email alerts.
 *
 * Email alerts became opt-in: a workspace with no EMAIL channel now receives
 * nothing, where before it silently fell back to mailing the owner. Applied
 * retroactively that is not a default change, it is an outage nobody can see
 * - a paying customer stops hearing about their own critical regressions and
 * has no way to tell why.
 *
 * The migration that ships alongside this writes each existing workspace's
 * current behaviour down as a real, visible, switch-off-able channel row. But
 * migrations in this repo are applied BY HAND, before the web deploy, and the
 * code shipped first once already - which turned every unconfigured workspace
 * silent until somebody remembered to run it.
 *
 * So the rule lives here as well, in code, keyed off the workspace's own
 * creation date:
 *
 *   - created BEFORE the cutoff -> was already receiving owner-addressed
 *     alerts, keeps receiving them until it says otherwise;
 *   - created AFTER -> opt-in, silent until somebody turns it on.
 *
 * That is the same answer the migration produces, so the two agree, and it
 * holds whether or not the migration has run. A correctness property that
 * depends on a human remembering a deploy step is not a correctness property.
 */

/**
 * The moment email alerts became opt-in in production (deploy of
 * 2026-09-20). Workspaces older than this were already being emailed.
 */
export const EMAIL_OPT_IN_SINCE = new Date("2026-09-20T00:00:00.000Z");

/**
 * True when a workspace with no saved notification settings should still be
 * emailed, because it predates the opt-in rule.
 */
export function emailIsGrandfathered(
  workspaceCreatedAt: Date | null | undefined,
  since: Date = EMAIL_OPT_IN_SINCE,
): boolean {
  if (!workspaceCreatedAt) return false;
  return workspaceCreatedAt.getTime() < since.getTime();
}
