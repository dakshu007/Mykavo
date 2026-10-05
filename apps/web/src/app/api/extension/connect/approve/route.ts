import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext } from "@/lib/api-auth";
import { appBaseUrl } from "@/lib/app-url";
import { logActivityEvent } from "@/lib/activity/record";
import { recordExtensionMilestone } from "@/lib/extension-tracking";
import { CODE_TTL_MS, newConnectCode, sha256Hex } from "@/lib/integrations/site-connection";
import {
  EXTENSION_PLATFORM,
  connectQuery,
  parseExtensionConnectRequest,
  type ConnectErrorCode,
} from "@/lib/integrations/extension-connect";
import { rateLimit } from "@/lib/security/rate-limit";
import { createWebsite } from "@/lib/website-create";
import { logger } from "@/lib/logger";

function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  return typeof value === "string" ? value : null;
}

/** A recently created account: the extension flow is what signed them up. */
const NEW_ACCOUNT_MS = 60 * 60 * 1000;

/**
 * The consent form on /connect/chrome posts here. Everything is re-validated
 * (hidden inputs are client-controlled), the website is created through the
 * same path as the dashboard's Add website (SSRF check, plan limit), and the
 * workspace always comes from the session - never from the request. On
 * success a one-time code (stored only as a hash) is handed to the extension
 * on /connect/chrome/done.
 */
export async function POST(request: Request) {
  const base = appBaseUrl();
  // A cross-site POST must not approve anything. Better Auth's Lax cookie
  // already keeps the session off such a request; this makes it explicit.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(base).origin) {
    return NextResponse.json({ error: "Bad origin." }, { status: 403 });
  }

  const form = await request.formData();
  const check = parseExtensionConnectRequest({
    site: field(form, "site"),
    page: field(form, "page"),
    state: field(form, "state"),
    challenge: field(form, "challenge"),
    v: field(form, "v"),
    install: field(form, "install"),
  });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  const req = check.value;
  const back = (error: ConnectErrorCode) =>
    NextResponse.redirect(`${base}/connect/chrome?${connectQuery(req)}&error=${error}`, 303);

  const ctx = await getApiContext();
  if (!ctx) {
    return NextResponse.redirect(
      `${base}/login?next=${encodeURIComponent(`/connect/chrome?${connectQuery(req)}`)}`,
      303,
    );
  }
  if (ctx.role === "VIEWER") {
    return NextResponse.json({ error: "Viewers can't connect websites." }, { status: 403 });
  }
  const rl = rateLimit(`ext-approve:${ctx.userId}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  }

  let websiteId: string;
  let created = false;
  if (field(form, "create") === "1") {
    // Same per-workspace cap as the dashboard: creation resolves DNS.
    const createRl = rateLimit(`website-create:${ctx.workspace.id}`, { limit: 20, windowMs: 60_000 });
    if (!createRl.allowed) return back("failed");
    const result = await createWebsite(ctx.workspace.id, { url: req.siteUrl });
    if (result.ok) {
      websiteId = result.website.id;
      created = true;
    } else if (result.reason === "EXISTS") {
      websiteId = result.website.id;
    } else {
      return back(result.reason === "LIMIT" ? "limit" : result.reason === "DNS" ? "dns" : "unsafe");
    }
  } else {
    const website = await prisma.website.findFirst({
      where: { id: field(form, "websiteId") ?? "", workspaceId: ctx.workspace.id },
      select: { id: true },
    });
    if (!website) return back("invalid");
    websiteId = website.id;
  }

  const now = new Date();
  // Tidy abandoned handshakes for this website before starting another.
  await prisma.siteConnection.deleteMany({
    where: { websiteId, tokenHash: null, codeExpiresAt: { lt: now } },
  });

  const code = newConnectCode();
  try {
    await prisma.siteConnection.create({
      data: {
        workspaceId: ctx.workspace.id,
        websiteId,
        platform: EXTENSION_PLATFORM,
        siteUrl: req.siteUrl,
        createdByUserId: ctx.userId,
        codeHash: sha256Hex(code),
        codeChallenge: req.challenge,
        codeExpiresAt: new Date(now.getTime() + CODE_TTL_MS),
        pluginVersion: req.extensionVersion,
      },
    });
  } catch (err) {
    logger.error("extension connection could not be created", { workspaceId: ctx.workspace.id, websiteId }, err);
    return back("failed");
  }

  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { createdAt: true } });
  const existingUser = !user || now.getTime() - user.createdAt.getTime() > NEW_ACCOUNT_MS;
  void recordExtensionMilestone(req.installId, { kind: "connected", userId: ctx.userId, existingUser });
  void logActivityEvent({
    userId: ctx.userId,
    workspaceId: ctx.workspace.id,
    channel: "chrome",
    type: "extension_site_connected",
    label: req.siteHost,
    meta: { websiteId, created, existingUser, version: req.extensionVersion },
  });
  logger.info("extension connection approved", { workspaceId: ctx.workspace.id, websiteId, created });

  const done = new URLSearchParams({ code, state: req.state, w: websiteId });
  if (req.pageUrl) done.set("page", req.pageUrl);
  return NextResponse.redirect(`${base}/connect/chrome/done?${done.toString()}`, 303);
}
