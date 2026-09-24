import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext } from "@/lib/api-auth";
import { appBaseUrl } from "@/lib/app-url";
import {
  CODE_TTL_MS,
  buildReturnUrl,
  newConnectCode,
  parseConnectRequest,
  sha256Hex,
} from "@/lib/integrations/site-connection";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  return typeof value === "string" ? value : null;
}

/**
 * The consent form on /connect/wordpress posts here. Everything the page
 * showed is re-validated - hidden inputs are client-controlled - and the
 * member must be allowed to act on the chosen website. On success, a one-time
 * code (stored only as a hash) goes back to the site's wp-admin.
 */
export async function POST(request: Request) {
  // A cross-site POST must not approve anything. Better Auth's Lax cookie
  // already keeps the session off such a request; this makes it explicit.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(appBaseUrl()).origin) {
    return NextResponse.json({ error: "Bad origin." }, { status: 403 });
  }

  const ctx = await getApiContext();
  if (!ctx) {
    return NextResponse.redirect(`${appBaseUrl()}/login`, 303);
  }
  if (ctx.role === "VIEWER") {
    return NextResponse.json({ error: "Viewers can't connect sites." }, { status: 403 });
  }

  const rl = rateLimit(`wp-approve:${ctx.userId}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  }

  const form = await request.formData();
  const check = parseConnectRequest({
    site: field(form, "site"),
    return: field(form, "return"),
    state: field(form, "state"),
    challenge: field(form, "challenge"),
    name: field(form, "name"),
    pv: field(form, "pv"),
    wpv: field(form, "wpv"),
  });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  const req = check.value;

  const websiteId = field(form, "websiteId") ?? "";
  const website = await prisma.website.findFirst({
    where: { id: websiteId, workspaceId: ctx.workspace.id },
    select: { id: true },
  });
  if (!website) {
    return NextResponse.json({ error: "Choose one of your websites." }, { status: 400 });
  }

  const now = new Date();
  // Tidy abandoned handshakes for this website before starting another.
  await prisma.siteConnection.deleteMany({
    where: { websiteId: website.id, tokenHash: null, codeExpiresAt: { lt: now } },
  });

  const code = newConnectCode();
  await prisma.siteConnection.create({
    data: {
      workspaceId: ctx.workspace.id,
      websiteId: website.id,
      platform: "wordpress",
      siteUrl: req.siteUrl,
      siteName: req.siteName,
      createdByUserId: ctx.userId,
      codeHash: sha256Hex(code),
      codeChallenge: req.challenge,
      codeExpiresAt: new Date(now.getTime() + CODE_TTL_MS),
      pluginVersion: req.pluginVersion,
      platformVersion: req.platformVersion,
    },
  });

  logger.info("wordpress connection approved", {
    workspaceId: ctx.workspace.id,
    websiteId: website.id,
  });
  // 303: the browser follows with a GET to the site's own wp-admin.
  return NextResponse.redirect(buildReturnUrl(req.returnUrl, code, req.state), 303);
}
