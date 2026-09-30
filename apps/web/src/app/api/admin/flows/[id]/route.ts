import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { FLOW_EMAIL_KEYS } from "@mykavo/email";
import { FLOW_LIMITS, flowIssues, isFlowTrigger, parseFlowDefinition } from "@mykavo/shared";
import { adminRequest, readJson } from "@/lib/automations-api";
import { logger } from "@/lib/logger";

/**
 * One flow in the Automation Tool: save (PUT), switch on or pause (PATCH),
 * delete (DELETE). Platform admins only.
 *
 * Saving an active flow is allowed: accounts already in it carry on from
 * the step they are at, and an account whose step was removed finishes
 * there. Switching on requires a flow with no problems.
 */

type Params = { params: Promise<{ id: string }> };

async function findFlow(id: string) {
  return prisma.automationFlow.findUnique({ where: { id } }).catch(() => null);
}

export async function PUT(request: Request, { params }: Params) {
  const req = await adminRequest("flow-save", 60);
  if (!req.ok) return req.response;
  const { id } = await params;
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const flow = await findFlow(id);
  if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > FLOW_LIMITS.name) {
    return NextResponse.json({ error: `Give the flow a name under ${FLOW_LIMITS.name} characters.` }, { status: 400 });
  }
  if (!isFlowTrigger(body.trigger)) return NextResponse.json({ error: "Pick what starts the flow." }, { status: 400 });
  const parsed = parseFlowDefinition(body.definition);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // An active flow must stay runnable: saving a broken one would stall
  // every account in it.
  const issues = flowIssues(parsed.flow, FLOW_EMAIL_KEYS);
  if (flow.status === "ACTIVE" && issues.length > 0) {
    return NextResponse.json({ error: "This flow is on - fix the problems before saving, or pause it first.", issues }, { status: 400 });
  }

  const updated = await prisma.automationFlow.update({
    where: { id },
    data: { name, trigger: body.trigger, definition: parsed.flow as object, updatedByEmail: req.email },
    select: { updatedAt: true },
  });
  logger.info("automation flow saved", { userId: req.userId, flowId: id });
  return NextResponse.json({ updatedAt: updated.updatedAt.toISOString(), issues });
}

export async function PATCH(request: Request, { params }: Params) {
  const req = await adminRequest("flow-status", 30);
  if (!req.ok) return req.response;
  const { id } = await params;
  const body = await readJson(request);
  const status = body?.status;
  if (status !== "ACTIVE" && status !== "PAUSED") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const flow = await findFlow(id);
  if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (status === "ACTIVE") {
    const parsed = parseFlowDefinition(flow.definition);
    const issues = parsed.ok ? flowIssues(parsed.flow, FLOW_EMAIL_KEYS) : [{ stepId: null, message: parsed.error }];
    if (issues.length > 0) return NextResponse.json({ error: "Fix the problems first.", issues }, { status: 400 });
  }
  await prisma.automationFlow.update({
    where: { id },
    // A new activation time on every switch-on: only events from now on
    // enrol accounts, so nothing back-fills from while it was off.
    data: { status, updatedByEmail: req.email, ...(status === "ACTIVE" ? { activatedAt: new Date() } : {}) },
  });
  logger.info("automation flow status changed", { userId: req.userId, flowId: id, status });
  return NextResponse.json({ status });
}

export async function DELETE(_request: Request, { params }: Params) {
  const req = await adminRequest("flow-delete", 20);
  if (!req.ok) return req.response;
  const { id } = await params;
  const flow = await findFlow(id);
  if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Runs and events go with it (cascade). Emails already sent stay in the
  // notification history.
  await prisma.automationFlow.delete({ where: { id } });
  logger.info("automation flow deleted", { userId: req.userId, flowId: id, name: flow.name });
  return NextResponse.json({ ok: true });
}
