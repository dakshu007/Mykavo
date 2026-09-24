import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@mykavo/database";
import { dispatchChannelMessage, validateChannelUrl } from "@mykavo/shared";
import { getApiContext } from "@/lib/api-auth";
import { appBaseUrl } from "@/lib/app-url";
import {
  SLACK_STATE_COOKIE,
  SlackExchangeError,
  exchangeSlackCode,
  slackInstallConfigured,
  verifySlackState,
} from "@/lib/integrations/slack";
import { MAX_CHANNELS_PER_WORKSPACE } from "@/lib/notification-channels";
import { assertSafeUrl } from "@/lib/security/ssrf";
import { logger } from "@/lib/logger";

/**
 * Slack sends the browser back here after the consent screen. Verify the
 * install is the one this browser started, for the workspace it started in,
 * then store the channel's webhook as the workspace's Slack alert channel -
 * replacing any earlier Slack channel, since re-adding is how someone moves
 * alerts to a different channel.
 *
 * The webhook URL is a secret (anyone holding it can post to the channel):
 * it is never logged, and never returned to the browser.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  // Always back to the canonical site: on Netlify, request.url can carry the
  // per-deploy hostname, where the visitor has no session and lands on a
  // login page that rejects the origin.
  const done = (result: string) => {
    const response = NextResponse.redirect(
      `${appBaseUrl()}/dashboard/notifications?slack=${result}`,
    );
    response.cookies.delete({ name: SLACK_STATE_COOKIE, path: "/api/integrations/slack" });
    return response;
  };

  // The customer pressed Cancel on Slack's screen.
  if (url.searchParams.get("error")) return done("cancelled");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!code || !state || !secret || !slackInstallConfigured()) return done("error");

  const cookieNonce = (await cookies()).get(SLACK_STATE_COOKIE)?.value;
  const check = verifySlackState(state, cookieNonce, secret);
  if (!check.ok) {
    logger.warn("slack install state rejected", { reason: check.reason });
    return done(check.reason === "expired" ? "expired" : "error");
  }

  // The same person, still in the same workspace, must be finishing it.
  const ctx = await getApiContext();
  if (
    !ctx ||
    ctx.userId !== check.payload.userId ||
    ctx.workspace.id !== check.payload.workspaceId
  ) {
    logger.warn("slack install finished by a different session", {
      workspaceId: check.payload.workspaceId,
    });
    return done("error");
  }
  const workspaceId = ctx.workspace.id;

  let install;
  try {
    install = await exchangeSlackCode(code);
  } catch (err) {
    logger.error("slack oauth exchange failed", {
      workspaceId,
      code: err instanceof SlackExchangeError ? err.code : "network",
    });
    return done("error");
  }

  // Slack's answer is still an outbound fetch target: same checks as a
  // pasted URL.
  const shape = validateChannelUrl("SLACK", install.webhookUrl);
  if (!shape.ok) {
    logger.error("slack returned an unexpected webhook host", { workspaceId });
    return done("error");
  }
  try {
    await assertSafeUrl(install.webhookUrl);
  } catch {
    return done("error");
  }

  const configuration = {
    webhookUrl: install.webhookUrl,
    channelName: install.channelName,
    teamName: install.teamName,
    source: "oauth",
  };

  const existing = await prisma.notificationChannel.findUnique({
    where: { workspaceId_type: { workspaceId, type: "SLACK" } },
    select: { id: true },
  });
  if (!existing) {
    const count = await prisma.notificationChannel.count({ where: { workspaceId } });
    if (count >= MAX_CHANNELS_PER_WORKSPACE) return done("limit");
  }

  const channel = await prisma.notificationChannel.upsert({
    where: { workspaceId_type: { workspaceId, type: "SLACK" } },
    create: { workspaceId, type: "SLACK", enabled: true, configuration },
    update: { enabled: true, configuration },
  });

  // Say hello in the channel so the customer sees it working immediately.
  // Best effort: the channel is saved either way, and "Send test" exists.
  const appUrl = appBaseUrl();
  const hello = await dispatchChannelMessage(channel, {
    title: "MyKavo is connected",
    lines: [
      `Alerts for "${ctx.workspace.name}" will post in this channel.`,
      "You'll get grouped change summaries and failure alerts - not one message per change.",
    ],
    url: `${appUrl}/dashboard/notifications`,
    severity: "INFO",
  });

  logger.info("slack channel connected", {
    workspaceId,
    channelId: channel.id,
    replaced: Boolean(existing),
    helloSent: hello.ok,
  });
  return done("connected");
}
