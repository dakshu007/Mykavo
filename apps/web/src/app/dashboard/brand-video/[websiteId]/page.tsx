import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Film } from "lucide-react";
import { prisma } from "@mykavo/database";
import { BrandKitPanel } from "@/components/brand-video/brand-kit-panel";
import { CreateVideo } from "@/components/brand-video/create-video";
import { Chip, Micro, Section } from "@/components/keywords/layout";
import { canUseBrandVideo } from "@/lib/brand-video/access";
import { assetUrl, kitView } from "@/lib/brand-video/data";
import { loadVideoAllowance, scriptsLeft } from "@/lib/brand-video/jobs";
import { getCurrentMembership, requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Brand Video - MyKavo", robots: { index: false } };

type Props = { params: Promise<{ websiteId: string }> };

const STATUS: Record<string, { tone: "green" | "accent" | "neutral" | "warning"; label: string }> = {
  ready: { tone: "green", label: "Exported" },
  queued: { tone: "accent", label: "Exporting" },
  rendering: { tone: "accent", label: "Exporting" },
  failed: { tone: "warning", label: "Export failed" },
  none: { tone: "neutral", label: "Draft" },
};

export default async function BrandVideoWebsitePage({ params }: Props) {
  const session = await requireSession();
  if (!(await canUseBrandVideo(session.user))) notFound();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  const { websiteId } = await params;
  const website = await prisma.website.findFirst({
    where: { id: websiteId, workspaceId: workspace.id },
    select: { id: true, name: true, url: true },
  });
  if (!website) notFound();

  const [kit, job, videos, allowance] = await Promise.all([
    prisma.brandKit.findUnique({ where: { websiteId: website.id } }),
    prisma.aiJob.findFirst({
      where: { websiteId: website.id, kind: "brand" },
      orderBy: { createdAt: "desc" },
      select: { id: true, kind: true, status: true, step: true, progress: true, error: true },
    }),
    prisma.brandVideo.findMany({
      where: { websiteId: website.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, durationSec: true, renderStatus: true, renderedFormat: true, posterKey: true, storyboard: true, createdAt: true },
    }),
    loadVideoAllowance(workspace.id),
  ]);
  const view = kit ? await kitView(kit) : null;
  const posters = await Promise.all(videos.map((v) => assetUrl(v.posterKey)));
  const canEdit = role !== "VIEWER";
  const sLeft = scriptsLeft(allowance);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="min-w-0">
        <Micro className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href="/dashboard/brand-video" className="text-accent hover:underline">
            Brand Video
          </Link>
          <span aria-hidden>/</span>
          <span>{website.name}</span>
        </Micro>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink">{website.name}</h1>
      </div>

      <Section
        id="brand-kit"
        number={1}
        kind="Brand kit"
        title="Your brand, read from your homepage"
        description="Every video uses these. Change anything that isn't right; your edits are kept when the site is scanned again."
      >
        <BrandKitPanel websiteId={website.id} initialKit={view} initialJob={job} canEdit={canEdit} />
      </Section>

      {view && (
        <Section id="new-video" number={2} kind="New video" title="Make a video" description="The AI picks scenes and writes the words from your brand kit and website. You can edit everything before exporting.">
          <CreateVideo websiteId={website.id} scriptsLeft={Number.isFinite(sLeft) ? sLeft : null} disabled={!canEdit} />
        </Section>
      )}

      <Section
        id="videos"
        number={view ? 3 : 2}
        kind="Videos"
        title="Your videos"
        description="Open a video to preview it, edit its scenes and export it."
        meta={<span>{videos.length}</span>}
        flush
      >
        {videos.length === 0 ? (
          <p className="px-5 py-6 text-[13.5px] text-ink-secondary sm:px-6">No videos yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {videos.map((v, i) => {
              const st = v.storyboard === null ? { tone: "accent" as const, label: "Writing" } : (STATUS[v.renderStatus] ?? STATUS.none!);
              return (
                <li key={v.id}>
                  <Link
                    href={`/dashboard/brand-video/videos/${v.id}`}
                    className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-ink/[0.03] sm:px-6"
                  >
                    <span className="flex h-12 w-20 items-center justify-center overflow-hidden rounded-lg bg-ink/5">
                      {posters[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={posters[i]!} alt="" className="size-full object-cover" />
                      ) : (
                        <Film className="size-5 text-ink-faint" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-ink">{v.title}</span>
                      <span className="block text-[12px] text-ink-faint">
                        {v.durationSec} seconds · {v.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Chip tone={st.tone}>{st.label}</Chip>
                      <ChevronRight className="size-4 text-accent transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
