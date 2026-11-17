import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clapperboard } from "lucide-react";
import { prisma } from "@mykavo/database";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Chip, Micro, Section, TileStrip, type Tile } from "@/components/keywords/layout";
import { canUseBrandVideo } from "@/lib/brand-video/access";
import { loadVideoAllowance, scriptsLeft, videosLeft } from "@/lib/brand-video/jobs";
import { getCurrentWorkspace, requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Brand Video - MyKavo", robots: { index: false } };

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Brand Video home: every website, its brand kit, and its videos. */
export default async function BrandVideoPage() {
  const session = await requireSession();
  if (!(await canUseBrandVideo(session.user))) notFound();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);

  const [websites, allowance] = await Promise.all([
    prisma.website.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        url: true,
        brandKit: { select: { name: true, colors: true, logoKey: true } },
        _count: { select: { brandVideos: true } },
      },
    }),
    loadVideoAllowance(workspace.id),
  ]);

  if (websites.length === 0) {
    return (
      <EmptyState
        icon={Clapperboard}
        title="Add a website first"
        description="Brand videos are made from your website's own design. Add one, and MyKavo reads its brand on the first scan."
      />
    );
  }

  const withKit = websites.filter((w) => w.brandKit).length;
  const videos = websites.reduce((n, w) => n + w._count.brandVideos, 0);
  const vLeft = videosLeft(allowance);
  const sLeft = scriptsLeft(allowance);
  const tiles: Tile[] = [
    { label: "Brand kits", value: withKit, note: withKit === websites.length ? "Every website read" : `${websites.length - withKit} not read yet` },
    { label: "Videos", value: videos, note: "Across all websites" },
    {
      label: "Exports left",
      value: Number.isFinite(vLeft) ? vLeft : "Unlimited",
      note: allowance.limits.lifetime ? "On your plan" : "This month",
      warn: vLeft === 0,
    },
    {
      label: "AI scripts left",
      value: Number.isFinite(sLeft) ? sLeft : "Unlimited",
      note: allowance.limits.watermark ? "Videos carry a MyKavo mark" : `${allowance.limits.quality}p, no watermark`,
    },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="min-w-0">
        <Micro className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex items-center gap-1.5 text-accent">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            Brand Video
          </span>
          <span aria-hidden>/</span>
          <span>Beta</span>
        </Micro>
        <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-ink">
          A brand video, made from your own website.
        </h1>
        <p className="mt-1.5 max-w-2xl text-[14px] text-ink-secondary">
          MyKavo reads your logo, colors, fonts and words from your homepage, writes the scenes, and exports a 30 or 60
          second motion video you can post anywhere.
        </p>
      </div>

      <TileStrip tiles={tiles} />

      <Section id="websites" number={1} kind="Websites" title="Your websites" description="Open one to check its brand kit and make a video." flush>
        <ul className="divide-y divide-line">
          {websites.map((w) => {
            const colors = (w.brandKit?.colors ?? null) as Record<string, string> | null;
            return (
              <li key={w.id}>
                <Link
                  href={`/dashboard/brand-video/${w.id}`}
                  className="group grid items-center gap-x-5 gap-y-2 px-5 py-4 transition-colors hover:bg-ink/[0.03] focus-visible:bg-ink/[0.04] focus-visible:outline-none sm:px-6 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[14.5px] font-medium text-ink">
                      <span className={cn("size-2 shrink-0 rounded-full", w.brandKit ? "bg-success" : "bg-ink-faint")} aria-hidden />
                      <span className="truncate">{w.name}</span>
                    </span>
                    <span className="ml-4 block truncate font-mono text-[11.5px] text-ink-faint">{hostOf(w.url)}</span>
                  </span>
                  <span className="flex items-center gap-1" aria-hidden>
                    {colors
                      ? ["primary", "accent", "background", "text"].map((k) => (
                          <span key={k} className="size-4 rounded border border-line" style={{ background: colors[k] }} />
                        ))
                      : null}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {w.brandKit ? <Chip tone="green">Brand kit ready</Chip> : <Chip>Reads on next scan</Chip>}
                    <Chip tone="accent">
                      {w._count.brandVideos} {w._count.brandVideos === 1 ? "video" : "videos"}
                    </Chip>
                  </span>
                  <span className="flex items-center gap-1 text-[13px] font-medium text-accent">
                    {w.brandKit ? "Make a video" : "Read the brand"}
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
