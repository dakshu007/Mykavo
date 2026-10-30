import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@mykavo/database";
import { auth } from "@/lib/auth";
import { appBaseUrl } from "@/lib/app-url";
import { getWorkspacePlan } from "@/lib/billing/subscription";
import { logActivityEvent } from "@/lib/activity/record";
import { redirectPage } from "@/lib/mcp/http";
import { callbackUrl } from "@/lib/mcp/oauth-core";
import { issueCode } from "@/lib/mcp/oauth";
import { resolveAuthorize } from "@/lib/mcp/oauth-authorize";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * The consent form on /oauth/authorize posts here. The request is rebuilt
 * from the original query and re-checked from scratch; the workspace must be
 * one the signed-in person belongs to, on a plan that includes AI
 * assistants. Nothing from the form is trusted on its own.
 */
export async function POST(request: Request) {
  const base = appBaseUrl();
  // A cross-site POST must not approve anything.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(base).origin) {
    return NextResponse.json({ error: "Bad origin." }, { status: 403 });
  }

  const form = await request.formData();
  const query = typeof form.get("query") === "string" ? (form.get("query") as string) : "";
  const workspaceId = typeof form.get("workspaceId") === "string" ? (form.get("workspaceId") as string) : "";
  const decision = form.get("decision");

  const params = Object.fromEntries(new URLSearchParams(query.slice(0, 8000)));
  const state = await resolveAuthorize(params);
  if (state.kind === "fatal") return NextResponse.json({ error: state.message }, { status: 400 });
  if (state.kind === "error") return redirectPage(state.redirectTo, "the app");
  const { req, clientName, destination } = state;
  const appLabel = destination.knownApp ?? clientName;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.redirect(`${base}/login?next=${encodeURIComponent(`/oauth/authorize?${query}`)}`, 303);
  }

  if (decision !== "allow") {
    return redirectPage(
      callbackUrl(req.redirectUri, { error: "access_denied", error_description: "The person cancelled.", state: req.state, iss: base }),
      appLabel,
    );
  }

  if (!rateLimit(`oauth-approve:${session.user.id}`, { limit: 20, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  }
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    select: { id: true },
  });
  if (!member) return NextResponse.json({ error: "You're not a member of that workspace." }, { status: 403 });
  const plan = await getWorkspacePlan(workspaceId);
  if (!plan.limits.aiAssistants) {
    return NextResponse.redirect(`${base}/oauth/authorize?${query}&ws=${encodeURIComponent(workspaceId)}`, 303);
  }

  const code = await issueCode({
    clientId: req.clientId,
    workspaceId,
    userId: session.user.id,
    redirectUri: req.redirectUri,
    codeChallenge: req.codeChallenge,
  });
  logger.info("oauth connection approved", { workspaceId, userId: session.user.id, clientId: req.clientId });
  void logActivityEvent({ userId: session.user.id, workspaceId, channel: "mcp", type: "mcp_connected", label: appLabel }).catch(() => undefined);
  return redirectPage(callbackUrl(req.redirectUri, { code, state: req.state, iss: base }), appLabel);
}
