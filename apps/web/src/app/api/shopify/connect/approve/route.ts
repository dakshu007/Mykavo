import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext } from "@/lib/api-auth";
import { appBaseUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyLinkToken } from "@/lib/integrations/shopify";
import { shopifyConfig } from "@/lib/integrations/shopify-server";

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * The consent form on /connect/shopify posts here. The link token is
 * re-verified (it names the store), the member must be allowed to act on
 * the chosen website, and any previous link for the store is revoked.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(appBaseUrl()).origin) {
    return NextResponse.json({ error: "Bad origin." }, { status: 403 });
  }
  const config = shopifyConfig();
  if (!config) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const ctx = await getApiContext();
  if (!ctx) return NextResponse.redirect(`${appBaseUrl()}/login`, 303);
  if (ctx.role === "VIEWER") {
    return NextResponse.json({ error: "Viewers can't connect stores." }, { status: 403 });
  }
  const rl = rateLimit(`shopify-approve:${ctx.userId}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });

  const form = await request.formData();
  const shop = verifyLinkToken(field(form, "t"), config.apiSecret);
  if (!shop) {
    return NextResponse.json(
      { error: "This connect link has expired. Press Connect in the Shopify app again." },
      { status: 400 },
    );
  }

  const store = await prisma.shopifyShop.findUnique({ where: { shop } });
  if (!store || store.uninstalledAt) {
    return NextResponse.json({ error: "MyKavo is not installed on this store." }, { status: 400 });
  }
  const website = await prisma.website.findFirst({
    where: { id: field(form, "websiteId"), workspaceId: ctx.workspace.id },
    select: { id: true },
  });
  if (!website) return NextResponse.json({ error: "Choose one of your websites." }, { status: 400 });

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    if (store.siteConnectionId) {
      await tx.siteConnection.updateMany({
        where: { id: store.siteConnectionId, revokedAt: null },
        data: { revokedAt: now },
      });
    }
    const connection = await tx.siteConnection.create({
      data: {
        workspaceId: ctx.workspace.id,
        websiteId: website.id,
        platform: "shopify",
        siteUrl: store.primaryDomain ?? `https://${shop}`,
        siteName: store.name,
        createdByUserId: ctx.userId,
        connectedAt: now,
        lastUsedAt: now,
      },
    });
    await tx.shopifyShop.update({ where: { id: store.id }, data: { siteConnectionId: connection.id } });
  });

  logger.info("shopify store linked", { shop, workspaceId: ctx.workspace.id, websiteId: website.id });
  return NextResponse.redirect(`${appBaseUrl()}/connect/shopify?done=${encodeURIComponent(shop)}`, 303);
}
