import { isMissingTableError, prisma } from "@mykavo/database";
import { bearerKey, hashApiKey } from "./api-key-format";

export interface ApiKeyContext {
  keyId: string;
  workspaceId: string;
  workspaceName: string;
}

/** lastUsedAt is informational - write it at most this often. */
const LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1000;

/**
 * The workspace a request's API key belongs to, or null (missing, unknown,
 * revoked). A database without the api_key table yet answers null - the
 * MCP endpoint then just refuses, it never errors.
 */
export async function authenticateApiKey(request: Request): Promise<ApiKeyContext | null> {
  const key = bearerKey(request.headers.get("authorization"));
  if (!key) return null;
  const row = await prisma.apiKey
    .findUnique({
      where: { keyHash: hashApiKey(key) },
      select: { id: true, revokedAt: true, lastUsedAt: true, workspace: { select: { id: true, name: true } } },
    })
    .catch((err: unknown) => {
      if (isMissingTableError(err)) return null;
      throw err;
    });
  if (!row || row.revokedAt) return null;

  const now = Date.now();
  if (!row.lastUsedAt || now - row.lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS) {
    void prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date(now) } }).catch(() => undefined);
  }
  return { keyId: row.id, workspaceId: row.workspace.id, workspaceName: row.workspace.name };
}
