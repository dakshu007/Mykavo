/**
 * MyKavo Automation Tool - the engine that runs the flows built in
 * Admin > Automations. Part of the hourly activation sweep.
 *
 * Each active flow, each sweep:
 *   1. Enrol: accounts whose trigger happened after the flow was switched
 *      on (never older ones - a new flow does not back-fill).
 *   2. Advance every run that is due: answer decisions from the account's
 *      current facts, send the next email, or start the next wait.
 *
 * Guard rails, the same as the built-in emails:
 *   - Emails spend the REMINDER share of the budget, so a flow can never
 *     use up the quota a CRITICAL alert needs. Out of budget: try next hour.
 *   - At most one optional email a day per account, counting the built-in
 *     lifecycle series too. Too soon: wait until the gap has passed.
 *   - Unsubscribed accounts stop; workspaces with email off skip emails.
 *   - A built-in email an account already got is never sent twice.
 *   - "Stop when the account upgrades" ends runs on paid plans.
 *
 * Everything that happens is written to automation_flow_event, which is
 * where the builder's per-step counts and activity log come from.
 */

import { isMissingTableError, prisma, type AutomationFlow, type AutomationFlowRun } from "@mykavo/database";
import { AUTOMATIONS, flowCustomEmail, isAutomationKey, renderAutomation } from "@mykavo/email";
import {
  LIFECYCLE_MIN_GAP_MS,
  displayPersonName,
  flowEmailKey,
  isFlowTrigger,
  isSafeButtonUrl,
  parseFlowDefinition,
  planFrom,
  type FlowDefinition,
} from "@mykavo/shared";
import { appBase, buildAutomationData, gatherFacts, withUnsubscribe, type AccountCtx } from "./automation-data";
import { lastSentAt, optionalHistory, sendAutomatedEmail } from "./automation-send";
import { sentBy, type Automations } from "./automation-settings";
import { logger } from "./logger";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const GAP_MS = 700;
/** New enrolments per flow per sweep. */
const MAX_ENROL = 200;
/** Due runs advanced per flow per sweep. */
const MAX_DUE = 300;
/** Steps one run may pass through in one sweep (decisions and skips are free). */
const MAX_HOPS = 25;

const pause = () => new Promise((resolve) => setTimeout(resolve, GAP_MS));

type Event = "enrolled" | "sent" | "skipped" | "failed" | "waiting" | "completed" | "stopped";

async function logEvent(flowId: string, runId: string, stepId: string | null, kind: Event, detail?: string) {
  await prisma.automationFlowEvent.create({ data: { flowId, runId, stepId, kind, detail: detail ?? null } });
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  _count: { select: { pushDevices: true } },
  ownedWorkspaces: { select: { id: true }, orderBy: { createdAt: "asc" as const }, take: 1 },
} as const;

async function enrol(flow: AutomationFlow, def: FlowDefinition): Promise<number> {
  if (!flow.activatedAt || !isFlowTrigger(flow.trigger) || def.steps.length === 0) return 0;
  const since = flow.activatedAt;
  const notYet = { automationRuns: { none: { flowId: flow.id } } };
  const users = await prisma.user.findMany({
    where:
      flow.trigger === "signup"
        ? { ...notYet, createdAt: { gte: since }, ownedWorkspaces: { some: {} } }
        : // First website: the account's websites all arrived after the flow
          // was switched on, so this is its first, not its fifth.
          { ...notYet, ownedWorkspaces: { some: { websites: { some: {}, every: { createdAt: { gte: since } } } } } },
    orderBy: { createdAt: "asc" },
    take: MAX_ENROL,
    select: { id: true },
  });
  for (const u of users) {
    const run = await prisma.automationFlowRun
      .create({ data: { flowId: flow.id, userId: u.id, currentStepId: def.steps[0].id }, select: { id: true } })
      .catch(() => null); // enrolled by a concurrent sweep - unique (flowId, userId)
    if (run) await logEvent(flow.id, run.id, null, "enrolled");
  }
  return users.length;
}

