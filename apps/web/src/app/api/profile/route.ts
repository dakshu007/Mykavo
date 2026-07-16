import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getDefaultStorage } from "@mykavo/scanner/storage";
import { getSession } from "@/lib/session";
import { logger } from "@/lib/logger";
import { PROFILE_NAME_MAX_LENGTH, profileUpdateSchema } from "./schema";

/**
 * Update the signed-in user's profile (name + optional avatar).
 *
 * Better Auth 1.6 ships authClient.updateUser, but its /update-user endpoint
 * types the body as a loose record and applies no image size/format checks
 * server-side - so this route validates strictly with zod (schema.ts) and
 * writes via prisma instead. Never trust the client's canvas resizing.
 *
 * Avatars live in OBJECT STORAGE (R2), never in Postgres: the client still
 * sends an inline data URL, but the server decodes it, stores the bytes under
 * an unguessable name, and persists only the small `/api/avatars/<name>` path
 * on the user row. Replacing or removing a photo deletes the old object.
 */

const AVATAR_URL_PATTERN = /^\/api\/avatars\/([a-f0-9]{32}\.(?:jpg|png))$/;

/** Best-effort delete of a previously stored avatar object. */
async function deleteStoredAvatar(imageUrl: string | null): Promise<void> {
  const match = imageUrl?.match(AVATAR_URL_PATTERN);
  if (!match) return;
  try {
    await getDefaultStorage().delete(`avatars/${match[1]}`);
  } catch (err) {
    logger.warn("stale avatar delete failed", {
      key: match[1],
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Enter a name up to ${PROFILE_NAME_MAX_LENGTH} characters. Photos must be a JPEG or PNG under 100 KB.`,
      },
      { status: 400 },
    );
  }

  const { name, image } = parsed.data;
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  // `image` omitted from the request means "keep the current photo".
  let imageUpdate: { image: string | null } | Record<string, never> = {};
  if (image === null) {
    await deleteStoredAvatar(current?.image ?? null);
    imageUpdate = { image: null };
  } else if (typeof image === "string") {
    // Schema guarantees a data:image/(jpeg|png);base64 payload under the cap.
    const [header, base64] = image.split(",", 2);
    const extension = header.includes("image/png") ? "png" : "jpg";
    const name32 = randomBytes(16).toString("hex");
    const key = `avatars/${name32}.${extension}`;
    await getDefaultStorage().put(
      key,
      Buffer.from(base64, "base64"),
      extension === "png" ? "image/png" : "image/jpeg",
    );
    await deleteStoredAvatar(current?.image ?? null);
    imageUpdate = { image: `/api/avatars/${name32}.${extension}` };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, ...imageUpdate },
  });

  logger.info("profile updated", {
    userId: session.user.id,
    photo: image === undefined ? "unchanged" : image === null ? "removed" : "replaced",
  });
  return NextResponse.json({ ok: true });
}
