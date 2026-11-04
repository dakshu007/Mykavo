/**
 * WordPress AI crawler alerts (AI Insights): what is worth an email today.
 * Pure - the worker reads the visit rows and the alert log, sends at most
 * one email per website a day and records what it alerted on.
 *
 *   New AI bot: a crawler seen for the first time ever on the site, in the
 *   last few days, on a site with at least two weeks of history before it (a
 *   freshly connected site uploads two weeks at once, and every crawler in
 *   it would otherwise look "new").
 *
 *   Errors: AI crawlers were answered with 4xx/5xx on AI_ALERT_ERROR_MIN_HITS
 *   or more visits on one of the last complete UTC days.
 */

export const AI_ALERT_NEW_AGENT_LOOKBACK_DAYS = 3;
export const AI_ALERT_MIN_HISTORY_DAYS = 14;
export const AI_ALERT_ERROR_MIN_HITS = 5;
/** Complete days checked for errors: yesterday and the day before (late uploads). */
export const AI_ALERT_ERROR_DAYS = 2;

export type AiAlertKind = "new_agent" | "errors" | "email";

export interface AiAlertInput {
  /** First day each crawler was seen on the site, YYYY-MM-DD. */
  firstSeen: Record<string, string>;
  /** Error hits per recent day, all crawlers together. */
  errorsByDay: Record<string, number>;
  /** Keys already alerted on: aiAlertKey(kind, agent, day). */
  alerted: ReadonlySet<string>;
  /** Today, UTC, YYYY-MM-DD. */
  today: string;
}

export interface AiAlertPick {
  newAgents: Array<{ agent: string; day: string }>;
  errorDays: Array<{ day: string; errors: number }>;
}

export function aiAlertKey(kind: AiAlertKind, agent: string, day: string): string {
  return `${kind}|${agent}|${day}`;
}

/** YYYY-MM-DD `n` days before `day`. */
export function shiftDay(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
}

export function pickAiCrawlerAlerts(input: AiAlertInput): AiAlertPick {
  const days = Object.values(input.firstSeen).sort();
  const siteFirstDay = days[0];
  const newSince = shiftDay(input.today, AI_ALERT_NEW_AGENT_LOOKBACK_DAYS);

  const newAgents: AiAlertPick["newAgents"] = [];
  if (siteFirstDay) {
    for (const [agent, day] of Object.entries(input.firstSeen)) {
      if (day < newSince || day > input.today) continue;
      if (shiftDay(day, AI_ALERT_MIN_HISTORY_DAYS) < siteFirstDay) continue;
      if (input.alerted.has(aiAlertKey("new_agent", agent, day))) continue;
      newAgents.push({ agent, day });
    }
  }
  newAgents.sort((a, b) => a.day.localeCompare(b.day) || a.agent.localeCompare(b.agent));

  const errorDays: AiAlertPick["errorDays"] = [];
  for (let i = AI_ALERT_ERROR_DAYS; i >= 1; i--) {
    const day = shiftDay(input.today, i);
    const errors = input.errorsByDay[day] ?? 0;
    if (errors < AI_ALERT_ERROR_MIN_HITS) continue;
    if (input.alerted.has(aiAlertKey("errors", "*", day))) continue;
    errorDays.push({ day, errors });
  }
  return { newAgents, errorDays };
}
