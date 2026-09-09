import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { prisma } from "@mykavo/database";
import { isGscReauthMessage } from "@mykavo/shared";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { gscConfigured } from "@/lib/gsc";
import { requireSession, getCurrentWorkspace } from "@/lib/session";

export const metadata: Metadata = { title: "Search Console - MyKavo" };

/** Search Console home: connection state per website. */
export default async function SearchConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { error } = await searchParams;

  const websites = await prisma.website.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, url: true,
      gscConnection: { select: { property: true, lastSyncAt: true, lastError: true } },
    },
  });

  if (websites.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No websites yet"
        description="Add a website first - then connect Google Search Console to see clicks, queries, and Priority Opportunities next to your audits."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Search Console</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Google Search data combined with your Site Audit - so you fix the pages
          where the traffic already is.
        </p>
      </div>
      {error && (
        <p className="rounded-tile bg-critical-soft px-4 py-3 text-sm text-critical-strong" role="alert">
          Google connection failed ({error}). Try connecting again.
        </p>
      )}
      {!gscConfigured() && (
        <Card>
          <p className="text-sm leading-6 text-ink-secondary">
            Google OAuth is not configured yet. Set <code className="font-mono text-[12px]">GOOGLE_CLIENT_ID</code>,{" "}
            <code className="font-mono text-[12px]">GOOGLE_CLIENT_SECRET</code>, and{" "}
            <code className="font-mono text-[12px]">GSC_TOKEN_KEY</code> - then this page lights up.
          </p>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {websites.map((website) => {
          const connection = website.gscConnection;
          const hostname = (() => { try { return new URL(website.url).hostname; } catch { return website.url; } })();
          return (
            <Card key={website.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{website.name}</p>
                  <p className="truncate font-mono text-xs text-ink-faint">{hostname}</p>
                </div>
                {connection?.property &&
                  (isGscReauthMessage(connection.lastError) ? (
                    <span className="shrink-0 rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold text-warning-strong">Reconnect needed</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-semibold text-success-strong">Connected</span>
                  ))}
              </div>
              <p className="mt-3 text-sm text-ink-secondary">
                {connection?.property
                  ? `${connection.property} · ${connection.lastSyncAt ? `synced ${connection.lastSyncAt.toLocaleDateString("en-US", { dateStyle: "medium" })}` : "first sync pending"}`
                  : connection
                    ? "Google connected - pick a property to finish setup."
                    : "Not connected."}
              </p>
              {connection?.lastError &&
                (isGscReauthMessage(connection.lastError) ? (
                  <p className="mt-1 text-[12px] text-warning-strong">
                    Google revoked this connection - reconnect to resume syncing.
                  </p>
                ) : (
                  <p className="mt-1 text-[12px] text-critical-strong">Last sync error: {connection.lastError}</p>
                ))}
              <div className="mt-4 flex items-center gap-4 border-t border-line pt-4">
                {connection ? (
                  <>
                    <Link href={`/dashboard/search-console/${website.id}`} className="text-[13px] font-medium text-primary hover:underline">
                      Open dashboard →
                    </Link>
                    {/* Without this, a revoked connection is a dead end: the
                        connect button below only renders when there is no
                        connection row at all. */}
                    {isGscReauthMessage(connection.lastError) && gscConfigured() && (
                      <a
                        href={`/api/gsc/connect?website=${website.id}`}
                        className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-medium text-primary-contrast hover:bg-primary-hover"
                      >
                        Reconnect
                      </a>
                    )}
                  </>
                ) : gscConfigured() ? (
                  <a
                    href={`/api/gsc/connect?website=${website.id}`}
                    className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-medium text-primary-contrast hover:bg-primary-hover"
                  >
                    Connect Google Search Console
                  </a>
                ) : (
                  <span className="text-[13px] text-ink-faint">Awaiting OAuth configuration</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
