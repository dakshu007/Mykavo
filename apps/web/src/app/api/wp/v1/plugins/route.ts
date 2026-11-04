import { NextResponse } from "next/server";
import { isMissingTableError, prisma, type Prisma } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { dedupePlugins, diffInventory, flaggedPlugins, pluginInventorySchema } from "@/lib/integrations/wp-plugins";
import { getWorkspacePlan } from "@/lib/limits";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/** A verdict another site's row already has is reused for this long. */
const SHARED_VERDICT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Plugin Health: the plugin's daily upload of the site's installed plugins.
 * The inventory is stored on every plan (so turning the feature on later
 * has data at once); the answer lists closed or abandoned plugins only when
 * the plan includes Plugin Health.
 *
 *   POST { plugins: [{ slug, name, version, active }] } ->
 *   { allowed, flagged: [{ slug, name, status, lastUpdated, reason }] }
 *
 * Plugins no longer in the upload are removed. A plugin new to this site
 * takes the WordPress.org verdict another site already has for the same
 * slug, so it does not wait for the weekly sweep.
 */
export async function POST(request: Request) {
  const ctx = await authenticateSiteRequest(request, { automated: true });
  if (!ctx) return unauthorizedSite();
  if (ctx.platform !== "wordpress") {
    return NextResponse.json({ error: "Not available for this connection." }, { status: 404 });
  }

  const rl = rateLimit(`wp-plugins:${ctx.connectionId}`, { limit: 10, windowMs: 60 * 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many uploads." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  const text = await request.text().catch(() => "");
  if (text.length > 256 * 1024) return NextResponse.json({ error: "Upload too large." }, { status: 413 });
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    // handled below
  }
  const parsed = pluginInventorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid plugin list." }, { status: 400 });

  const websiteId = ctx.website.id;
  const uploaded = dedupePlugins(parsed.data.plugins);

  try {
    const existing = await prisma.wpPluginInventory.findMany({
      where: { websiteId },
      select: { slug: true, name: true, version: true, active: true },
    });
    const diff = diffInventory(existing, uploaded);

    // Verdicts other sites already have for the new slugs.
    const known =
      diff.create.length > 0
        ? await prisma.wpPluginInventory.findMany({
            where: {
              slug: { in: diff.create.map((p) => p.slug) },
              websiteId: { not: websiteId },
              checkedAt: { gte: new Date(Date.now() - SHARED_VERDICT_MAX_AGE_MS) },
            },
            orderBy: { checkedAt: "desc" },
            distinct: ["slug"],
            select: { slug: true, wporgStatus: true, lastUpdated: true, reason: true, checkedAt: true },
          })
        : [];
    const verdictBySlug = new Map(known.map((k) => [k.slug, k]));

    const writes: Prisma.PrismaPromise<unknown>[] = [];
    if (diff.remove.length > 0) {
      writes.push(prisma.wpPluginInventory.deleteMany({ where: { websiteId, slug: { in: diff.remove } } }));
    }
    if (diff.create.length > 0) {
      writes.push(
        prisma.wpPluginInventory.createMany({
          data: diff.create.map((p) => {
            const v = verdictBySlug.get(p.slug);
            return {
              websiteId,
              ...p,
              ...(v
                ? { wporgStatus: v.wporgStatus, lastUpdated: v.lastUpdated, reason: v.reason, checkedAt: v.checkedAt }
                : {}),
            };
          }),
          skipDuplicates: true,
        }),
      );
    }
    for (const p of diff.update) {
      writes.push(
        prisma.wpPluginInventory.update({
          where: { websiteId_slug: { websiteId, slug: p.slug } },
          data: { name: p.name, version: p.version, active: p.active },
        }),
      );
    }
    if (writes.length > 0) await prisma.$transaction(writes);

    const plan = await getWorkspacePlan(ctx.workspaceId);
    const allowed = plan.limits.wpPluginHealth;
    const rows = allowed
      ? await prisma.wpPluginInventory.findMany({
          where: { websiteId, wporgStatus: { in: ["closed", "outdated"] } },
          select: { slug: true, name: true, wporgStatus: true, lastUpdated: true, reason: true },
        })
      : [];

    logger.info("wordpress plugin inventory stored", {
      workspaceId: ctx.workspaceId,
      websiteId,
      plugins: uploaded.length,
      created: diff.create.length,
      updated: diff.update.length,
      removed: diff.remove.length,
    });
    return NextResponse.json({ allowed, flagged: flaggedPlugins(rows) });
  } catch (err) {
    if (isMissingTableError(err)) {
      // The migration has not run yet; the plugin tries again tomorrow.
      return NextResponse.json({ error: "Not ready yet." }, { status: 503 });
    }
    logger.error("could not store the plugin inventory", { workspaceId: ctx.workspaceId, websiteId }, err);
    return NextResponse.json({ error: "Could not store the plugin list." }, { status: 500 });
  }
}
