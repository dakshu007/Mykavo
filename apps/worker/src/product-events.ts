import { prisma, productEventContext, type ProductEventContext } from "@mykavo/database";
import { sendProductEvent, type ProductEvent, type ProductEventProps } from "@mykavo/shared/product-events";
import { logger } from "./logger";

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Sends one product event for a workspace (see @mykavo/shared/product-events).
 * Adds plan, trial and acquisition context; `build` gets that context so
 * durations can be measured from signup or trial start. Never throws: a
 * failed analytics call must not fail a scan job.
 */
export async function trackWorkspaceEvent(
  workspaceId: string,
  event: ProductEvent,
  dedupeKey: string,
  build?: (ctx: ProductEventContext) => ProductEventProps,
  time?: Date,
): Promise<void> {
  if (!process.env.MIXPANEL_TOKEN) return;
  try {
    const ctx = await productEventContext(prisma, workspaceId);
    if (!ctx) return;
    await sendProductEvent(
      { event, distinctId: ctx.distinctId, dedupeKey, time, props: { ...ctx.props, ...build?.(ctx) } },
      { onError: (err) => logger.warn("product event not sent", { event, workspaceId, error: errText(err) }) },
    );
  } catch (err) {
    logger.warn("product event failed", { event, workspaceId, error: errText(err) });
  }
}
