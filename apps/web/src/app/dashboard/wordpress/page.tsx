import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { canManageMembers } from "@/lib/team";
import { loadConnectedSites } from "@/lib/site-connections";
import { WP_PLUGIN_DIRECTORY_URL } from "@/config/wordpress-plugin";
import { Card, CardHeader } from "@/components/ui/card";
import { ConnectedSites } from "@/components/dashboard/connected-sites";
import { BRAND_MARKS } from "@/components/brand/brand-marks";

export const metadata: Metadata = {
  title: "WordPress",
  robots: { index: false },
};

const STEPS = [
  {
    title: "Install the plugin",
    body: "In WordPress go to Plugins → Add New, search for MyKavo, then install and activate it.",
  },
  {
    title: "Press Connect",
    body: "Open MyKavo in the WordPress admin menu and press Connect. Approve it here - nothing to copy and paste.",
  },
  {
    title: "Update without fear",
    body: "Every plugin, theme and core update is recorded. With Safe Updates (Pro and Agency) your key pages are checked right after each one.",
  },
];

/**
 * WordPress on its own page: which sites have the MyKavo plugin connected,
 * and how to connect one. Used to share a single card in Settings with
 * Shopify, where neither setup story had room to be told.
 */
export default async function WordPressPage() {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  const sites = await loadConnectedSites(workspace.id, "wordpress");

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <div className="flex items-start gap-4">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-white shadow-[0_1px_2px_rgb(21_21_21/10%)] ring-1 ring-black/8">
            <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
              <path fill={BRAND_MARKS.wordpress.hex} d={BRAND_MARKS.wordpress.path} />
            </svg>
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-ink">WordPress</h1>
            <p className="mt-1 text-sm leading-6 text-ink-secondary">
              See MyKavo monitoring inside wp-admin, and know which update caused a change -
              plugin, theme or core.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={sites.length > 0 ? "Connected sites" : "No sites connected yet"} />
        {sites.length > 0 ? (
          <ConnectedSites sites={sites} canManage={canManageMembers(role)} />
        ) : (
          <p className="-mt-2 text-sm text-ink-secondary">
            Connect a WordPress site in three steps - it takes about a minute.
          </p>
        )}
      </Card>

      <Card>
        <CardHeader title="How to connect" />
        <ol className="space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-accent">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{s.title}</p>
                <p className="mt-0.5 text-sm leading-6 text-ink-secondary">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={WP_PLUGIN_DIRECTORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            Get the plugin on WordPress.org
            <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
          <Link
            href="/wordpress-plugin"
            className="inline-flex h-10 items-center rounded-full border border-line px-5 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink"
          >
            What the plugin does
          </Link>
        </div>
      </Card>
    </div>
  );
}
