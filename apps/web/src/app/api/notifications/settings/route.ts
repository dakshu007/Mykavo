import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@fluxen/database";
import { getApiContext } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

const schema = z.object({
  recipients: z.array(z.string().trim().toLowerCase().email()).min(1).max(10),
  minSeverity: z.enum(["MEDIUM", "HIGH", "CRITICAL"]),
  failureAlerts: z.boolean(),
  weeklyReports: z.boolean(),
  enabled: z.boolean(),
});

/** Save the workspace's email notification preferences (spec §36). */
export async function PUT(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Enter at least one valid recipient email and a severity level." },
      { status: 400 },
    );
  }

  // Deduplicate recipients while preserving order.
  const recipients = [...new Set(body.recipients)];

  await prisma.notificationChannel.upsert({
    where: { workspaceId_type: { workspaceId: ctx.workspace.id, type: "EMAIL" } },
    create: {
      workspaceId: ctx.workspace.id,
      type: "EMAIL",
      enabled: body.enabled,
      configuration: {
        recipients,
        minSeverity: body.minSeverity,
        failureAlerts: body.failureAlerts,
        weeklyReports: body.weeklyReports,
      },
    },
    update: {
      enabled: body.enabled,
      configuration: {
        recipients,
        minSeverity: body.minSeverity,
        failureAlerts: body.failureAlerts,
        weeklyReports: body.weeklyReports,
      },
    },
  });

  logger.info("notification settings saved", {
    workspaceId: ctx.workspace.id,
    recipients: recipients.length,
    minSeverity: body.minSeverity,
  });
  return NextResponse.json({ ok: true });
}
