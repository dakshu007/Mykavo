import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { getWorkspacePlan, assertScanAllowed, LimitError } from "@/lib/limits";
import { rateLimit } from "@/lib/security/rate-limit";
import { enqueueScanWebsite } from "@/lib/queue";
import { logger } from "@/lib/logger";

/**
 * Post-deploy verification hook (Pro). CI, a Netlify/Vercel deploy
 * notification, or a WordPress update routine POSTs here after a release;
 * MyKavo scans the website immediately, compares against the approved
 * baseline, and sends a verdict notification - "Deploy verified" when clean.
 *
 * Unauthenticated by design: the unguessable per-website deployToken IS the
 * credential (same model as the badge/report tokens). Regenerating the token
 * revokes every previously configured pipeline. Everything else is defense
 * in depth: per-website rate limit, per-plan daily quota shared with manual
 * scans, the workspace concurrency cap, and the advisory-lock duplicate
 * guard the manual-scan route uses.
 */

type Params = { params: Promise<{ token: string }> };

const bodySchema = z.object({
  // Optional release label ("v2.4.1", "plugin updates 2026-08-02") - shown in
  // scan history and the verdict notification.
  note: z.string().trim().min(1).max(140).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;

  const website = await prisma.website.findFirst({
    where: { deployToken: token, deployHookEnabled: true },
    select: { id: true, workspaceId: true, status: true },
  });
  // Same response for unknown token and disabled hook - no token probing.
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Burst guard: deploys are occasional; anything faster is a broken loop.
  const rl = rateLimit(`deploy-hook:${website.id}`, { limit: 6, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many deploy checks. Please wait a moment and try again." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  // Optional JSON body; a bare POST (curl without a body) is fine.
  let note: string | undefined;
  const raw = await request.text();
  if (raw.trim().length > 0) {
    try {
      note = bodySchema.parse(JSON.parse(raw)).note;
    } catch {
      return NextResponse.json(
        { error: 'Invalid body. Send nothing, or JSON like {"note":"v2.4.1"}.' },
        { status: 400 },
      );
    }
  }

  // Deploy checks are effectively on-demand scans - Pro only (spec §39),
  // sharing the manual-scan daily quota and concurrency caps.
  const plan = await getWorkspacePlan(website.workspaceId);
  if (!plan.limits.deployChecks) {
    return NextResponse.json(
      { error: "Deploy checks are a Pro feature. Upgrade to verify deploys automatically." },
      { status: 403 },
    );
  }
  try {
    await assertScanAllowed(website.workspaceId, plan, "MANUAL");
  } catch (err) {
    if (err instanceof LimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  // A deploy check needs a baseline to compare against.
  const hasFinishedScan = await prisma.scan.findFirst({
    where: { websiteId: website.id, status: { in: ["COMPLETED", "PARTIAL"] } },
    select: { id: true },
  });
  if (!hasFinishedScan) {
    return NextResponse.json(
      { error: "Run a baseline scan in the dashboard before using deploy checks." },
      { status: 409 },
    );
  }

  // Authoritative no-duplicate-scan guard (spec §40) - identical to the
  // manual-scan route so hook and dashboard triggers can never race.
  const created = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${website.id})::int8)`;
    const conflict = await tx.scan.findFirst({
      where: { websiteId: website.id, status: { in: ["QUEUED", "RUNNING"] } },
      select: { id: true },
    });
    if (conflict) return { conflictScanId: conflict.id };
    const scan = await tx.scan.create({
      data: { websiteId: website.id, triggerType: "DEPLOY", status: "QUEUED", note },
    });
    return { scan };
  });
  if ("conflictScanId" in created) {
    return NextResponse.json(
      { error: "A scan is already in progress for this website.", scanId: created.conflictScanId },
      { status: 409 },
    );
  }
  const scan = created.scan;

  try {
    await enqueueScanWebsite({ scanId: scan.id });
  } catch (err) {
    await prisma.scan.update({
      where: { id: scan.id },
      data: { status: "FAILED", errorCode: "ENQUEUE_FAILED" },
    });
    logger.error("failed to enqueue deploy check", { scanId: scan.id, websiteId: website.id }, err);
    return NextResponse.json(
      { error: "Could not queue the deploy check. Please try again." },
      { status: 500 },
    );
  }

  logger.info("deploy check queued", {
    scanId: scan.id,
    websiteId: website.id,
    workspaceId: website.workspaceId,
    ...(note ? { note } : {}),
  });
  // 202: accepted for async processing - the verdict arrives by notification.
  return NextResponse.json({ scanId: scan.id, status: "QUEUED" }, { status: 202 });
}
