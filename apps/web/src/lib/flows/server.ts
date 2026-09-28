import { isMissingTableError, prisma } from "@mykavo/database";
import { AUTOMATIONS, AUTOMATION_KEYS } from "@mykavo/email";
import { allSteps, parseFlowDefinition, type FlowDefinition, type FlowStatus, type FlowTrigger } from "@mykavo/shared";
import { getAutomationsOverview } from "@/lib/automations-admin";
import { countSteps } from "./edit";
import { systemFlows, type SystemFlow } from "./system";

/**
 * The Automation Tool, server side: flows with their numbers, for the list
 * and the builder. Callers check isPlatformAdmin first; nothing here does.
 * Before the automation_flow migration is applied, `ready` is false and
 * only the built-in flows are shown.
 */

export interface BuiltinEmailOption {
  key: string;
  name: string;
  group: string;
  unsubscribable: boolean;
}

export function builtinEmailOptions(): BuiltinEmailOption[] {
  return AUTOMATION_KEYS.map((k) => ({
    key: k,
    name: AUTOMATIONS[k].name,
    group: AUTOMATIONS[k].group,
    unsubscribable: AUTOMATIONS[k].unsubscribable,
  }));
}

export interface RunCounts {
  active: number;
  completed: number;
  stopped: number;
}

export interface FlowListItem {
  id: string;
  name: string;
  status: FlowStatus;
  trigger: FlowTrigger;
  steps: number;
  updatedAt: string;
  runs: RunCounts;
  sent: number;
}

export interface StepStats {
  sent: number;
  skipped: number;
  failed: number;
  /** Accounts currently waiting to reach this step. */
  here: number;
}

export interface FlowActivity {
  id: string;
  kind: string;
  stepId: string | null;
  detail: string | null;
  createdAt: string;
  email: string | null;
}

export interface FlowDetail {
  id: string;
  name: string;
  status: FlowStatus;
  trigger: FlowTrigger;
  definition: FlowDefinition;
  activatedAt: string | null;
  updatedAt: string;
  updatedByEmail: string | null;
  runs: RunCounts;
  stepStats: Record<string, StepStats>;
  activity: FlowActivity[];
}

async function runCounts(flowIds: string[]): Promise<Map<string, RunCounts>> {
  const rows = await prisma.automationFlowRun.groupBy({
    by: ["flowId", "status"],
    where: { flowId: { in: flowIds } },
    _count: { _all: true },
  });
  const out = new Map<string, RunCounts>();
  for (const id of flowIds) out.set(id, { active: 0, completed: 0, stopped: 0 });
  for (const r of rows) {
    const c = out.get(r.flowId);
    if (!c) continue;
    if (r.status === "ACTIVE") c.active = r._count._all;
    else if (r.status === "COMPLETED") c.completed = r._count._all;
    else if (r.status === "STOPPED") c.stopped = r._count._all;
  }
  return out;
}

export async function listFlows(): Promise<{ ready: boolean; flows: FlowListItem[]; system: (SystemFlow & { sent30d: number })[] }> {
  const overview = await getAutomationsOverview();
  const sentByKey = new Map(overview.automations.map((a) => [a.meta.key as string, a.stats.sent30d]));
  const settings = Object.fromEntries(overview.automations.map((a) => [a.meta.key, a.settings])) as Parameters<typeof systemFlows>[0];
  const system = systemFlows(settings).map((f) => ({
    ...f,
    sent30d: allSteps(f.definition).reduce(
      (n, s) => n + (s.type === "email" && s.email.kind === "builtin" ? (sentByKey.get(s.email.key) ?? 0) : 0),
      0,
    ),
  }));

  let rows;
  try {
    rows = await prisma.automationFlow.findMany({ orderBy: { updatedAt: "desc" } });
  } catch (err) {
    if (isMissingTableError(err)) return { ready: false, flows: [], system };
    throw err;
  }
  const ids = rows.map((r) => r.id);
  const [counts, sent] = await Promise.all([
    runCounts(ids),
    prisma.automationFlowEvent.groupBy({ by: ["flowId"], where: { flowId: { in: ids }, kind: "sent" }, _count: { _all: true } }),
  ]);
  const sentMap = new Map(sent.map((s) => [s.flowId, s._count._all]));
  return {
    ready: true,
    system,
    flows: rows.map((r) => {
      const parsed = parseFlowDefinition(r.definition);
      return {
        id: r.id,
        name: r.name,
        status: r.status as FlowStatus,
        trigger: r.trigger as FlowTrigger,
        steps: parsed.ok ? countSteps(parsed.flow.steps) : 0,
        updatedAt: r.updatedAt.toISOString(),
        runs: counts.get(r.id) ?? { active: 0, completed: 0, stopped: 0 },
        sent: sentMap.get(r.id) ?? 0,
      };
    }),
  };
}

