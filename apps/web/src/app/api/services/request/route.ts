import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { sendEmail } from "@mykavo/email";
import { site } from "@/config/site";
import { getApiContext, type ApiContext } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import {
  SERVICES_INBOX,
  buildChangePrefill,
  buildServiceRequestEmail,
  firstIssueMessage,
  isChangeId,
  serviceRequestSchema,
} from "@/lib/services/request";

/**
 * MyKavo Services request endpoint.
 *
 * POST is public (site owners without an account can ask for a fix), so it
 * carries the usual public-form defences: a per-IP rate limit, strict
 * validation with hard length caps, and a honeypot answered with a silent
 * 200. When the requester is signed in, their user and workspace are taken
 * from the session, never from the body, and a change reference is kept
 * only if that change belongs to their current workspace.
 *
 * GET returns the prefill for a change (website address and a short
 * description) to its signed-in owner, so the dashboard's "Need help fixing
 * this?" link can open a ready-to-send form.
 *
 * The saved row is the source of truth. The notification email is a
 * courtesy on top: if it fails, the request is still saved and the sender is
 * still told it arrived, because it did.
 */

const POST_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 };
const GET_LIMIT = { limit: 30, windowMs: 60 * 1000 };

const GENERIC_ERROR = "Something went wrong. Please try again, or email support@mykavo.app.";

/** Session lookup that never blocks a public submission. */
async function optionalContext(): Promise<ApiContext | null> {
  try {
    return await getApiContext();
  } catch (err) {
    logger.warn("services: session lookup failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

function findChangeForWorkspace(changeId: string, workspaceId: string) {
  return prisma.changeEvent.findFirst({
    where: { id: changeId, website: { workspaceId } },
    select: {
      id: true,
      title: true,
      severity: true,
      detectedAt: true,
      website: { select: { url: true } },
      monitoredPage: { select: { url: true } },
    },
  });
}

export async function GET(request: Request) {
  const limit = rateLimit(`services-prefill:${clientKey(request)}`, GET_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const changeId = new URL(request.url).searchParams.get("change");
  if (!isChangeId(changeId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ctx = await optionalContext();
  if (!ctx) {
    return NextResponse.json({ error: "Sign in to attach this change." }, { status: 401 });
  }

  const change = await findChangeForWorkspace(changeId, ctx.workspace.id);
  // Same answer for "does not exist" and "not yours": ids are not an oracle.
  if (!change) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const prefill = buildChangePrefill({
    id: change.id,
    title: change.title,
    severity: change.severity,
    detectedAt: change.detectedAt,
    websiteUrl: change.website.url,
    pageUrl: change.monitoredPage?.url ?? null,
  });

  return NextResponse.json(
    { ...prefill, email: ctx.userEmail },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const limit = rateLimit(`services-request:${clientKey(request)}`, POST_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many requests from this connection. Please try again later, or email support@mykavo.app.",
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }

  const parsed = serviceRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }
  const data = parsed.data;

  // A filled honeypot is a bot: answer like a success, store nothing.
  if (data.company_website_url) {
    logger.info("services: honeypot triggered");
    return NextResponse.json({ ok: true });
  }

  const ctx = await optionalContext();

  let changeEventId: string | null = null;
  if (data.changeEventId && ctx) {
    try {
      const change = await findChangeForWorkspace(data.changeEventId, ctx.workspace.id);
      changeEventId = change?.id ?? null;
    } catch (err) {
      // The request still matters without the link to the change.
      logger.warn("services: change lookup failed", {
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  let requestId: string;
  try {
    const row = await prisma.serviceRequest.create({
      data: {
        name: data.name,
        email: data.email,
        websiteUrl: data.websiteUrl,
        platform: data.platform ?? null,
        urgency: data.urgency,
        kind: data.kind,
        message: data.message,
        changeEventId,
        userId: ctx?.userId ?? null,
        workspaceId: ctx?.workspace.id ?? null,
      },
      select: { id: true },
    });
    requestId = row.id;
  } catch (err) {
    logger.error(
      "services: could not save request",
      { kind: data.kind },
      err,
    );
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }

  const email = buildServiceRequestEmail(data, {
    requestId,
    changeUrl: changeEventId ? `${site.url}/dashboard/changes/${changeEventId}` : null,
    workspaceName: ctx?.workspace.name ?? null,
  });

  try {
    const result = await sendEmail({
      to: [SERVICES_INBOX],
      subject: email.subject,
      html: email.html,
      text: email.text,
      // The email address passed the schema's email check, so it carries no
      // line breaks and cannot inject a header.
      headers: { "Reply-To": data.email },
    });
    if (!result.ok) {
      logger.error("services: notification email failed", {
        requestId,
        provider: result.provider,
        error: result.error ?? "unknown",
      });
    }
  } catch (err) {
    logger.error("services: notification email threw", { requestId }, err);
  }

  logger.info("services: request saved", {
    requestId,
    kind: data.kind,
    urgency: data.urgency,
    linkedChange: changeEventId !== null,
    signedIn: ctx !== null,
  });

  return NextResponse.json({ ok: true });
}
