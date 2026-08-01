import { NextResponse } from "next/server";
import { getDefaultStorage } from "@mykavo/scanner/storage";

/**
 * Brand logo serving from object storage (mirrors /api/avatars). Logos render
 * on PUBLIC client reports, so this route is unauthenticated by design; names
 * are 128-bit random hex issued by the branding route, so URLs are
 * unguessable and no traversal or arbitrary reads are possible. A replaced
 * logo gets a NEW name, which makes the immutable cache header safe.
 */

const NAME_PATTERN = /^[a-f0-9]{32}\.(jpg|png)$/;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
};

type Params = { params: Promise<{ name: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { name } = await params;
  if (!NAME_PATTERN.test(name)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = await getDefaultStorage().get(`brand-logos/${name}`);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const extension = name.slice(name.lastIndexOf(".") + 1);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": MIME_BY_EXTENSION[extension],
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
