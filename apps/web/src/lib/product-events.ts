import { after } from "next/server";
import { prisma, productEventContext, type ProductEventContext } from "@mykavo/database";
import { sendProductEvents, type ProductEvent, type ProductEventProps } from "@mykavo/shared/product-events";
import { logger } from "@/lib/logger";

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

export type WorkspaceEventItem = {
  event: ProductEvent;
  /** Stable per occurrence, so a retried request is not counted twice. */
  dedupeKey: string;
  /** Event-specific properties; gets the workspace context for durations. */
  build?: (ctx: ProductEventContext) => ProductEventProps;
  /** When it happened; pass a stable time for events that must count once. */
  time?: Date;
};

/**
 * Sends product events for one workspace in a single Mixpanel call (see
 * @mykavo/shared/product-events), with plan, trial and acquisition context
 * on each. Never throws: analytics must not fail a request.
 */
export async function trackWorkspaceEvents(workspaceId: string, items: WorkspaceEventItem[]): Promise<void> {
  if (!process.env.MIXPANEL_TOKEN || items.length === 0) return;
  try {
    const ctx = await productEventContext(prisma, workspaceId);
    if (!ctx) return;
    await sendProductEvents(
      items.map((i) => ({
        event: i.event,
        distinctId: ctx.distinctId,
        dedupeKey: i.dedupeKey,
        time: i.time,
        props: { ...ctx.props, ...i.build?.(ctx) },
      })),
      { onError: (err) => logger.warn("product events not sent", { workspaceId, error: errText(err) }) },
    );
  } catch (err) {
    logger.warn("product events failed", { workspaceId, error: errText(err) });
  }
}

/**
 * Same as trackWorkspaceEvents, but runs after the response has been sent
 * (Next.js after()), so the user never waits on analytics. Use in route
 * handlers and server components. `load` may read the database first.
 */
export function trackAfterResponse(
  workspaceId: string,
  load: () => Promise<WorkspaceEventItem[]> | WorkspaceEventItem[],
): void {
  if (!process.env.MIXPANEL_TOKEN) return;
  after(async () => {
    try {
      await trackWorkspaceEvents(workspaceId, await load());
    } catch (err) {
      logger.warn("product events failed", { workspaceId, error: errText(err) });
    }
  });
}
