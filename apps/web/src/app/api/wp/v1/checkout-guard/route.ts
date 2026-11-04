import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { checkoutGuardSchema, planCheckoutGuard } from "@/lib/integrations/wp-checkout-guard";
import { assertPageLimit, getWorkspacePlan, LimitError } from "@/lib/limits";
import { MAX_ELEMENTS_PER_PAGE } from "@/lib/monitored-elements";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * WooCommerce checkout guard (Pro, Agency): monitor the store's checkout,
 * cart and a product page, each with the button that takes the money.
 *
 *   POST { cartUrl?, checkoutUrl?, productUrl? } -> { pages, elements }
 *
 * `pages` is how many of the named pages are now monitored and `elements`
 * how many guard buttons they carry, whether added now or on an earlier
 * call: repeating the call adds nothing. Pages count against the plan's page
 * limit like any other; a page already holding the per-page maximum of
 * elements keeps what it has.
 */
export async function POST(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();
  if (ctx.platform !== "wordpress") {
    return NextResponse.json({ error: "Not available for this connection." }, { status: 404 });
  }

  const rl = rateLimit(`wp-checkout-guard:${ctx.connectionId}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Wait a minute." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  const plan = await getWorkspacePlan(ctx.workspaceId);
  if (!plan.limits.conversionElementMonitoring) {
    return NextResponse.json(
      { error: "The checkout guard is included in Pro and Agency.", reason: "PLAN" },
      { status: 403 },
    );
  }

  const parsed = checkoutGuardSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const guard = planCheckoutGuard(parsed.data, ctx.website.url);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 400 });

  const websiteId = ctx.website.id;
  const existing = await prisma.monitoredPage.findMany({
    where: { websiteId },
    select: { id: true, normalizedUrl: true },
  });
  const known = new Set(existing.map((p) => p.normalizedUrl));
  const missing = new Map<string, { url: string; normalizedUrl: string; name: string }>();
  for (const t of guard.targets) {
    if (!known.has(t.normalizedUrl) && !missing.has(t.normalizedUrl)) {
      missing.set(t.normalizedUrl, { url: t.url, normalizedUrl: t.normalizedUrl, name: t.pageName });
    }
  }

  if (missing.size > 0) {
    try {
      await assertPageLimit(ctx.workspaceId, websiteId, existing.length + missing.size);
    } catch (err) {
      if (err instanceof LimitError) {
        return NextResponse.json({ error: err.message, code: err.code, reason: "PAGE_LIMIT" }, { status: 403 });
      }
      throw err;
    }
    await prisma.monitoredPage.createMany({
      data: [...missing.values()].map((p) => ({ websiteId, ...p })),
      skipDuplicates: true,
    });
  }

  const pages = await prisma.monitoredPage.findMany({
    where: { websiteId, normalizedUrl: { in: guard.targets.map((t) => t.normalizedUrl) } },
    select: {
      id: true,
      normalizedUrl: true,
      monitoredElements: { select: { selector: true } },
    },
  });
  const pageByUrl = new Map(pages.map((p) => [p.normalizedUrl, p]));

  let elements = 0;
  let created = 0;
  for (const t of guard.targets) {
    const page = pageByUrl.get(t.normalizedUrl);
    if (!page) continue;
    if (page.monitoredElements.some((e) => e.selector === t.element.selector)) {
      elements++;
      continue;
    }
    if (page.monitoredElements.length >= MAX_ELEMENTS_PER_PAGE) continue;
    await prisma.monitoredElement.create({
      data: {
        monitoredPageId: page.id,
        name: t.element.name,
        selector: t.element.selector,
        importance: t.element.importance,
        expectedExistence: true,
        expectedVisibility: true,
      },
    });
    page.monitoredElements.push({ selector: t.element.selector });
    elements++;
    created++;
  }

  logger.info("woocommerce checkout guard set up", {
    workspaceId: ctx.workspaceId,
    websiteId,
    connectionId: ctx.connectionId,
    pagesAdded: missing.size,
    elementsAdded: created,
  });
  return NextResponse.json({ pages: pages.length, elements }, { status: created > 0 || missing.size > 0 ? 201 : 200 });
}
