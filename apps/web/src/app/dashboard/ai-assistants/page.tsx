import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { isMissingTableError, prisma } from "@mykavo/database";
import { getCurrentMembership, requireSession } from "@/lib/session";
import { canManageMembers } from "@/lib/team";
import { appBaseUrl } from "@/lib/app-url";
import { McpPanel, type ApiKeyView } from "@/components/dashboard/mcp-panel";

export const metadata: Metadata = {
  title: "AI assistants",
  robots: { index: false },
};

/**
 * Integrations > AI assistants: connect Claude, Cursor or any MCP client to
 * this workspace through MyKavo's read-only MCP server (app/api/mcp).
 */
export default async function AiAssistantsPage() {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  const canManage = canManageMembers(role);

  let keys: ApiKeyView[] = [];
  let notReady: string | null = null;
  if (canManage) {
    try {
      keys = (
        await prisma.apiKey.findMany({
          where: { workspaceId: workspace.id, revokedAt: null },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true },
        })
      ).map((k) => ({ ...k, createdAt: k.createdAt.toISOString(), lastUsedAt: k.lastUsedAt?.toISOString() ?? null }));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
      notReady = "API keys are almost ready - database migration 20260930160000_ai_search_and_api_keys still needs to run.";
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
            <Sparkles className="size-3" aria-hidden /> MCP server
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Ask Claude about your websites</h1>
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-white/70">
            Connect Claude, Cursor or any MCP-compatible assistant to MyKavo and ask in plain words: what changed this
            week, which site needs attention, what the latest audit says. Answers come from your real monitoring data.
          </p>
        </div>
      </section>

      <McpPanel endpoint={`${appBaseUrl()}/api/mcp`} initialKeys={keys} canManage={canManage} notReady={notReady} />
    </div>
  );
}
