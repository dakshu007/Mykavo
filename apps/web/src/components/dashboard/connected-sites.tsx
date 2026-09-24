"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export interface ConnectedSiteView {
  id: string;
  siteUrl: string;
  siteName: string | null;
  websiteName: string;
  connectedAt: string | null;
  lastUsedAt: string | null;
  pluginVersion: string | null;
}

function shortDate(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

/** WordPress sites connected through the MyKavo plugin, with a kill switch. */
export function ConnectedSites({ sites, canManage }: { sites: ConnectedSiteView[]; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function disconnect(site: ConnectedSiteView) {
    if (!window.confirm(`Disconnect ${site.siteUrl}? The plugin on that site stops working until it's connected again.`)) {
      return;
    }
    setBusy(site.id);
    setError(null);
    const res = await fetch(`/api/site-connections/${site.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      setError("Couldn't disconnect that site. Try again.");
      return;
    }
    router.refresh();
  }

  if (sites.length === 0) {
    return (
      <p className="text-sm text-ink-secondary">
        No WordPress sites connected. Install the MyKavo plugin on a WordPress site and press
        Connect to see its monitoring inside wp-admin.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-line rounded-field border border-line">
        {sites.map((site) => (
          <li key={site.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{site.siteName ?? site.siteUrl}</p>
              <p className="truncate text-xs text-ink-faint">
                <span className="font-mono">{site.siteUrl}</span> · {site.websiteName} · last used{" "}
                {shortDate(site.lastUsedAt)}
                {site.pluginVersion ? ` · plugin ${site.pluginVersion}` : ""}
              </p>
            </div>
            {canManage && (
              <button
                onClick={() => disconnect(site)}
                disabled={busy !== null}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-secondary transition-colors hover:text-critical disabled:opacity-50"
              >
                {busy === site.id && <Loader2 className="size-3 animate-spin" aria-hidden />}
                Disconnect
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-critical">{error}</p>}
    </div>
  );
}
