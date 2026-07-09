import { NextResponse } from "next/server";
import {
  prisma,
  Prisma,
  upgradeWorkspaceToPro,
  downgradeWorkspaceToFree,
  findWorkspaceByDodoSubscription,
  applyWebsiteAddon,
  revokeWebsiteAddon,
  findWorkspaceByAddonSubscription,
  consumeCheckoutIntent,
} from "@fluxen/database";
import { verifyDodoWebhook, DodoWebhookError } from "@/lib/billing/webhook";
import { DODO_WEBHOOK_SECRET } from "@/lib/billing/config";
import { logger } from "@/lib/logger";

// The raw body is required for signature verification — never parse it first.
export const dynamic = "force-dynamic";

/** Event types that grant Pro access (research §2). */
const GRANT_EVENTS = new Set([
  "subscription.active",
  "subscription.renewed",
  "payment.succeeded",
]);

/** Event types that revoke access. Both cancel spellings, per research §6.1. */
const REVOKE_EVENTS = new Set([
  "subscription.cancelled",
  "subscription.canceled",
  "subscription.expired",
  "subscription.failed",
  "subscription.on_hold",
]);

interface DodoData {
  status?: string;
  subscription_id?: string;
  product_id?: string;
  next_billing_date?: string;
  cancel_at_next_billing_date?: boolean;
  customer?: { customer_id?: string; email?: string };
  metadata?: Record<string, unknown>;
}
interface DodoEvent {
  type?: string;
  timestamp?: string;
  data?: DodoData;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(request: Request) {
  if (!DODO_WEBHOOK_SECRET) {
    logger.error("dodo webhook received but DODO_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const webhookId = request.headers.get("webhook-id");
  const webhookTimestamp = request.headers.get("webhook-timestamp");

  let event: DodoEvent;
  try {
    event = verifyDodoWebhook(
      rawBody,
      {
        webhookId,
        webhookTimestamp,
        webhookSignature: request.headers.get("webhook-signature"),
      },
      DODO_WEBHOOK_SECRET,
    ) as DodoEvent;
  } catch (err) {
    const code = err instanceof DodoWebhookError ? err.code : "VERIFY_FAILED";
    logger.warn("dodo webhook verification failed", { code });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const type = event.type ?? "";
  const data = event.data ?? {};
  const status = data.status ?? "";
  const subscriptionId = data.subscription_id ?? null;
  // Prefer the event's own logical time (survives retries) over receipt time.
  const eventAt =
    parseDate(event.timestamp) ??
    (webhookTimestamp ? new Date(Number(webhookTimestamp) * 1000) : null);

  const grants = GRANT_EVENTS.has(type) && (status === "" || status === "active");
  const revokes =
    REVOKE_EVENTS.has(type) || (status !== "" && status !== "active" && status !== "pending");

  /**
   * Attribute the event to a workspace WITHOUT trusting client-editable
   * metadata (security review): an existing subscription binding wins; a
   * brand-new subscription is bound via the server-issued checkout token.
   */
  const token =
    typeof data.metadata?.checkoutToken === "string" ? data.metadata.checkoutToken : null;

  const log = { webhookId, type, status };

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Idempotency (spec §38) — inside the tx so a crash rolls back BOTH the
      // dedupe record and the entitlement change (durability fix).
      try {
        await tx.processedWebhookEvent.create({
          data: { eventId: webhookId!, eventType: type || "unknown" },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          return "deduped" as const;
        }
        throw err;
      }

      // Resolve workspace AND route (base plan vs website add-on). An existing
      // subscription binding wins; otherwise the server-issued checkout intent
      // supplies both the workspace and the trusted purchase `kind` (never the
      // client-editable metadata).
      let workspaceId: string | null = null;
      let route: "pro" | "website_addon" = "pro";
      if (subscriptionId) {
        const baseWs = await findWorkspaceByDodoSubscription(tx, subscriptionId);
        if (baseWs) {
          workspaceId = baseWs;
          route = "pro";
        } else {
          const addonWs = await findWorkspaceByAddonSubscription(tx, subscriptionId);
          if (addonWs) {
            workspaceId = addonWs;
            route = "website_addon";
          }
        }
      }
      if (!workspaceId && token) {
        const intent = await consumeCheckoutIntent(tx, token);
        if (intent) {
          workspaceId = intent.workspaceId;
          route = intent.kind === "website_addon" ? "website_addon" : "pro";
        }
      }
      if (!workspaceId) return "unattributed" as const;

      // --- Website add-on subscriptions (each active row = +30 websites) ---
      if (route === "website_addon") {
        if (grants && subscriptionId) {
          await applyWebsiteAddon(tx, {
            workspaceId,
            dodoSubscriptionId: subscriptionId,
            dodoCustomerId: data.customer?.customer_id ?? null,
            status: "active",
            currentPeriodEnd: parseDate(data.next_billing_date),
            cancelAtPeriodEnd: data.cancel_at_next_billing_date ?? false,
            eventAt,
          });
          return "addon_activated" as const;
        }
        if (revokes && subscriptionId) {
          await revokeWebsiteAddon(tx, {
            dodoSubscriptionId: subscriptionId,
            status: status || "cancelled",
            eventAt,
          });
          return "addon_revoked" as const;
        }
        return "noop" as const;
      }

      // --- Base Pro plan ---
      if (grants) {
        await upgradeWorkspaceToPro(tx, {
          workspaceId,
          status: "active",
          dodoCustomerId: data.customer?.customer_id ?? null,
          dodoSubscriptionId: subscriptionId,
          currentPeriodEnd: parseDate(data.next_billing_date),
          cancelAtPeriodEnd: data.cancel_at_next_billing_date ?? false,
          eventAt,
        });
        return "upgraded" as const;
      }
      if (revokes) {
        await downgradeWorkspaceToFree(tx, {
          workspaceId,
          status: status || "cancelled",
          dodoSubscriptionId: subscriptionId,
          eventAt,
        });
        return "downgraded" as const;
      }
      return "noop" as const;
    });

    logger.info("dodo webhook processed", { ...log, result });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    logger.error("dodo webhook processing failed", log, err);
    // 500 → Dodo retries; nothing was committed (transaction rolled back).
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
