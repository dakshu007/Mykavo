import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@mykavo/database";
import { Card, CardHeader } from "@/components/ui/card";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { AnalyserClient } from "./analyser-client";

export const metadata: Metadata = { title: "MyKavo Analyser - MyKavo" };

/**
 * MyKavo Analyser: the E-E-A-T engine as a first-class dashboard section.
 * Analyse ANY page on demand (yours, a client's, a competitor's), plus
 * one-click homepage reports for every monitored website.
 */
export default async function AnalyserPage() {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);

  const websites = await prisma.website.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, url: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">MyKavo Analyser</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Score any page against Google&apos;s E-E-A-T framework - Experience,
          Expertise, Authoritativeness, and Trust (weighted double) - with a
          concrete fix for every failed signal.
        </p>
      </div>

      <AnalyserClient />

      {websites.length > 0 && (
        <Card>
          <CardHeader title="Your websites" />
          <ul className="divide-y divide-line">
            {websites.map((website) => {
              const hostname = (() => {
                try { return new URL(website.url).hostname; } catch { return website.url; }
              })();
              return (
                <li key={website.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{website.name}</p>
                    <p className="truncate font-mono text-xs text-ink-faint">{hostname}</p>
                  </div>
                  <Link
                    href={`/dashboard/websites/${website.id}/eeat`}
                    className="shrink-0 text-[13px] font-medium text-primary hover:underline"
                  >
                    Analyse homepage →
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
