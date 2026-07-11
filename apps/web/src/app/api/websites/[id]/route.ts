import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@fluxen/database";
import { getApiContext, getOwnedWebsite, requireRole } from "@/lib/api-auth";
import { getWorkspacePlan } from "@/lib/limits";
import { logger } from "@/lib/logger";
import { parseTags } from "@/lib/tags";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const website = await prisma.website.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: { monitoredPages: { orderBy: { createdAt: "asc" } } },
  });
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ website });
}

// Stabilization selector lists (spec §25/§36): trimmed, non-empty CSS
// selectors, max 20 per list × 200 chars. Braces/newlines are rejected —
// they indicate pasted CSS rules, not selectors. Full syntax validation
// happens in the browser at scan time (invalid selectors are skipped).
const selectorListSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(200)
      .refine((s) => !/[{}\r\n]/.test(s), "Not a valid CSS selector."),
  )
  .max(20);

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  scanFrequency: z.enum(["WEEKLY", "DAILY"]).optional(),
  paused: z.boolean().optional(),
  // Maintenance window (spec §25): mute alerts for N hours; null = unmute.
  muteHours: z.union([z.literal(1), z.literal(8), z.literal(24)]).nullable().optional(),
  // Public status badge; enabling mints a token once, disabling keeps it.
  badgeEnabled: z.boolean().optional(),
  // Public status page; shares the badge token under the same minting rule.
  statusPageEnabled: z.boolean().optional(),
  // Comparison settings (spec §25/§36): [] clears a list; omitted = unchanged.
  ignoredSelectors: selectorListSchema.optional(),
  screenshotMasks: selectorListSchema.optional(),
  // Organization tags: [] clears; omitted = unchanged. Entries are
  // re-normalized + deduped + capped server-side (parseTags) — the generous
  // input bounds here only stop obviously abusive payloads.
  tags: z.array(z.string().max(100)).max(25).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  const { id } = await params;
  const website = await getOwnedWebsite(ctx, id);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let input: z.infer<typeof patchSchema>;
  try {
    input = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Scan frequency is plan-gated: Free = weekly only (spec §37).
  if (input.scanFrequency === "DAILY") {
    const plan = await getWorkspacePlan(ctx.workspace.id);
    if (plan.limits.scanFrequency !== "DAILY") {
      return NextResponse.json(
        { error: `Daily scans require a paid plan. Your ${plan.name} plan scans weekly.` },
        { status: 403 },
      );
    }
  }

  const updated = await prisma.website.update({
    where: { id: website.id },
    data: {
      name: input.name,
      scanFrequency: input.scanFrequency,
      status:
        input.paused === undefined
          ? undefined
          : input.paused
            ? "PAUSED"
            : "PENDING",
      muteAlertsUntil:
        input.muteHours === undefined
          ? undefined
          : input.muteHours === null
            ? null
            : new Date(Date.now() + input.muteHours * 60 * 60 * 1000),
      badgeEnabled: input.badgeEnabled,
      statusPageEnabled: input.statusPageEnabled,
      // The public URL identifier shared by the badge and the status page —
      // opaque, never the website id (spec §59). Whichever feature is
      // enabled first mints it; disabling keeps it so URLs stay stable.
      publicToken:
        (input.badgeEnabled === true || input.statusPageEnabled === true) &&
        !website.publicToken
          ? randomBytes(18).toString("base64url")
          : undefined,
      ignoredSelectors: input.ignoredSelectors,
      screenshotMasks: input.screenshotMasks,
      // Never trust client normalization — canonical form is enforced here.
      tags: input.tags === undefined ? undefined : parseTags(input.tags),
    },
  });

  return NextResponse.json({ website: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  const { id } = await params;
  const website = await getOwnedWebsite(ctx, id);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.website.delete({ where: { id: website.id } });
  logger.info("website deleted", {
    workspaceId: ctx.workspace.id,
    websiteId: website.id,
  });
  return NextResponse.json({ ok: true });
}
