import { NextResponse } from "next/server";
import { isMissingTableError, prisma, type Prisma } from "@mykavo/database";
import { PRODUCT_ANDROID, PRODUCT_WORDPRESS, isVersion } from "@mykavo/shared";
import { adminRequest, readJson } from "@/lib/automations-api";
import { logger } from "@/lib/logger";

/**
 * Admin > Automations > Update emails: "Send". Records the release (if new)
 * and asks the worker to email everyone on an older version - it picks the
 * request up within ten minutes and sends once per person per version.
 */
export async function POST(request: Request) {
  const req = await adminRequest("product-update", 10);
  if (!req.ok) return req.response;
  const body = await readJson(request);
  const product = body?.product;
  const version = typeof body?.version === "string" ? body.version.trim() : "";
  if ((product !== PRODUCT_WORDPRESS && product !== PRODUCT_ANDROID) || !isVersion(version)) {
    return NextResponse.json({ error: "Pick a product and a version like 1.2.0." }, { status: 400 });
  }
  const notes =
    typeof body?.notes === "string"
      ? body.notes
          .split(/\r?\n/)
          .map((l) => l.replace(/^[-*•]\s*/, "").trim())
          .filter(Boolean)
          .slice(0, 8)
          .map((l) => l.slice(0, 200))
      : [];
  const now = new Date();
  const update: Prisma.ProductReleaseUpdateInput = { sendRequestedAt: now, requestedByEmail: req.email };
  if (notes.length) update.notes = notes;
  try {
    await prisma.productRelease.upsert({
      where: { product_version: { product, version } },
      create: { product, version, notes, source: "admin", sendRequestedAt: now, requestedByEmail: req.email },
      update,
    });
  } catch (err) {
    if (isMissingTableError(err)) {
      return NextResponse.json({ error: "Run migration 20261002120000_product_updates in Supabase first." }, { status: 503 });
    }
    throw err;
  }
  logger.info("update email send requested", { userId: req.userId, product, version });
  return NextResponse.json({ ok: true });
}
