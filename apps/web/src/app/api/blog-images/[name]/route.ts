import { NextResponse } from "next/server";
import { getDefaultStorage } from "@mykavo/scanner/storage";

/**
 * Public blog image serving (no auth — images are embedded in public blog
 * posts). Names are strictly validated against the upload route's format, so
 * no path traversal or arbitrary artifact reads are possible.
 */

const NAME_PATTERN = /^[a-z0-9]+\.(jpe?g|png|webp|gif)$/;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

type Params = { params: Promise<{ name: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { name } = await params;
  if (!NAME_PATTERN.test(name)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = await getDefaultStorage().get(`blog-images/${name}`);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const extension = name.slice(name.lastIndexOf(".") + 1);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": MIME_BY_EXTENSION[extension],
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
