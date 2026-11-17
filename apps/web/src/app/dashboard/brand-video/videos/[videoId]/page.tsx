import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@mykavo/database";
import { RENDERS_PER_VIDEO, SCRIPT_REWRITES_PER_VIDEO } from "@mykavo/brand-video/pure";
import { VideoEditor } from "@/components/brand-video/video-editor";
import { Micro } from "@/components/keywords/layout";
import { canUseBrandVideo } from "@/lib/brand-video/access";
import { kitView, videoView } from "@/lib/brand-video/data";
import { exportOptions, loadVideoAllowance, scriptsLeft, videosLeft } from "@/lib/brand-video/jobs";
import { getCurrentMembership, requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Brand Video - MyKavo", robots: { index: false } };

type Props = { params: Promise<{ videoId: string }> };

export default async function BrandVideoEditorPage({ params }: Props) {
  const session = await requireSession();
  if (!(await canUseBrandVideo(session.user))) notFound();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  const { videoId } = await params;
  const video = await prisma.brandVideo.findFirst({ where: { id: videoId, workspaceId: workspace.id } });
  if (!video) notFound();
  const [website, kit, allowance] = await Promise.all([
    prisma.website.findUnique({ where: { id: video.websiteId }, select: { id: true, name: true, url: true } }),
    prisma.brandKit.findUnique({ where: { websiteId: video.websiteId } }),
    loadVideoAllowance(workspace.id),
  ]);
  if (!website || !kit) notFound();
  const [view, kv] = await Promise.all([videoView(video), kitView(kit)]);
  const opts = exportOptions(allowance);
  const vLeft = videosLeft(allowance);
  const sLeft = scriptsLeft(allowance);

  return (
    <div className="max-w-[1400px] space-y-5">
      <Micro className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link href="/dashboard/brand-video" className="text-accent hover:underline">
          Brand Video
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/dashboard/brand-video/${website.id}`} className="hover:underline">
          {website.name}
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate">{video.title}</span>
      </Micro>
      <VideoEditor
        initial={view}
        kit={kv}
        websiteUrl={website.url}
        canEdit={role !== "VIEWER"}
        allowance={{
          formats: opts.formats,
          quality: opts.quality,
          watermark: opts.watermark,
          videosLeft: Number.isFinite(vLeft) ? vLeft : null,
          scriptsLeft: Number.isFinite(sLeft) ? sLeft : null,
          rendersPerVideo: RENDERS_PER_VIDEO,
          rewritesPerVideo: SCRIPT_REWRITES_PER_VIDEO,
        }}
      />
    </div>
  );
}
