import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/automations-api";
import { getAutomationsOverview } from "@/lib/automations-admin";
import { loadUpdateEmailsPanel, type ProductPanel } from "@/lib/admin/product-updates";
import { listFlows } from "@/lib/flows/server";

/**
 * Automations for the Android app's admin area: every automated email with
 * its on/off state and send numbers, the custom and built-in flows, and the
 * WordPress-plugin and app update emails - the web Automations page's data,
 * flattened into a contract the APK can rely on. Changes go through the same
 * admin routes the website uses (PATCH /api/admin/automations/[key],
 * PATCH /api/admin/flows/[id]). Platform admins only (404 for anyone else).
 */

function updatePanel(p: ProductPanel) {
  return {
    product: p.product,
    release: p.release
      ? { version: p.release.version, detectedAt: p.release.detectedAt, sendRequestedAt: p.release.sendRequestedAt }
      : null,
    suggestedVersion: p.suggestedVersion,
    total: p.total,
    outdated: p.outdated.length,
    waiting: p.outdated.filter((o) => o.status === "waiting").length,
    notified: p.outdated.filter((o) => o.status === "notified").length,
  };
}

export async function GET() {
  const gate = await adminRequest("mobile-automations", 20);
  if (!gate.ok) return gate.response;

  const [overview, flows, updates] = await Promise.all([
    getAutomationsOverview(),
    listFlows(),
    loadUpdateEmailsPanel(),
  ]);

  return NextResponse.json(
    {
      ready: overview.ready,
      unsubscribes: overview.unsubscribes,
      automations: overview.automations.map((a) => ({
        key: a.meta.key,
        name: a.meta.name,
        group: a.meta.group,
        trigger: a.meta.trigger,
        unsubscribable: a.meta.unsubscribable,
        enabled: a.settings.enabled,
        customised: a.customised,
        sendOnDay: a.sendOnDay,
        offer: a.offer,
        stats: a.stats,
      })),
      flowsReady: flows.ready,
      flows: flows.flows,
      systemFlows: flows.system.map((f) => ({
        id: f.id,
        name: f.name,
        triggerLabel: f.triggerLabel,
        description: f.description,
        sent30d: f.sent30d,
      })),
      updates: { ready: updates.ready, plugin: updatePanel(updates.plugin), app: updatePanel(updates.app) },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