type Outcome = "sent" | "idle" | "provider_failed";

/** Move one run forward as far as it can go now. */
async function advance(
  flow: AutomationFlow,
  def: FlowDefinition,
  run: AutomationFlowRun,
  a: Automations,
  canSend: boolean,
): Promise<Outcome> {
  const finish = async (status: "COMPLETED" | "STOPPED", reason: string | null, stepId: string | null) => {
    await prisma.automationFlowRun.update({
      where: { id: run.id },
      data: { status, currentStepId: null, finishedAt: new Date(), stopReason: reason },
    });
    await logEvent(flow.id, run.id, stepId, status === "COMPLETED" ? "completed" : "stopped", reason ?? undefined);
  };
  const moveTo = (currentStepId: string | null, nextRunAt: Date) =>
    prisma.automationFlowRun.update({ where: { id: run.id }, data: { currentStepId, nextRunAt } });

  const user = await prisma.user.findUnique({ where: { id: run.userId }, select: userSelect });
  const workspaceId = user?.ownedWorkspaces[0]?.id;
  if (!user || !workspaceId || !user.email) {
    await finish("STOPPED", "The account no longer has a workspace.", run.currentStepId);
    return "idle";
  }
  const ctx: AccountCtx = {
    userId: user.id,
    name: displayPersonName(user.name, user.email),
    email: user.email.trim().toLowerCase(),
    workspaceId,
    pushDevices: user._count.pushDevices,
  };
  const facts = await gatherFacts(ctx);
  if (def.exitOnPaid && facts.is_paid) {
    await finish("STOPPED", "Upgraded to a paid plan.", run.currentStepId);
    return "idle";
  }

  let at = run.currentStepId;
  // One email per account per sweep; after it, carry on only far enough to
  // start the next wait on time.
  let sentNow = false;
  const done = (): Outcome => (sentNow ? "sent" : "idle");
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    if (at === null) {
      await finish("COMPLETED", null, null);
      return done();
    }
    const plan = planFrom(def, at, facts);
    if (plan.kind === "missing") {
      await finish("COMPLETED", "The step it was at was removed from the flow.", at);
      return done();
    }
    if (plan.kind === "done") {
      await finish("COMPLETED", null, null);
      return done();
    }
    if (plan.kind === "wait") {
      await moveTo(plan.nextId, new Date(Date.now() + plan.step.days * DAY_MS));
      await logEvent(flow.id, run.id, plan.step.id, "waiting", `${plan.step.days} day${plan.step.days === 1 ? "" : "s"}`);
      return done();
    }

    // Send email.
    const step = plan.step;
    const skip = async (why: string) => {
      await logEvent(flow.id, run.id, step.id, "skipped", why);
      at = plan.nextId;
      await moveTo(at, new Date());
    };
    const email = step.email;
    const builtin = email.kind === "builtin" ? email.key : null;
    if (builtin !== null && !isAutomationKey(builtin)) {
      await skip("Unknown built-in email.");
      continue;
    }
    const key = builtin ?? flowEmailKey(flow.id, step.id);
    const unsubscribable = builtin ? AUTOMATIONS[builtin].unsubscribable : true;

    if (facts.emailOff) {
      await skip("Email is switched off for this workspace.");
      continue;
    }
    if (unsubscribable && facts.optedOut) {
      await finish("STOPPED", "Unsubscribed from optional emails.", step.id);
      return done();
    }
    const already = await prisma.notification.findFirst({
      where: {
        workspaceId,
        channelType: "EMAIL",
        status: "SENT",
        ...(builtin ? sentBy(builtin, a) : { automationSend: { is: { automationKey: key, isTest: false } } }),
      },
      select: { id: true },
    });
    if (already) {
      await skip("Already sent to this account.");
      continue;
    }
    if (sentNow) {
      await moveTo(at, new Date(Date.now() + HOUR_MS));
      return done();
    }
    if (!canSend) {
      await moveTo(at, new Date(Date.now() + HOUR_MS)); // out of budget - next hour
      return done();
    }
    if (unsubscribable) {
      const last = lastSentAt(await optionalHistory(workspaceId, a));
      if (last && Date.now() - last.getTime() < LIFECYCLE_MIN_GAP_MS) {
        await moveTo(at, new Date(last.getTime() + LIFECYCLE_MIN_GAP_MS));
        return done();
      }
    }

    let render: (unsubscribeUrl: string) => { subject: string; html: string; text: string };
    if (builtin) {
      const data = await buildAutomationData(builtin, ctx, "");
      if (!data) {
        await skip("Nothing to report yet (no finished baseline).");
        continue;
      }
      render = (u) => renderAutomation(withUnsubscribe(data, u), a.settings);
    } else if (email.kind === "custom") {
      const buttonUrl = isSafeButtonUrl(email.buttonUrl)
        ? email.buttonUrl.startsWith("/")
          ? `${appBase}${email.buttonUrl}`
          : email.buttonUrl
        : `${appBase}/dashboard`;
      render = (u) =>
        flowCustomEmail({
          name: ctx.name,
          subject: email.subject,
          heading: email.heading,
          body: email.body,
          buttonLabel: email.buttonLabel,
          buttonUrl,
          unsubscribeUrl: u,
        });
    } else {
      await skip("Unknown email.");
      continue;
    }

    const result = await sendAutomatedEmail({ workspaceId, to: user.email, key, unsubscribable, a, render });
    if (!result.ok) {
      await logEvent(flow.id, run.id, step.id, "failed", result.error ?? "The email provider refused it.");
      await moveTo(at, new Date(Date.now() + HOUR_MS));
      return "provider_failed";
    }
    await logEvent(flow.id, run.id, step.id, "sent");
    sentNow = true;
    at = plan.nextId;
    await moveTo(at, new Date());
  }
  return done();
}

