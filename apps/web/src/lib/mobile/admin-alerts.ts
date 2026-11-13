/**
 * The "needs you" list on the phone's Command Center: turns the pulse figures
 * into a short, ranked list of things the operator should look at. Pure, so
 * every threshold is unit-tested and the route stays a thin reader.
 */

export type AlertLevel = "critical" | "warning" | "info";

export interface PulseAlert {
  level: AlertLevel;
  title: string;
  detail: string;
}

export interface AlertInputs {
  worker: { state: "healthy" | "stale" | "down" | "unknown"; minutesAgo: number | null };
  scans24h: { total: number; failed: number };
  aiPaused: boolean;
  aiConfigured: boolean;
  aiPools: { label: string; spentUsd: number; capUsd: number }[];
  aiJobsFailed24h: number;
  wpDraftsStuck: number;
  emailFailed24h: number;
  paymentsOnHold: number;
  appRequestsPending: number;
  openIncidents: number;
}

const RANK: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2 };

/** Failure share of the day's scans at which the scanner itself is suspect. */
export const SCAN_FAILURE_WARN = 0.2;
export const SCAN_FAILURE_CRITICAL = 0.5;
/** Share of a monthly AI cap at which spend is called out. */
export const AI_SPEND_WARN = 0.8;

export function pulseAlerts(i: AlertInputs): PulseAlert[] {
  const out: PulseAlert[] = [];

  if (i.worker.state === "down") {
    out.push({
      level: "critical",
      title: "Worker looks down",
      detail:
        i.worker.minutesAgo === null
          ? "No health check has ever landed. Nothing is being scanned."
          : `No health check for ${i.worker.minutesAgo} minutes. Scans and alerts have stopped.`,
    });
  } else if (i.worker.state === "stale") {
    out.push({
      level: "warning",
      title: "Worker is late",
      detail: `Last health check ${i.worker.minutesAgo ?? "?"} minutes ago. Normal is under 15.`,
    });
  }

  // Ten scans is the floor: two failures out of three is noise, not an outage.
  if (i.scans24h.total >= 10) {
    const share = i.scans24h.failed / i.scans24h.total;
    if (share >= SCAN_FAILURE_CRITICAL) {
      out.push({
        level: "critical",
        title: `${Math.round(share * 100)}% of scans failed today`,
        detail: `${i.scans24h.failed} of ${i.scans24h.total} scans in 24 hours. Check the scanner.`,
      });
    } else if (share >= SCAN_FAILURE_WARN) {
      out.push({
        level: "warning",
        title: `${Math.round(share * 100)}% of scans failed today`,
        detail: `${i.scans24h.failed} of ${i.scans24h.total} scans in 24 hours.`,
      });
    }
  }

  if (i.aiConfigured && i.aiPaused) {
    out.push({ level: "warning", title: "AI is paused", detail: "Explanations, summaries and the AI Writer are off for everyone." });
  }
  if (!i.aiConfigured) {
    out.push({ level: "info", title: "AI is not configured", detail: "No API key on this deployment." });
  }
  for (const pool of i.aiPools) {
    if (pool.capUsd <= 0) continue;
    const used = pool.spentUsd / pool.capUsd;
    if (used >= 1) {
      out.push({ level: "critical", title: `${pool.label}: budget used up`, detail: `$${pool.spentUsd.toFixed(2)} of $${pool.capUsd.toFixed(2)} this month. New AI work is refused.` });
    } else if (used >= AI_SPEND_WARN) {
      out.push({ level: "warning", title: `${pool.label}: ${Math.round(used * 100)}% of budget`, detail: `$${pool.spentUsd.toFixed(2)} of $${pool.capUsd.toFixed(2)} this month.` });
    }
  }
  if (i.aiJobsFailed24h >= 3) {
    out.push({ level: "warning", title: `${i.aiJobsFailed24h} AI jobs failed today`, detail: "Customers saw an error in the AI Writer." });
  }

  if (i.wpDraftsStuck > 0) {
    out.push({
      level: "warning",
      title: `${i.wpDraftsStuck} WordPress ${i.wpDraftsStuck === 1 ? "draft is" : "drafts are"} stuck`,
      detail: "Queued over 30 minutes and not collected by the plugin.",
    });
  }
  if (i.emailFailed24h > 0) {
    out.push({ level: i.emailFailed24h >= 10 ? "critical" : "warning", title: `${i.emailFailed24h} emails failed today`, detail: "Alerts or automations did not reach someone." });
  }
  if (i.paymentsOnHold > 0) {
    out.push({ level: "warning", title: `${i.paymentsOnHold} ${i.paymentsOnHold === 1 ? "payment" : "payments"} on hold`, detail: "A renewal failed. The customer has been emailed." });
  }
  if (i.appRequestsPending > 0) {
    out.push({ level: "info", title: `${i.appRequestsPending} app ${i.appRequestsPending === 1 ? "request" : "requests"} waiting`, detail: "Someone wants the Android app." });
  }
  if (i.openIncidents > 0) {
    out.push({ level: "info", title: `${i.openIncidents} customer ${i.openIncidents === 1 ? "site is" : "sites are"} down`, detail: "Open uptime incidents across all workspaces." });
  }

  return out.sort((a, b) => RANK[a.level] - RANK[b.level]);
}

/** Monthly recurring revenue from active subscriptions, yearly plans spread over 12. */
export function monthlyRevenue(
  subs: { planId: string; billingInterval: string }[],
  price: (planId: string) => { monthly: number; yearly: number },
): number {
  let total = 0;
  for (const s of subs) {
    const p = price(s.planId);
    total += s.billingInterval === "year" && p.yearly > 0 ? p.yearly / 12 : p.monthly;
  }
  return Math.round(total * 100) / 100;
}

/** Counts per UTC day for the last `days` days, oldest first, today last. */
export function dailyCounts(dates: Date[], days: number, now: Date = new Date()): number[] {
  const out = new Array<number>(days).fill(0);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (const d of dates) {
    const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const index = days - 1 - Math.round((today - day) / 86_400_000);
    if (index >= 0 && index < days) out[index] += 1;
  }
  return out;
}
