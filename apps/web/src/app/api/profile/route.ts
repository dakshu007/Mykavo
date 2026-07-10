import { NextResponse } from "next/server";
import { prisma } from "@fluxen/database";
import { getSession } from "@/lib/session";
import { logger } from "@/lib/logger";
import { PROFILE_NAME_MAX_LENGTH, profileUpdateSchema } from "./schema";

/**
 * Update the signed-in user's profile (name + optional avatar).
 *
 * Better Auth 1.6 ships authClient.updateUser, but its /update-user endpoint
 * types the body as a loose record and applies no image size/format checks
 * server-side — so this route validates strictly with zod (schema.ts) and
 * writes via prisma instead. Never trust the client's canvas resizing.
 */
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
  await prisma.user.update({
    where: { id: session.user.id },
    // `image` omitted from the request means "keep the current photo".
    data: { name, ...(image !== undefined ? { image } : {}) },
  });

  logger.info("profile updated", {
    userId: session.user.id,
    photo: image === undefined ? "unchanged" : image === null ? "removed" : "replaced",
  });
  return NextResponse.json({ ok: true });
}
