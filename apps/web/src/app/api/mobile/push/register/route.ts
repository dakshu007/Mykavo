import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { isExpoPushToken } from "@mykavo/shared";
import { getSession } from "@/lib/session";
import { logger } from "@/lib/logger";

/**
 * Push device registration for the mobile app (spec §27).
 *
 * Scoped to the SESSION USER, not a workspace: a handset should alert its owner
 * about every workspace they belong to, and membership can change without the
 * phone re-registering.
 *
 * POST   - register or refresh this device (idempotent on the token)
 * DELETE - stop sending to this device (the in-app toggle)
 */

const registerSchema = z.object({
  token: z.string().min(1).max(255),
  platform: z.enum(["ios", "android"]),
  deviceName: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let input: z.infer<typeof registerSchema>;
  try {
    input = registerSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid registration." }, { status: 400 });
  }

  // Reject anything that is not an Expo token before it reaches the database -
  // a malformed token is an alert that silently never arrives.
  if (!isExpoPushToken(input.token)) {
    return NextResponse.json({ error: "Not a valid Expo push token." }, { status: 400 });
  }

  // A token is unique per app install, so the same handset re-registering must
  // update its row. It may also have moved to a different account (a shared
  // test device, or a user signing in as someone else) - in that case the
  // token must follow the new user, never keep alerting the old one.
  const device = await prisma.pushDevice.upsert({
    where: { token: input.token },
    create: {
      userId: session.user.id,
      token: input.token,
      platform: input.platform,
      deviceName: input.deviceName ?? null,
    },
    update: {
      userId: session.user.id,
      platform: input.platform,
      deviceName: input.deviceName ?? null,
      // Re-registering is an explicit opt-in, so it clears a previous
      // DeviceNotRegistered disable and the transient failure streak.
      enabled: true,
      disabledReason: null,
      failureCount: 0,
      lastSeenAt: new Date(),
    },
  });

  logger.info("push device registered", {
    userId: session.user.id,
    platform: device.platform,
  });

  return NextResponse.json({
    device: {
      id: device.id,
      platform: device.platform,
      deviceName: device.deviceName,
      enabled: device.enabled,
    },
  });
}

const unregisterSchema = z.object({ token: z.string().min(1).max(255) });

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let input: z.infer<typeof unregisterSchema>;
  try {
    input = unregisterSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Scope the delete to the caller's own devices: a token is guessable in
  // principle, and nobody but its owner may switch off someone's alerts.
  const result = await prisma.pushDevice.deleteMany({
    where: { token: input.token, userId: session.user.id },
  });

  return NextResponse.json({ removed: result.count });
}

/** Whether this device is currently registered, for the settings toggle. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    const count = await prisma.pushDevice.count({
      where: { userId: session.user.id, enabled: true },
    });
    return NextResponse.json({ registered: false, enabledDevices: count });
  }

  const device = await prisma.pushDevice.findFirst({
    where: { token, userId: session.user.id },
    select: { enabled: true, disabledReason: true, platform: true },
  });

  return NextResponse.json({
    registered: Boolean(device?.enabled),
    ...(device?.disabledReason ? { disabledReason: device.disabledReason } : {}),
  });
}
