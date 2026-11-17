import { NextResponse } from "next/server";
import { getDefaultStorage } from "@mykavo/scanner/storage";
import { videoContext } from "@/lib/brand-video/api";
import { findVideo } from "@/lib/brand-video/data";

type Params = { params: Promise<{ videoId: string }> };

/**
 * GET: the exported MP4, for storage that cannot sign links (local
 * development). With R2 the page links straight to a signed URL instead,
 * because videos are larger than a serverless response allows.
 */
export async function GET(request: Request, { params }: Params) {
  const gate = await videoContext({ mutate: false, bucket: "file", limit: 30 });
  if (!gate.ok) return gate.response;
  const { videoId } = await params;
  const video = await findVideo(videoId, gate.ctx.workspace.id);
  if (!video?.videoKey) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const storage = getDefaultStorage();
  if (storage.signedGetUrl) {
    return NextResponse.redirect(await storage.signedGetUrl(video.videoKey, { expiresSeconds: 600, contentType: "video/mp4" }));
  }
  const data = await storage.get(video.videoKey);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": "video/mp4",
      "cache-control": "private, max-age=600",
      ...(download ? { "content-disposition": 'attachment; filename="brand-video.mp4"' } : {}),
    },
  });
}
