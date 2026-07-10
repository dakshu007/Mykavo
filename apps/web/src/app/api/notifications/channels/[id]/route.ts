import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@fluxen/database";
import { getApiContext } from "@/lib/api-auth";
import { getOwnedAlertChannel } from "@/lib/notification-channels";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({ enabled: z.boolean() });

/** Enable/disable an alert channel. */
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const channel = await getOwnedAlertChannel(ctx.workspace.id, id);
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let input: z.infer<typeof patchSchema>;
  try {
    input = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await prisma.notificationChannel.update({
    where: { id: channel.id },
    data: { enabled: input.enabled },
  });
  return NextResponse.json({ ok: true });
}

/** Remove an alert channel. */
export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const channel = await getOwnedAlertChannel(ctx.workspace.id, id);
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.notificationChannel.delete({ where: { id: channel.id } });
  logger.info("alert channel removed", {
    workspaceId: ctx.workspace.id,
    channelId: channel.id,
    channelType: channel.type,
  });
  return NextResponse.json({ ok: true });
}
