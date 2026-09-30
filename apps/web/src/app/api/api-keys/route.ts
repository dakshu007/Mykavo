import { NextResponse } from "next/server";
import { z } from "zod";
import { isMissingTableError, prisma } from "@mykavo/database";
import { getCurrentMembership, requireSession } from "@/lib/session";
import { canManageMembers } from "@/lib/team";
import { generateApiKey } from "@/lib/mcp/api-key-format";
import { logger } from "@/lib/logger";

/** Workspace API keys for the MCP server. Owners and admins only. */

const MAX_ACTIVE_KEYS = 10;
const NOT_READY = "API keys need database migration 20260930160000_ai_search_and_api_keys. Run it in Supabase, then try again.";

async function gate() {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  return { session, workspace, allowed: canManageMembers(role) };
}

export async function GET() {
  const { workspace, allowed } = await gate();
  if (!allowed) return NextResponse.json({ error: "Only workspace owners and admins can manage API keys." }, { status: 403 });
  try {
    const keys = await prisma.apiKey.findMany({
      where: { workspaceId: workspace.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true },
    });
    return NextResponse.json({ keys });
  } catch (err) {
    if (isMissingTableError(err)) return NextResponse.json({ keys: [], notReady: NOT_READY });
    throw err;
  }
}

const CreateBody = z.object({ name: z.string().trim().min(1).max(60) });

export async function POST(request: Request) {
  const { session, workspace, allowed } = await gate();
  if (!allowed) return NextResponse.json({ error: "Only workspace owners and admins can manage API keys." }, { status: 403 });
  const parsed = CreateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Give the key a name (up to 60 characters)." }, { status: 400 });

  try {
    const active = await prisma.apiKey.count({ where: { workspaceId: workspace.id, revokedAt: null } });
    if (active >= MAX_ACTIVE_KEYS) {
      return NextResponse.json({ error: `A workspace can have ${MAX_ACTIVE_KEYS} active keys. Revoke one first.` }, { status: 400 });
    }
    const { key, hash, displayPrefix } = generateApiKey();
    const row = await prisma.apiKey.create({
      data: {
        workspaceId: workspace.id,
        name: parsed.data.name,
        keyHash: hash,
        keyPrefix: displayPrefix,
        createdByUserId: session.user.id,
      },
      select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true },
    });
    logger.info("api key created", { workspaceId: workspace.id, keyId: row.id, userId: session.user.id });
    // The only time the key itself leaves the server.
    return NextResponse.json({ key: row, secret: key }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (isMissingTableError(err)) return NextResponse.json({ error: NOT_READY }, { status: 503 });
    throw err;
  }
}