/** Null when there is no such flow, or the tables do not exist yet. */
export async function getFlow(id: string): Promise<FlowDetail | null> {
  let row;
  try {
    row = await prisma.automationFlow.findUnique({ where: { id } });
  } catch (err) {
    if (isMissingTableError(err)) return null;
    throw err;
  }
  if (!row) return null;
  const parsed = parseFlowDefinition(row.definition);
  const definition = parsed.ok ? parsed.flow : { version: 1 as const, exitOnPaid: true, steps: [] };

  const [counts, events, waiting, recent] = await Promise.all([
    runCounts([id]),
    prisma.automationFlowEvent.groupBy({
      by: ["stepId", "kind"],
      where: { flowId: id, stepId: { not: null }, kind: { in: ["sent", "skipped", "failed"] } },
      _count: { _all: true },
    }),
    prisma.automationFlowRun.groupBy({
      by: ["currentStepId"],
      where: { flowId: id, status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.automationFlowEvent.findMany({ where: { flowId: id }, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);

  const stepStats: Record<string, StepStats> = {};
  const stat = (stepId: string) => (stepStats[stepId] ??= { sent: 0, skipped: 0, failed: 0, here: 0 });
  for (const e of events) {
    if (!e.stepId) continue;
    const s = stat(e.stepId);
    if (e.kind === "sent") s.sent = e._count._all;
    else if (e.kind === "skipped") s.skipped = e._count._all;
    else if (e.kind === "failed") s.failed = e._count._all;
  }
  for (const w of waiting) if (w.currentStepId) stat(w.currentStepId).here = w._count._all;

  const runIds = [...new Set(recent.map((e) => e.runId))];
  const runs = runIds.length
    ? await prisma.automationFlowRun.findMany({ where: { id: { in: runIds } }, select: { id: true, user: { select: { email: true } } } })
    : [];
  const emailByRun = new Map(runs.map((r) => [r.id, r.user.email]));

  return {
    id: row.id,
    name: row.name,
    status: row.status as FlowStatus,
    trigger: row.trigger as FlowTrigger,
    definition,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    updatedByEmail: row.updatedByEmail,
    runs: counts.get(id) ?? { active: 0, completed: 0, stopped: 0 },
    stepStats,
    activity: recent.map((e) => ({
      id: e.id,
      kind: e.kind,
      stepId: e.stepId,
      detail: e.detail,
      createdAt: e.createdAt.toISOString(),
      email: emailByRun.get(e.runId) ?? null,
    })),
  };
}

/** Sends in the last 30 days per built-in email, for the built-in flows' badges. */
export async function builtinStepStats(flow: SystemFlow): Promise<Record<string, StepStats>> {
  const overview = await getAutomationsOverview();
  const byKey = new Map(overview.automations.map((a) => [a.meta.key as string, a.stats]));
  const out: Record<string, StepStats> = {};
  for (const s of allSteps(flow.definition)) {
    if (s.type === "email" && s.email.kind === "builtin") {
      const st = byKey.get(s.email.key);
      out[s.id] = { sent: st?.sent30d ?? 0, skipped: 0, failed: st?.failed30d ?? 0, here: 0 };
    }
  }
  return out;
}

/** Whether the automation_flow tables exist yet. */
export async function flowsReady(): Promise<boolean> {
  try {
    await prisma.automationFlow.findFirst({ select: { id: true } });
    return true;
  } catch (err) {
    if (isMissingTableError(err)) return false;
    throw err;
  }
}
