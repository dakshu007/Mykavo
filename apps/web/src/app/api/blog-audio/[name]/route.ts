import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getDefaultStorage } from "@mykavo/scanner/storage";
import { livePostWhere } from "@/lib/blog-schedule";

/**
 * Public narration audio for blog posts ("Listen to this article").
 *
 * The MP3s are far larger than a serverless response may be, so on R2 this
 * route only checks that the file belongs to a live post and redirects the
 * player to a short-lived signed storage URL; the browser then streams and
 * seeks against storage directly. The bucket itself stays private.
 *
 * Names are validated against the worker's key format, so nothing outside
 * blog-audio/ can be reached, and only files recorded for a live post are.
 */

const NAME_PATTERN = /^[a-z0-9-]{1,120}\.mp3$/;
// Signed URLs outlive the cached redirect by hours, so a listener who
// pauses for a while can still seek or resume.
const SIGNED_URL_SECONDS = 6 * 60 * 60;
const REDIRECT_CACHE_SECONDS = 30 * 60;

type Params = { params: Promise<{ name: string }> };

export async function GET(request: Request, { params }: Params) {
  const { name } = await params;
  if (!NAME_PATTERN.test(name)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const key = `blog-audio/${name}`;
  const audio = await prisma.blogAudio.findFirst({
    where: { storageKey: key, status: "ready", post: livePostWhere() },
    select: { byteSize: true },
  });
  if (!audio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const storage = getDefaultStorage();
  if (storage.signedUrl) {
    const url = await storage.signedUrl(key, SIGNED_URL_SECONDS);
    return new NextResponse(null, {
      status: 302,
      headers: {
        location: url,
        "cache-control": `public, max-age=${REDIRECT_CACHE_SECONDS}, s-maxage=${REDIRECT_CACHE_SECONDS}`,
      },
    });
  }

  // Local development: serve the bytes, honouring Range so seeking works.
  const data = await storage.get(key);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const size = data.length;
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  const headers = {
    "content-type": "audio/mpeg",
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=3600",
  };
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new NextResponse(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    return new NextResponse(new Uint8Array(data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) },
    });
  }
  return new NextResponse(new Uint8Array(data), { headers: { ...headers, "content-length": String(size) } });
}