/**
 * Run every active flow once. Returns how many emails were sent. Before the
 * automation_flow migration is applied this does nothing.
 */
export async function runFlows(budget: number, a: Automations): Promise<number> {
  let flows: AutomationFlow[];
  try {
    flows = await prisma.automationFlow.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
  } catch (err) {
    if (isMissingTableError(err)) return 0;
    throw err;
  }

  let sent = 0;
  for (const flow of flows) {
    const parsed = parseFlowDefinition(flow.definition);
    if (!parsed.ok) {
      logger.error("flow definition unreadable, skipping", { flowId: flow.id, error: parsed.error });
      continue;
    }
    const def = parsed.flow;
    const enrolled = await enrol(flow, def);

    const due = await prisma.automationFlowRun.findMany({
      where: { flowId: flow.id, status: "ACTIVE", nextRunAt: { lte: new Date() } },
      orderBy: { nextRunAt: "asc" },
      take: MAX_DUE,
    });
    let flowSent = 0;
    for (const run of due) {
      let outcome: Outcome;
      try {
        outcome = await advance(flow, def, run, a, sent < budget);
      } catch (err) {
        // One account's bad data must not stall the flow for everyone.
        logger.error("flow run failed to advance", {
          flowId: flow.id,
          runId: run.id,
          error: err instanceof Error ? err.message : String(err),
        });
        await prisma.automationFlowRun.update({ where: { id: run.id }, data: { nextRunAt: new Date(Date.now() + HOUR_MS) } });
        continue;
      }
      if (outcome === "sent") {
        sent++;
        flowSent++;
        await pause();
      }
      if (outcome === "provider_failed") {
        logger.warn("flow email failed, stopping flows for this sweep", { flowId: flow.id });
        return sent;
      }
    }
    if (enrolled || due.length) logger.info("flow advanced", { flowId: flow.id, enrolled, due: due.length, sent: flowSent });
  }
  return sent;
}
