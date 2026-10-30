import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { isMissingTableError, prisma } from "@mykavo/database";
import { getCurrentMembership, requireSession } from "@/lib/session";
import { canManageMembers } from "@/lib/team";
import { appBaseUrl } from "@/lib/app-url";
import { getWorkspacePlan } from "@/lib/billing/subscription";
import { mcpUsageSummary } from "@/lib/mcp/usage";
import { describeRedirect } from "@/lib/mcp/oauth-core";
import {
  McpPanel,
  type ApiKeyView,
  type ConnectionView,
  type McpUsageView,
} from "@/components/dashboard/mcp-panel";

export const metadata: Metadata = {
  title: "AI assistants",
  robots: { index: false },
};

const NOT_READY = "AI assistant connections are almost ready - database migration 20261030120000_mcp_oauth still needs to run.";

/** The app's name as people know it: Claude or ChatGPT when we recognise its callback. */
function appName(clientName: string, redirectUris: string[]): string {
  for (const uri of redirectUris) {
    try {
      const known = describeRedirect(uri).knownApp;
      if (known) return known;
    } catch {
      // Unparseable URI: fall back to the registered name.
    }
  }
  return clientName;
}

/**
 * Integrations > AI assistants: connect ChatGPT, Claude, Cursor or any MCP
 * client to this workspace through MyKavo's read-only MCP server
 * (app/api/mcp). Pro and Agency only.
 */
export default async function AiAssistantsPage() {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  const canManage = canManageMembers(role);
  const plan = await getWorkspacePlan(workspace.id);
  const allowed = plan.limits.aiAssistants;

  let keys: ApiKeyView[] = [];
  let connections: ConnectionView[] = [];
  let usage: McpUsageView | null = null;
  let notReady: string | null = null;
  if (allowed) {
    if (canManage) {
      keys = (
        await prisma.apiKey.findMany({
          where: { workspaceId: workspace.id, revokedAt: null },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true },
        })
      ).map((k) => ({ ...k, createdAt: k.createdAt.toISOString(), lastUsedAt: k.lastUsedAt?.toISOString() ?? null }));
    }
    try {
      const grants = await prisma.oAuthGrant.findMany({
        // Members see their own connections; owners and admins see everyone's.
        where: { workspaceId: workspace.id, revokedAt: null, ...(canManage ? {} : { userId: session.user.id }) },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          userId: true,
          createdAt: true,
          lastUsedAt: true,
          user: { select: { name: true, email: true } },
          client: { select: { name: true, redirectUris: true } },
        },
      });
      connections = grants.map((g) => ({
        id: g.id,
        appName: appName(g.client.name, g.client.redirectUris),
        connectedBy: g.user.name || g.user.email,
        mine: g.userId === session.user.id,
        createdAt: g.createdAt.toISOString(),
        lastUsedAt: g.lastUsedAt?.toISOString() ?? null,
      }));
      const summary = await mcpUsageSummary(workspace.id);
      if (summary) {
        const cap = plan.limits.aiAssistantCallsPerDay;
        usage = { ...summary, dailyCap: Number.isFinite(cap) ? cap : null };
      }
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
      notReady = NOT_READY;
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <section className="relative overflow-hidden rounded-card bg-[#0f1115] p-6 text-white shadow-card sm:p-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_left,black,transparent_70%)]"
          aria-hidden
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-contrast">
            <Sparkles className="size-3" aria-hidden /> ChatGPT · Claude · MCP
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Ask ChatGPT and Claude about your websites</h1>
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-white/70">
            Add MyKavo to ChatGPT, Claude, Cursor or any MCP-compatible assistant and ask in plain words: what changed this
            week, which site needs attention, what the latest audit says. Answers come from your real monitoring data.
          </p>
        </div>
      </section>

      <McpPanel
        endpoint={`${appBaseUrl()}/api/mcp`}
        allowed={allowed}
        planName={plan.name}
        initialKeys={keys}
        initialConnections={connections}
        usage={usage}
        canManage={canManage}
        notReady={notReady}
      />
    </div>
  );
}
