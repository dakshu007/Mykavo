import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { themeNote, type ThemeTopic } from "@/lib/integrations/shopify";

const FINAL = new Set(["COMPLETED", "PARTIAL", "FAILED"]);

const MESSAGES: Record<string, string> = {
  THROTTLED: "Not checked - a check ran a few minutes earlier",
  NO_PAGES: "Not checked - no pages are monitored yet",
  BUSY: "Not checked - a scan was already running",
  ENQUEUE: "Not checked - MyKavo could not start the check",
};

/**
 * Theme checks for the Shopify app's "Theme checks" tab, in the same shape
 * as the WordPress plugin's update log so the screens are shared.
 */
export async function GET(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx || !ctx.shopifyShopId) return unauthorizedSite();

  const [shop, events] = await Promise.all([
    prisma.shopifyShop.findUnique({ where: { id: ctx.shopifyShopId }, select: { themeChecks: true } }),
    prisma.shopifyThemeEvent.findMany({
      where: { shopId: ctx.shopifyShopId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  const scanIds = events.map((e) => e.scanId).filter((id): id is string => Boolean(id));
  const scans = scanIds.length
    ? await prisma.scan.findMany({
        where: { id: { in: scanIds }, websiteId: ctx.website.id },
        select: { id: true, status: true, changesDetected: true, highestSeverity: true },
      })
    : [];
  const byId = new Map(scans.map((s) => [s.id, s]));

  return NextResponse.json(
    {
      enabled: shop?.themeChecks ?? true,
      log: events.map((e) => {
        const scan = e.scanId ? byId.get(e.scanId) : undefined;
        return {
          id: e.id,
          at: Math.floor(e.createdAt.getTime() / 1000),
          trigger: "auto",
          items: [{ type: "theme", name: e.themeName, from: "", to: "", action: e.topic === "publish" ? "switch" : "edit" }],
          note: themeNote(e.topic as ThemeTopic, e.themeName),
          scan_id: scan ? scan.id : "",
          reason: e.reason ?? "",
          message: e.reason && !scan ? (MESSAGES[e.reason] ?? "") : "",
          ...(scan && FINAL.has(scan.status)
            ? {
                result: {
                  status: scan.status.toLowerCase(),
                  changes: scan.changesDetected,
                  severity: (scan.highestSeverity ?? "").toLowerCase(),
                },
              }
            : {}),
        };
      }),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

const settingsSchema = z.object({ enabled: z.boolean() });

/** The Theme checks on/off switch. */
export async function POST(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx || !ctx.shopifyShopId) return unauthorizedSite();
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  await prisma.shopifyShop.update({
    where: { id: ctx.shopifyShopId },
    data: { themeChecks: parsed.data.enabled },
  });
  return NextResponse.json({ enabled: parsed.data.enabled });
}
