import { NextResponse } from "next/server";
import { getApiContext, requireRole } from "@/lib/api-auth";
import {
  SLACK_STATE_COOKIE,
  SLACK_STATE_TTL_MS,
  buildSlackAuthorizeUrl,
  newStateNonce,
  signSlackState,
  slackInstallConfigured,
} from "@/lib/integrations/slack";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Start "Add to Slack": bind this install to the signed-in user and their
 * current workspace, then hand the browser to Slack's consent screen, where
 * they pick the channel alerts should post to.
 */
export async function GET(request: Request) {
  const back = (query: string) =>
    NextResponse.redirect(new URL(`/dashboard/notifications?${query}`, request.url));

  const ctx = await getApiContext();
  if (!ctx) {
    return NextResponse.redirect(
      new URL("/login?next=%2Fdashboard%2Fnotifications", request.url),
    );
  }
  if (requireRole(ctx, "OWNER", "ADMIN", "MEMBER")) return back("slack=forbidden");

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!slackInstallConfigured() || !secret) return back("slack=unavailable");

  const rl = rateLimit(`slack-install:${ctx.userId}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) return back("slack=error");

  const nonce = newStateNonce();
  const state = signSlackState(
    {
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      nonce,
      exp: Date.now() + SLACK_STATE_TTL_MS,
    },
    secret,
  );

  logger.info("slack install started", { workspaceId: ctx.workspace.id });
  const response = NextResponse.redirect(buildSlackAuthorizeUrl(state));
  response.cookies.set(SLACK_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax: sent on Slack's top-level redirect back to us, never on
    // cross-site subrequests.
    sameSite: "lax",
    path: "/api/integrations/slack",
    maxAge: SLACK_STATE_TTL_MS / 1000,
  });
  return response;
}
