import { prisma } from "@mykavo/database";
import { appBaseUrl } from "@/lib/app-url";
import { getWorkspacePlan } from "@/lib/billing/subscription";
import { findClient } from "./oauth";
import {
  callbackUrl,
  describeRedirect,
  parseAuthorizeRequest,
  parseAuthorizeTarget,
  type AuthorizeRequest,
  type RedirectDestination,
} from "./oauth-core";

/**
 * Shared by the consent page (GET /oauth/authorize) and the form it posts
 * (/api/oauth/approve), so both apply exactly the same checks: everything
 * the browser sends is re-validated on submit.
 */

export type AuthorizeState =
  /** Can't tell which app or where to send it: show an error, never redirect. */
  | { kind: "fatal"; message: string }
  /** The app is genuine but the request is wrong: send the error back to it. */
  | { kind: "error"; redirectTo: string }
  | { kind: "ok"; req: AuthorizeRequest; clientName: string; destination: RedirectDestination };

export function mcpResourceUrl(): string {
  return `${appBaseUrl()}/api/mcp`;
}

export async function resolveAuthorize(p: Record<string, string | null | undefined>): Promise<AuthorizeState> {
  const target = parseAuthorizeTarget(p);
  if (!target.ok) return { kind: "fatal", message: target.description };
  const client = await findClient(target.value.clientId).catch(() => null);
  if (!client) return { kind: "fatal", message: "This app isn't registered with MyKavo. Remove MyKavo from the app and add it again." };
  if (!client.redirectUris.includes(target.value.redirectUri)) {
    return { kind: "fatal", message: "The app's return address doesn't match the one it registered, so MyKavo won't send it anything." };
  }
  const parsed = parseAuthorizeRequest(p, mcpResourceUrl());
  if (!parsed.ok) {
    return {
      kind: "error",
      redirectTo: callbackUrl(target.value.redirectUri, {
        error: parsed.error,
        error_description: parsed.description,
        state: p.state ?? null,
        iss: appBaseUrl(),
      }),
    };
  }
  return { kind: "ok", req: parsed.value, clientName: client.name, destination: describeRedirect(parsed.value.redirectUri) };
}

/** The query string that recreates this request (workspace switcher, login return). */
export function authorizeQuery(req: AuthorizeRequest, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: req.clientId,
    redirect_uri: req.redirectUri,
    code_challenge: req.codeChallenge,
    code_challenge_method: "S256",
    scope: req.scope,
    ...(req.state ? { state: req.state } : {}),
    ...(req.resource ? { resource: req.resource } : {}),
    ...extra,
  });
  return q.toString();
}

export interface WorkspaceChoice {
  id: string;
  name: string;
  aiAssistants: boolean;
}

/** The person's workspaces, each with whether its plan includes AI assistants. */
export async function workspaceChoices(userId: string): Promise<WorkspaceChoice[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { workspace: { select: { id: true, name: true } } },
    take: 20,
  });
  return Promise.all(
    memberships.map(async (m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      aiAssistants: (await getWorkspacePlan(m.workspace.id)).limits.aiAssistants,
    })),
  );
}
