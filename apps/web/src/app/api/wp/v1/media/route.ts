import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getDefaultStorage } from "@mykavo/scanner/storage";
import { verifyMediaParams, MEDIA_TTL_MS } from "@/lib/integrations/site-connection";

/**
 * Screenshots and diff images for the WordPress plugin, loaded by the
 * wp-admin browser straight from here. Authorized by the short-lived HMAC
 * signature the change-detail endpoint issued for this exact image - so
 * images never pass through (or slow down) the WordPress server, and the
 * site's access token never reaches the browser.
 */
export async function GET(request: Request) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const url = new URL(request.url);
  const media = verifyMediaParams(
    {
      k: url.searchParams.get("k"),
      id: url.searchParams.get("id"),
      exp: url.searchParams.get("exp"),
      sig: url.searchParams.get("sig"),
    },
    secret,
  );
  if (!media) return NextResponse.json({ error: "Link expired" }, { status: 403 });

  let key: string | null = null;
  let contentType = "image/jpeg";
  if (media.kind === "shot") {
    const snapshot = await prisma.pageSnapshot.findUnique({
      where: { id: media.id },
      select: { screenshotStorageKey: true },
    });
    key = snapshot?.screenshotStorageKey ?? null;
  } else {
    const change = await prisma.changeEvent.findUnique({
      where: { id: media.id },
      select: { metadata: true },
    });
    const value =
      change?.metadata && typeof change.metadata === "object"
        ? (change.metadata as Record<string, unknown>).diffStorageKey
        : null;
    key = typeof value === "string" ? value : null;
    contentType = "image/png";
  }
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await getDefaultStorage().get(key);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": contentType,
      "cache-control": `private, max-age=${Math.floor(MEDIA_TTL_MS / 1000)}`,
      "x-content-type-options": "nosniff",
    },
  });
}
