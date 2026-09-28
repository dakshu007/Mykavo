import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { loadSettings } from "@/lib/automations-admin";
import { builtinEmailOptions, builtinStepStats, flowsReady, getFlow } from "@/lib/flows/server";
import { isSystemFlowId, systemFlows } from "@/lib/flows/system";
import { FlowBuilder } from "@/components/flows/flow-builder";

export const metadata: Metadata = {
  title: "Flow - Automation Tool",
  robots: { index: false },
};

/** The flow builder canvas. Built-in flows open read-only. Operator only. */
export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user.email)) notFound();
  const { id } = await params;
  const emails = builtinEmailOptions();

  if (isSystemFlowId(id)) {
    const [{ settings }, canCopy] = await Promise.all([loadSettings(), flowsReady()]);
    const flow = systemFlows(settings).find((f) => f.id === id)!;
    return (
      <FlowBuilder
        key={id}
        mode="system"
        flowId={id}
        name={flow.name}
        status="BUILTIN"
        trigger="signup"
        triggerLabel={flow.triggerLabel}
        definition={flow.definition}
        emails={emails}
        stats={await builtinStepStats(flow)}
        runs={null}
        activity={[]}
        updatedAt={null}
        ready={canCopy}
      />
    );
  }

  const flow = await getFlow(id);
  if (!flow) notFound();
  return (
    <FlowBuilder
      key={flow.id}
      mode="edit"
      flowId={flow.id}
      name={flow.name}
      status={flow.status}
      trigger={flow.trigger}
      definition={flow.definition}
      emails={emails}
      stats={flow.stepStats}
      runs={flow.runs}
      activity={flow.activity}
      updatedAt={flow.updatedAt}
      ready
    />
  );
}
