import Link from "next/link";
import { BellRing, Smartphone } from "lucide-react";
import { WordPressGlyph } from "@/components/brand/integration-icons";
import { Card, CardHeader } from "@/components/ui/card";
import type { ProductPanel, UpdateEmailsPanel as Panel, UpdatePerson } from "@/lib/admin/product-updates";
import { UpdateSendForm } from "./update-send-form";

/**
 * Admin > Automations > Update emails: tell people a new plugin or app
 * version is out. The plugin is announced automatically when WordPress.org
 * shows a new version (while its automation is on); Send does it now.
 */

const STATUS: Record<UpdatePerson["status"], { label: string; tone: string }> = {
  notified: { label: "Emailed", tone: "bg-success-soft text-success-strong" },
  waiting: { label: "Will be emailed", tone: "bg-primary-soft text-accent" },
  spaced: { label: "Emailed recently - waits 72h", tone: "bg-surface text-ink-secondary" },
  unsubscribed: { label: "Unsubscribed", tone: "bg-surface text-ink-faint" },
};

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";

function ProductCard({
  p,
  icon: Icon,
  title,
  source,
  ready,
  children,
}: {
  p: ProductPanel;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  source: React.ReactNode;
  ready: boolean;
  children?: React.ReactNode;
}) {
  const waiting = p.outdated.filter((o) => o.status === "waiting").length;
  const notified = p.outdated.filter((o) => o.status === "notified").length;
  return (
    <div className="rounded-tile bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <Icon className="size-4" />
          {title}
        </p>
        <span className="font-mono text-[12px] text-ink-secondary">
          {p.release ? `latest ${p.release.version}` : "no release yet"}
        </span>
      </div>
      <div className="mt-1 text-[12px] text-ink-secondary">{source}</div>
      {p.release?.sendRequestedAt && (
        <p className="mt-1 text-[12px] text-ink-secondary">Send pressed {when(p.release.sendRequestedAt)}.</p>
      )}
      <p className="mt-3 text-[13px] text-ink">
        <b>{p.outdated.length}</b> of {p.total} on an older version than <span className="font-mono">{p.suggestedVersion}</span>
        {notified > 0 && <> · {notified} emailed</>}
      </p>
      {p.outdated.length > 0 && (
        <ul className="mt-2 max-h-56 divide-y divide-line overflow-y-auto rounded-field bg-card">
          {p.outdated.map((o) => (
            <li key={o.email} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-ink">{o.email}</span>
                <span className="block truncate text-[11px] text-ink-faint">{o.detail}</span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS[o.status].tone}`}>
                {STATUS[o.status].label}
              </span>
            </li>
          ))}
        </ul>
      )}
      {children ?? null}
      <UpdateSendForm
        product={p.product}
        defaultVersion={p.suggestedVersion}
        waiting={waiting}
        withNotes={p.product === "android-app"}
        disabled={!ready}
      />
    </div>
  );
}

export function UpdateEmailsPanel({ panel }: { panel: Panel }) {
  const wp = panel.wordpressOrg;
  return (
    <Card>
      <CardHeader
        icon={BellRing}
        title="Update emails"
        action={
          <Link href="/dashboard/automations/plugin_update" className="text-[13px] font-medium text-accent hover:underline">
            Edit the emails →
          </Link>
        }
      />
      <p className="-mt-2 mb-4 text-[13px] text-ink-secondary">
        Tell people a new version is out. The WordPress plugin goes out by itself when WordPress.org shows a new
        version (checked hourly, while &ldquo;WordPress plugin update&rdquo; is on). The Android app only when you press
        Send. Nobody gets the same version twice.
      </p>
      {!panel.ready && (
        <p className="mb-4 rounded-tile bg-critical-soft px-4 py-3 text-[13px] text-critical-strong" role="status">
          Run migration <code className="font-mono">20261002120000_product_updates</code> in Supabase to turn these on.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <ProductCard
          p={panel.plugin}
          icon={WordPressGlyph}
          title="WordPress plugin"
          ready={panel.ready}
          source={
            wp.checked
              ? wp.version
                ? `WordPress.org shows ${wp.version}.`
                : "Not listed on WordPress.org yet - Send emails people the zip version you type."
              : "WordPress.org did not answer just now."
          }
        />
        <ProductCard
          p={panel.app}
          icon={Smartphone}
          title="Android app"
          ready={panel.ready}
          source="Sent only when you press Send, to people on an older app version. Builds before 1.0.2 do not report a version and count as older."
        />
      </div>
    </Card>
  );
}
