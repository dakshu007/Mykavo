import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { prisma } from "@mykavo/database";
import { isGscReauthMessage } from "@mykavo/shared";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { canUseKeywordAgent } from "@/lib/keywords/striking";

export const metadata: Metadata = { title: "AI Keywords - MyKavo", robots: { index: false } };

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** AI Keywords home: pick a website. Admins only while the agent is built. */
export default async function KeywordsPage() {
  const session = await requireSession();
  if (!canUseKeywordAgent(session.user)) notFound();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);

  const websites = await prisma.website.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      url: true,
      gscConnection: { select: { property: true, lastError: true } },
      _count: { select: { gscQueryPages: true } },
    },
  });

  if (websites.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Add a website first"
        description="AI Keywords works from the websites you monitor. Add one, connect Google Search Console, and your keyword opportunities appear here."
      />
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">AI Keywords</h1>
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-accent">
            Admin preview
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-secondary">
          What to write next, from the searches your sites already appear for. Pick a website.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {websites.map((w) => {
          const connected = Boolean(w.gscConnection?.property);
          const reconnect = connected && isGscReauthMessage(w.gscConnection?.lastError ?? null);
          const status = !connected
            ? "Search Console not connected"
            : reconnect
              ? "Search Console needs a reconnect"
              : w._count.gscQueryPages > 0
                ? "Search Console data ready"
                : "Waiting for the first sync";
          return (
            <li key={w.id}>
              <Link href={`/dashboard/keywords/${w.id}`} className="group block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <Card className="h-full transition-shadow group-hover:shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-ink">{w.name}</p>
                      <p className="truncate font-mono text-xs text-ink-faint">{hostOf(w.url)}</p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </div>
                  <p
                    className={
                      connected && !reconnect
                        ? "mt-3 text-[13px] text-ink-secondary"
                        : "mt-3 text-[13px] text-warning-strong"
                    }
                  >
                    {status}
                  </p>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
