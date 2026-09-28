import { NextResponse } from "next/server";
import { prisma, isMissingTableError } from "@mykavo/database";
import { FLOW_LIMITS, emptyFlow, isFlowTrigger, parseFlowDefinition, type FlowDefinition } from "@mykavo/shared";
import { adminRequest, readJson } from "@/lib/automations-api";
import { loadSettings } from "@/lib/automations-admin";
import { isSystemFlowId, systemFlows } from "@/lib/flows/system";
import { logger } from "@/lib/logger";

/**
 * Create a flow in the Automation Tool: blank, from a built-in flow, or as a
 * copy of another flow. New flows are drafts - nothing runs until an admin
 * switches it on.
 */
export async function POST(request: Request) {
  const req = await adminRequest("flow-create", 20);
  if (!req.ok) return req.response;
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim().slice(0, FLOW_LIMITS.name) : "";
  const from = typeof body.from === "string" ? body.from : "blank";
  let trigger = isFlowTrigger(body.trigger) ? body.trigger : "signup";
  let definition: FlowDefinition = emptyFlow();
  let fallbackName = "Untitled flow";

  if (isSystemFlowId(from)) {
    const sys = systemFlows((await loadSettings()).settings).find((f) => f.id === from)!;
    definition = sys.definition;
    fallbackName = `${sys.name} (copy)`;
    // The baseline flow's trigger has no custom equivalent; a copy starts
    // on first website, the closest event a flow can listen for.
    trigger = from === "system-journey" ? "signup" : "first_website";
  } else if (from !== "blank") {
    const source = await prisma.automationFlow.findUnique({ where: { id: from } }).catch(() => null);
    if (!source) return NextResponse.json({ error: "That flow no longer exists." }, { status: 404 });
    const parsed = parseFlowDefinition(source.definition);
    if (parsed.ok) definition = parsed.flow;
    if (isFlowTrigger(source.trigger)) trigger = source.trigger;
    fallbackName = `${source.name} (copy)`;
  }

  try {
    const flow = await prisma.automationFlow.create({
      data: {
        name: name || fallbackName,
        trigger,
        status: "DRAFT",
        definition: definition as object,
        createdByEmail: req.email,
        updatedByEmail: req.email,
      },
      select: { id: true },
    });
    logger.info("automation flow created", { userId: req.userId, flowId: flow.id, from });
    return NextResponse.json({ id: flow.id });
  } catch (err) {
    if (isMissingTableError(err)) {
      return NextResponse.json({ error: "Run the automation_flow migration in Supabase first." }, { status: 503 });
    }
    throw err;
  }
}
